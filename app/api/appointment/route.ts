// app/api/appointments/route.ts

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
);

export interface AppointmentPayload {
    session_id: string;
    patient_name: string;
    phone?: string;
    date_of_birth?: string;
    date_of_injury?: string;
    legal_firm?: string;
    attorney_name?: string;
    attorney_phone?: string;
    attorney_email?: string;
    provider_id?: number; // ← приходит с фронта из карточки
    provider_name?: string;
    provider_specialty?: string;
    provider_address?: string;
    doctor_name?: string; // ← используется только для резолвинга, не пишется в БД
    visit_format?: string;
    service_type?: string;
    availability?: string;
    additional_notes?: string;
    documents?: Array<{
        document_type: string;
        file_url: string;
        file_name: string;
    }>;
}

function toIsoDate(value?: string): string | null {
    if (!value?.trim()) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return value.trim();
    const mdy = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mdy) {
        const [, m, d, y] = mdy;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    const dmy = value.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (dmy) {
        const [, d, m, y] = dmy;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    const native = new Date(value);
    if (!isNaN(native.getTime())) return native.toISOString().slice(0, 10);
    return null;
}

function cleanProviderName(raw?: string): string {
    if (!raw) return '';
    return raw
        .replace(/\*\*/g, '')
        .replace(/[,;]+$/, '')
        .replace(/\s+/g, ' ')
        .trim();
}

async function resolveProviderId(
    providerName?: string,
    providerAddress?: string,
    doctorName?: string,
): Promise<number | null> {
    const cleanName = cleanProviderName(providerName);
    if (!cleanName) return null;

    const cleanAddress = providerAddress?.replace(/\*\*/g, '').trim() ?? '';
    const cleanDoctor = doctorName?.replace(/\*\*/g, '').trim() ?? '';

    if (cleanAddress && cleanDoctor) {
        const { data, error } = await supabase
            .from('medical_providers')
            .select('id')
            .ilike('provider_name', cleanName)
            .ilike('address', `%${cleanAddress}%`)
            .ilike('doctor_name', `%${cleanDoctor}%`)
            .limit(1)
            .maybeSingle();
        if (!error && data) {
            console.log(`✅ resolved name+address+doctor: id=${data.id}`);
            return data.id;
        }
    }
    if (cleanDoctor) {
        const { data, error } = await supabase
            .from('medical_providers')
            .select('id')
            .ilike('provider_name', cleanName)
            .ilike('doctor_name', `%${cleanDoctor}%`)
            .limit(1)
            .maybeSingle();
        if (!error && data) {
            console.log(`✅ resolved name+doctor: id=${data.id}`);
            return data.id;
        }
    }
    if (cleanAddress) {
        const { data, error } = await supabase
            .from('medical_providers')
            .select('id')
            .ilike('provider_name', cleanName)
            .ilike('address', `%${cleanAddress}%`)
            .limit(1)
            .maybeSingle();
        if (!error && data) {
            console.log(`✅ resolved name+address: id=${data.id}`);
            return data.id;
        }
    }

    const { data: all } = await supabase
        .from('medical_providers')
        .select('id, address, city, doctor_name')
        .ilike('provider_name', cleanName);
    if (all?.length === 1) {
        console.log(`✅ resolved name-only: id=${all[0].id}`);
        return all[0].id;
    }
    if (all && all.length > 1) {
        console.warn(`⚠️ AMBIGUOUS ${all.length} matches for "${cleanName}"`);
        return all[0].id;
    }

    const { data: partial } = await supabase
        .from('medical_providers')
        .select('id, address, doctor_name')
        .ilike('provider_name', `%${cleanName}%`)
        .limit(5);
    if (partial?.length === 1) return partial[0].id;
    if (partial && partial.length > 1 && cleanDoctor) {
        const byDoc = partial.find(p =>
            p.doctor_name?.toLowerCase().includes(cleanDoctor.toLowerCase()),
        );
        if (byDoc) return byDoc.id;
    }
    if (partial && partial.length > 1 && cleanAddress) {
        const street = cleanAddress.split(',')[0].toLowerCase();
        const byAddr = partial.find(p => p.address?.toLowerCase().includes(street));
        if (byAddr) return byAddr.id;
    }

    console.warn(`❌ provider_id NOT FOUND: "${cleanName}"`);
    return null;
}

async function uploadFileToStorage(
    fileBuffer: ArrayBuffer,
    fileName: string,
    sessionId: string,
    mimeType: string,
): Promise<string | null> {
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `documents/${sessionId}/${Date.now()}_${safeName}`;
    const { error } = await supabase.storage
        .from('documents')
        .upload(storagePath, fileBuffer, { contentType: mimeType, upsert: false });
    if (error) {
        console.error('[appointments] Storage upload error:', error.message);
        return null;
    }
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(storagePath);
    return urlData?.publicUrl ?? null;
}

export async function POST(req: Request) {
    try {
        const contentType = req.headers.get('content-type') ?? '';
        let payload: AppointmentPayload;
        let attachedFile: File | null = null;

        if (contentType.includes('multipart/form-data')) {
            const form = await req.formData();
            payload = JSON.parse((form.get('payload') as string) ?? '{}');
            attachedFile = form.get('file') as File | null;
        } else {
            payload = await req.json();
        }

        const { session_id, documents, ...rest } = payload;

        if (!session_id) return Response.json({ error: 'session_id is required' }, { status: 400 });
        if (!rest.patient_name?.trim())
            return Response.json({ error: 'patient_name is required' }, { status: 400 });

        const c = (v?: string | null) => v?.replace(/\*\*/g, '').trim() || null;

        // ── provider_id: с фронта если есть → иначе резолвинг ────────────────
        const provider_id: number | null = rest.provider_id
            ? Number(rest.provider_id) // ← Number() на случай если пришёл как строка
            : await resolveProviderId(rest.provider_name, rest.provider_address, rest.doctor_name);

        console.log(
            `[appointments] provider_id = ${provider_id} (from_client=${!!rest.provider_id})`,
        );

        // ── Insert appointment ────────────────────────────────────────────────
        const { data: appt, error: apptError } = await supabase
            .from('appointments')
            .insert({
                session_id,
                patient_name: c(rest.patient_name) ?? rest.patient_name.trim(),
                phone: c(rest.phone),
                date_of_birth: toIsoDate(rest.date_of_birth),
                date_of_injury: toIsoDate(rest.date_of_injury),
                legal_firm: c(rest.legal_firm),
                attorney_name: c(rest.attorney_name),
                attorney_phone: c(rest.attorney_phone),
                attorney_email: c(rest.attorney_email),
                provider_id, // ← теперь всегда есть значение
                provider_name: c(rest.provider_name),
                provider_specialty: c(rest.provider_specialty),
                provider_address: c(rest.provider_address),
                // doctor_name — НЕТ колонки в appointments, не пишем
                visit_format: c(rest.visit_format),
                service_type: c(rest.service_type),
                availability: c(rest.availability),
                additional_notes: c(rest.additional_notes),
                status: 'pending',
            })
            .select('id')
            .single();

        if (apptError) {
            console.error('[appointments] insert error:', apptError);
            return Response.json(
                { error: 'Failed to save appointment', detail: apptError.message },
                { status: 500 },
            );
        }

        // ── Documents ─────────────────────────────────────────────────────────
        const docsToInsert: Array<{
            session_id: string;
            document_type: string;
            file_url: string;
            file_name: string;
        }> = [];

        if (attachedFile && attachedFile.size > 0) {
            console.log(
                `[appointments] uploading file: ${attachedFile.name}, size=${attachedFile.size}, type=${attachedFile.type}`,
            );
            try {
                const buffer = await attachedFile.arrayBuffer();
                const mimeType = attachedFile.type || 'application/octet-stream'; // fallback если type пустой
                const url = await uploadFileToStorage(
                    buffer,
                    attachedFile.name,
                    session_id,
                    mimeType,
                );
                if (url) {
                    docsToInsert.push({
                        session_id,
                        document_type: 'prescription',
                        file_url: url,
                        file_name: attachedFile.name,
                    });
                    console.log(`[appointments] ✅ file uploaded: ${url}`);
                } else {
                    console.error('[appointments] ❌ uploadFileToStorage returned null');
                }
            } catch (fileErr: any) {
                console.error('[appointments] ❌ file upload exception:', fileErr?.message);
            }
        } else {
            console.log(`[appointments] no file attached (size=${attachedFile?.size ?? 'null'})`);
        }

        for (const doc of documents ?? []) {
            if (doc.file_url?.trim()) docsToInsert.push({ session_id, ...doc });
        }

        if (docsToInsert.length > 0) {
            const { error: docsError } = await supabase
                .from('document_uploads')
                .insert(docsToInsert);
            if (docsError) console.error('[document_uploads] insert error:', docsError);
        }

        return Response.json({ ok: true, appointment_id: appt.id, provider_id }, { status: 201 });
    } catch (err: any) {
        console.error('[appointments] unexpected error:', err);
        return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
}
