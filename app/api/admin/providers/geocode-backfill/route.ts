// app/api/admin/providers/geocode-backfill/route.ts
// One-time (or repeatable) endpoint to fill NULL latitude/longitude
// for existing providers in the database.
//
// POST /api/admin/providers/geocode-backfill
// Body: { limit?: number }   (default: 50 rows per call)
// Returns: { processed: number; updated: number; failed: number; remaining: number }

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

async function geocodeAddress(
    address: string,
    city?: string | null,
    state?: string | null,
    zip?: string | null,
): Promise<{ latitude: number; longitude: number } | null> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        console.warn('[geocode-backfill] No GOOGLE_MAPS_API_KEY');
        return null;
    }

    const parts = [address, city, state, zip].filter(Boolean).join(', ');
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(parts)}&key=${apiKey}`;

    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return null;
        const data = await res.json() as {
            status: string;
            error_message?: string;
            results: { geometry: { location: { lat: number; lng: number } } }[];
        };
        if (data.status !== 'OK' || !data.results[0]) {
            console.warn(`[geocode-backfill] ${data.status} ${data.error_message ?? ''} — "${parts}"`);
            return null;
        }
        const { lat, lng } = data.results[0].geometry.location;
        return { latitude: lat, longitude: lng };
    } catch (err) {
        console.warn(`[geocode-backfill] fetch error for "${parts}":`, err);
        return null;
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = getSupabaseServerClient();
        const body = await request.json().catch(() => ({})) as { limit?: number };
        const limit = Math.min(body.limit ?? 50, 200); // max 200 per call

        // 1. Count total remaining
        const { count: remaining } = await supabase
            .from('medical_providers')
            .select('*', { count: 'exact', head: true })
            .or('latitude.is.null,longitude.is.null');

        // 2. Fetch batch of rows with NULL coords
        const { data: rows, error: fetchError } = await supabase
            .from('medical_providers')
            .select('id, address, city, state, zip_code')
            .or('latitude.is.null,longitude.is.null')
            .limit(limit);

        if (fetchError) {
            return NextResponse.json({ error: fetchError.message }, { status: 500 });
        }
        if (!rows || rows.length === 0) {
            return NextResponse.json({ processed: 0, updated: 0, failed: 0, remaining: 0 });
        }

        // 3. Geocode concurrently (5 at a time)
        const CONCURRENCY = 5;
        let updated = 0;
        let failed = 0;

        for (let i = 0; i < rows.length; i += CONCURRENCY) {
            const batch = rows.slice(i, i + CONCURRENCY);
            await Promise.all(batch.map(async (row) => {
                const coords = await geocodeAddress(row.address, row.city, row.state, row.zip_code);
                if (!coords) { failed++; return; }

                const { error: updateError } = await supabase
                    .from('medical_providers')
                    .update({ latitude: coords.latitude, longitude: coords.longitude })
                    .eq('id', row.id);

                if (updateError) {
                    console.error(`[geocode-backfill] update error id=${row.id}:`, updateError.message);
                    failed++;
                } else {
                    updated++;
                }
            }));
        }

        return NextResponse.json({
            processed: rows.length,
            updated,
            failed,
            remaining: Math.max(0, (remaining ?? 0) - updated),
        });
    } catch (err: any) {
        console.error('[geocode-backfill] error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
