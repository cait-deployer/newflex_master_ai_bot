import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export interface ImportRow {
    provider_name: string;
    doctor_name?: string;
    specialty?: string;
    address: string;
    address_line_2?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    intake_phone?: string;
    intake_email?: string;
    records_email?: string;
    billing_email?: string;
    negotiations_email?: string;
    website_url?: string;
    logo_url?: string;
    latitude?: number;
    longitude?: number;
    modality?: string[];
    machine_description?: string[];
    languages?: string[];
    hours_of_operation?: string;
    workers_comp?: boolean;
    pi?: boolean;
    telemed?: boolean;
    in_person?: boolean;
}

/**
 * duplicate_strategy:
 *   "upsert" — update existing rows matched by (provider_name, address), insert new ones  ← default / recommended
 *   "skip"   — insert only new rows, silently ignore rows that already exist
 *   "insert" — always insert, allow duplicates (original behaviour)
 */
export type DuplicateStrategy = 'upsert' | 'skip' | 'insert';

export interface ImportResult {
    inserted: number;
    updated: number;
    skipped: number;
    errors: { row: number; message: string }[];
}


// ─── Google Geocoding ──────────────────────────────────────────────────────────
// Resolves lat/lng for a single address string using Google Maps Geocoding API.
// Returns null if the address can't be resolved or the API key is missing.
async function geocodeAddress(
    address: string,
    city?: string,
    state?: string,
    zip?: string,
): Promise<{ latitude: number; longitude: number } | null> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        console.warn('[geocode] No GOOGLE_MAPS_API_KEY found — skipping geocoding');
        return null;
    }

    const parts = [address, city, state, zip].filter(Boolean).join(', ');
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(parts)}&key=${apiKey}`;

    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) {
            console.warn(`[geocode] HTTP ${res.status} for: ${parts}`);
            return null;
        }
        const data = await res.json() as {
            status: string;
            error_message?: string;
            results: { geometry: { location: { lat: number; lng: number } } }[];
        };
        if (data.status !== 'OK') {
            console.warn(`[geocode] status=${data.status} error=${data.error_message ?? ''} for: ${parts}`);
            return null;
        }
        const { lat, lng } = data.results[0].geometry.location;
        return { latitude: lat, longitude: lng };
    } catch (err) {
        console.warn(`[geocode] fetch error for "${parts}":`, err);
        return null;
    }
}

// Batch geocode rows that are missing coordinates.
// Runs requests concurrently with a concurrency limit to avoid rate limits.
async function batchGeocode(rows: ImportRow[], concurrency = 5): Promise<ImportRow[]> {
    const results: ImportRow[] = [...rows];
    // collect indices that need geocoding
    const toGeocode = rows
        .map((r, i) => ({ r, i }))
        .filter(({ r }) => !r.latitude || !r.longitude);

    if (toGeocode.length === 0) return results;

    // Process in chunks of `concurrency`
    for (let c = 0; c < toGeocode.length; c += concurrency) {
        const batch = toGeocode.slice(c, c + concurrency);
        await Promise.all(batch.map(async ({ r, i }) => {
            const coords = await geocodeAddress(r.address, r.city, r.state, r.zip_code);
            if (coords) {
                results[i] = { ...results[i], ...coords };
            }
        }));
    }
    return results;
}

// POST /api/admin/providers/import
// Body: { rows: ImportRow[]; strategy?: DuplicateStrategy }
export async function POST(request: NextRequest) {
    try {
        const supabase = getSupabaseServerClient();
        const body = await request.json() as { rows: ImportRow[]; strategy?: DuplicateStrategy };
        const { rows } = body;
        const strategy: DuplicateStrategy = body.strategy ?? 'upsert';

        if (!Array.isArray(rows) || rows.length === 0) {
            return NextResponse.json({ error: 'No rows provided' }, { status: 400 });
        }

        // ── Validate ───────────────────────────────────────────────────────
        const valid: ImportRow[] = [];
        const errors: ImportResult['errors'] = [];

        rows.forEach((row, idx) => {
            const rowNum = idx + 2;
            if (!row.provider_name?.trim()) {
                errors.push({ row: rowNum, message: 'provider_name is required' });
                return;
            }
            if (!row.address?.trim()) {
                errors.push({ row: rowNum, message: 'address is required' });
                return;
            }
            const telemed   = !!row.telemed;
            const in_person = row.in_person !== false;
            if (!telemed && !in_person) {
                errors.push({ row: rowNum, message: 'At least one of telemed or in_person must be true' });
                return;
            }
            valid.push({ ...row, telemed, in_person });
        });

        if (valid.length === 0) {
            return NextResponse.json<ImportResult>({ inserted: 0, updated: 0, skipped: 0, errors }, { status: 422 });
        }

        // ── Geocode rows missing coordinates ──────────────────────────────
        const geocoded = await batchGeocode(valid);

        // ── Execute by strategy ────────────────────────────────────────────
        const CHUNK = 500;
        let inserted = 0;
        let updated  = 0;
        let skipped  = 0;

        if (strategy === 'insert') {
            // ── Plain insert — allow duplicates ──────────────────────────
            for (let i = 0; i < geocoded.length; i += CHUNK) {
                const chunk = geocoded.slice(i, i + CHUNK);
                const { error } = await supabase.from('medical_providers').insert(chunk);
                if (error) {
                    return NextResponse.json({ error: error.message, inserted, updated, skipped, errors }, { status: 500 });
                }
                inserted += chunk.length;
            }

        } else if (strategy === 'skip') {
            // ── Insert only new rows — skip conflicts ─────────────────────
            // Requires UNIQUE constraint on (provider_name, address) in DB.
            // ignoreDuplicates:true maps to ON CONFLICT DO NOTHING.
            for (let i = 0; i < geocoded.length; i += CHUNK) {
                const chunk = geocoded.slice(i, i + CHUNK);
                const { data, error } = await supabase
                    .from('medical_providers')
                    .insert(chunk)
                    .select('id');
                if (error) {
                    // If no unique constraint, fallback: fetch existing names and filter
                    if (error.code === '42P10' || error.message.includes('no unique')) {
                        // Constraint not set up yet — warn in response
                        return NextResponse.json(
                            { error: 'UNIQUE constraint on (provider_name, address, zip_code) is required. Run the migration SQL first.', inserted, updated, skipped, errors },
                            { status: 400 }
                        );
                    }
                    return NextResponse.json({ error: error.message, inserted, updated, skipped, errors }, { status: 500 });
                }
                inserted += data?.length ?? chunk.length;
            }

        } else {
            // ── Upsert — insert new, update existing ─────────────────────
            // Requires UNIQUE constraint on (provider_name, address).
            // Supabase upsert with onConflict updates all other columns.
            for (let i = 0; i < geocoded.length; i += CHUNK) {
                const chunk = geocoded.slice(i, i + CHUNK);

                // First: count how many already exist (to report inserted vs updated)
                const names = chunk.map((r) => r.provider_name);
                const { data: existing } = await supabase
                    .from('medical_providers')
                    .select('provider_name, address, zip_code')
                    .in('provider_name', names);

                const existingSet = new Set(
                    (existing ?? []).map((r) => `${r.provider_name}||${r.address}||${r.zip_code ?? ''}`)
                );
                const newCount = chunk.filter(
                    (r) => !existingSet.has(`${r.provider_name}||${r.address}||${r.zip_code ?? ''}`)
                ).length;
                const updateCount = chunk.length - newCount;

                const { error } = await supabase
                    .from('medical_providers')
                    .upsert(chunk, {
                        onConflict: 'provider_name,address,zip_code',
                        ignoreDuplicates: false, // update on conflict
                    });

                if (error) {
                    if (error.code === '42P10' || error.message.includes('no unique')) {
                        return NextResponse.json(
                            { error: 'UNIQUE constraint on (provider_name, address, zip_code) is required. Run the migration SQL first.', inserted, updated, skipped, errors },
                            { status: 400 }
                        );
                    }
                    return NextResponse.json({ error: error.message, inserted, updated, skipped, errors }, { status: 500 });
                }

                inserted += newCount;
                updated  += updateCount;
            }
        }

        const geocoded_count = geocoded.filter((r, i) =>
            (!valid[i].latitude || !valid[i].longitude) && (r.latitude && r.longitude)
        ).length;
        console.log(`[import] inserted=${inserted} updated=${updated} geocoded=${geocoded_count}`);
        return NextResponse.json({ inserted, updated, skipped, errors, geocoded_count }, { status: 200 });
    } catch (err: any) {
        console.error('[providers/import] error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
