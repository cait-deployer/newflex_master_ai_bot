// app/api/admin/appointments/route.ts

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
);

const APPOINTMENT_SELECT = `
  id,
  session_id,
  status,
  patient_name,
  phone,
  date_of_birth,
  date_of_injury,
  legal_firm,
  attorney_name,
  attorney_phone,
  attorney_email,
  provider_id,
  provider_name,
  provider_specialty,
  provider_address,
  visit_format,
  service_type,
  availability,
  additional_notes,
  created_at,
  updated_at,
  medical_providers (
    id,
    provider_name,
    doctor_name,
    specialty,
    address,
    address_line_2,
    city,
    state,
    zip_code,
    intake_phone,
    intake_email,
    records_email,
    billing_email,
    negotiations_email,
    website_url,
    logo_url,
    telemed,
    in_person,
    pi,
    workers_comp,
    languages,
    modality,
    machine_description,
    hours_of_operation,
    latitude,
    longitude
  )
`.trim();

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);

    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '20'));
    const search = searchParams.get('search')?.trim() ?? '';
    const status = searchParams.get('status')?.trim() ?? '';
    const serviceType = searchParams.get('service_type')?.trim() ?? '';

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
        .from('appointments')
        .select(APPOINTMENT_SELECT, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

    if (status) query = query.eq('status', status);
    if (serviceType) query = query.eq('service_type', serviceType);
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

    // ── Подгружаем документы отдельно по session_id ───────────────────────────
    // FK нет, поэтому джойним вручную
    const sessionIds = [...new Set(data.map((a: any) => a.session_id).filter(Boolean))];

    const { data: docs, error: docsError } = await supabase
        .from('document_uploads')
        .select('session_id, id, document_type, file_url, file_name, uploaded_at')
        .in('session_id', sessionIds);

    if (docsError) {
        console.error('[admin/appointments] docs fetch error:', docsError);
    }

    // Группируем документы по session_id
    const docsBySession: Record<string, any[]> = {};
    for (const doc of docs ?? []) {
        if (!docsBySession[doc.session_id]) docsBySession[doc.session_id] = [];
        docsBySession[doc.session_id].push(doc);
    }

    // Мёржим документы в каждый appointment
    const enriched = data.map((a: any) => ({
        ...a,
        document_uploads: docsBySession[a.session_id] ?? [],
    }));

    return Response.json({ appointments: enriched, total: count ?? 0 });
}
