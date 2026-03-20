// app/api/admin/appointments/route.ts

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
);

const APPOINTMENT_SELECT = `
  id, session_id, status,
  patient_name, phone, date_of_birth, date_of_injury,
  legal_firm, attorney_name, attorney_phone, attorney_email,
  provider_id, provider_name, provider_specialty, provider_address,
  visit_format, service_type, availability, additional_notes,
  created_at, updated_at,
  medical_providers (
    id, provider_name, doctor_name, specialty,
    address, address_line_2, city, state, zip_code,
    intake_phone, intake_email, records_email,
    billing_email, negotiations_email, website_url, logo_url,
    telemed, in_person, pi, workers_comp,
    languages, modality, machine_description,
    hours_of_operation, latitude, longitude
  )
`.trim();

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(1000, parseInt(searchParams.get('limit') ?? '25'));
    const search = searchParams.get('search')?.trim() ?? '';
    const status = searchParams.get('status')?.trim() ?? '';
    const serviceType = searchParams.get('service_type')?.trim() ?? '';
    const visitFormat = searchParams.get('visit_format')?.trim() ?? ''; // 'telemed' | 'in_person' | ''

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from('appointments')
        .select(APPOINTMENT_SELECT, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

    if (status) query = query.eq('status', status);
    if (serviceType) query = query.eq('service_type', serviceType);

    // visit_format — значения в БД могут быть разными:
    // "In-person", "in_person", "Telemed / In-person", "telemed" и т.д.
    // Поэтому НЕ фильтруем на уровне SQL — делаем это после резолва провайдера

    if (search) {
        query = query.or(
            `patient_name.ilike.%${search}%,` +
                `attorney_name.ilike.%${search}%,` +
                `legal_firm.ilike.%${search}%,` +
                `provider_name.ilike.%${search}%`,
        );
    }

    const { data, error, count } = await query;

    if (error) {
        console.error('[admin/appointments] GET error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
        return Response.json({ appointments: [], total: count ?? 0 });
    }

    // ── Подгружаем документы по session_id ───────────────────────────────────
    const sessionIds = [...new Set(data.map((a: any) => a.session_id).filter(Boolean))];
    const { data: docs } = await supabase
        .from('document_uploads')
        .select('session_id, id, document_type, file_url, file_name, uploaded_at')
        .in('session_id', sessionIds);

    const docsBySession: Record<string, any[]> = {};
    for (const doc of docs ?? []) {
        if (!docsBySession[doc.session_id]) docsBySession[doc.session_id] = [];
        docsBySession[doc.session_id].push(doc);
    }

    // ── Резолвим medical_providers где provider_id = null ─────────────────────
    const missingProviderNames = [
        ...new Set(
            data
                .filter((a: any) => !a.medical_providers && a.provider_name)
                .map((a: any) => a.provider_name as string),
        ),
    ];

    const providersByName: Record<string, any> = {};
    if (missingProviderNames.length > 0) {
        const { data: providers } = await supabase
            .from('medical_providers')
            .select(
                `
                id, provider_name, doctor_name, specialty,
                address, address_line_2, city, state, zip_code,
                intake_phone, intake_email, records_email,
                billing_email, negotiations_email, website_url, logo_url,
                telemed, in_person, pi, workers_comp,
                languages, modality, machine_description,
                hours_of_operation, latitude, longitude
            `,
            )
            .in('provider_name', missingProviderNames);

        for (const p of providers ?? []) {
            if (!providersByName[p.provider_name]) providersByName[p.provider_name] = p;
        }
    }

    // ── Мёржим всё + фильтруем по visit_format через провайдера ──────────────
    let enriched = data.map((a: any) => ({
        ...a,
        medical_providers: a.medical_providers ?? providersByName[a.provider_name] ?? null,
        document_uploads: docsBySession[a.session_id] ?? [],
    }));

    // ── Фильтр visit_format — нормализуем все возможные значения из БД ──────────
    // В БД может быть: "In-person", "in_person", "Telemed", "telemed",
    // "Telemed / In-person", "Telemed/In-Person" и т.д.
    if (visitFormat) {
        const isTelemed = (v: string | null) => !!v && /telemed/i.test(v);
        const isInPerson = (v: string | null) => !!v && /in.?person/i.test(v);

        enriched = enriched.filter((a: any) => {
            const vf = a.visit_format as string | null;
            const mp = a.medical_providers;

            if (visitFormat === 'telemed') {
                // visit_format содержит "telemed" ИЛИ провайдер telemed=true
                return isTelemed(vf) || (!vf && mp?.telemed === true);
            } else {
                // in_person: visit_format содержит "in-person" ИЛИ провайдер in_person=true
                return isInPerson(vf) || (!vf && mp?.in_person === true);
            }
        });
    }

    return Response.json({ appointments: enriched, total: enriched.length });
}
