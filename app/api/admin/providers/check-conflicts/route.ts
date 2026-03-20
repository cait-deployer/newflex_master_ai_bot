import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import type { ImportRow } from '../import/route';

// ─── Public types (imported by dialog) ────────────────────────────────────────

export interface ExistingProvider {
    id: number;
    provider_name: string;
    address: string;
    zip_code?: string | null;
    doctor_name?: string | null;
    intake_email?: string | null;
    intake_phone?: string | null;
    modality?: string[] | null;
    specialty?: string | null;
    city?: string | null;
    state?: string | null;
}

/** How confident we are that two records refer to the same entity */
export type ConflictType =
    | 'exact' // name+address+zip+doctor all match  → definitely same record
    | 'same_clinic' // name+address+zip match, doctor differs → new doctor at same location
    | 'fuzzy'; // name matches, address ~similar → probably same, needs human eye

export interface ConflictItem {
    rowIndex: number; // 0-based index in the incoming rows array
    incoming: ImportRow;
    existing: ExistingProvider;
    type: ConflictType;
    score: number; // 0-100 address similarity
}

export interface CheckConflictsResponse {
    conflicts: ConflictItem[];
    cleanIndices: number[]; // rowIndex values that have NO conflict → safe to insert
    total: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function norm(s?: string | null) {
    return (s ?? '').toLowerCase().replace(/[\s\-.,\\/]+/g, '');
}

/** Trigram Jaccard similarity, 0–100 */
function similarity(a: string, b: string): number {
    const na = norm(a),
        nb = norm(b);
    if (!na || !nb) return 0;
    if (na === nb) return 100;
    const tri = (s: string) => {
        const t = new Set<string>();
        for (let i = 0; i <= s.length - 3; i++) t.add(s.slice(i, i + 3));
        return t;
    };
    const ta = tri(na),
        tb = tri(nb);
    const inter = [...ta].filter(x => tb.has(x)).length;
    const union = new Set([...ta, ...tb]).size;
    return union === 0 ? 0 : Math.round((inter / union) * 100);
}

// ─── POST /api/admin/providers/check-conflicts ────────────────────────────────

export async function POST(req: NextRequest) {
    try {
        const supabase = getSupabaseServerClient();
        const { rows }: { rows: ImportRow[] } = await req.json();

        if (!Array.isArray(rows) || rows.length === 0) {
            return NextResponse.json({ error: 'No rows provided' }, { status: 400 });
        }

        // Pull only providers whose names appear in the incoming file
        const names = [...new Set(rows.map(r => r.provider_name.trim()))];
        const { data: existing, error } = await supabase
            .from('medical_providers')
            .select(
                'id, provider_name, address, zip_code, doctor_name, intake_email, intake_phone, modality, specialty, city, state',
            )
            .in('provider_name', names);

        if (error) {
            console.error('[check-conflicts]', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const conflicts: ConflictItem[] = [];
        const cleanIndices: number[] = [];

        rows.forEach((row, rowIndex) => {
            // Candidates = DB rows with the same provider_name (normalised)
            const candidates = (existing ?? []).filter(
                e => norm(e.provider_name) === norm(row.provider_name),
            );

            if (candidates.length === 0) {
                cleanIndices.push(rowIndex);
                return;
            }

            let bestMatch: ExistingProvider | null = null;
            let bestType: ConflictType = 'fuzzy';
            let bestScore = 0;

            for (const e of candidates) {
                const addrScore = similarity(e.address, row.address);
                const zipOk =
                    !e.zip_code || !row.zip_code || norm(e.zip_code) === norm(row.zip_code);
                const sameDoctor = norm(e.doctor_name ?? '') === norm(row.doctor_name ?? '');

                if (addrScore >= 85 && zipOk) {
                    if (sameDoctor) {
                        // Perfect duplicate — stop looking
                        bestMatch = e;
                        bestType = 'exact';
                        bestScore = 100;
                        break;
                    }
                    // Same clinic, different doctor
                    if (bestScore < 90) {
                        bestMatch = e;
                        bestType = 'same_clinic';
                        bestScore = 90;
                    }
                } else if (addrScore >= 55 && addrScore > bestScore) {
                    bestMatch = e;
                    bestType = 'fuzzy';
                    bestScore = addrScore;
                }
            }

            if (bestMatch) {
                conflicts.push({
                    rowIndex,
                    incoming: row,
                    existing: bestMatch,
                    type: bestType,
                    score: bestScore,
                });
            } else {
                cleanIndices.push(rowIndex);
            }
        });

        return NextResponse.json<CheckConflictsResponse>({
            conflicts,
            cleanIndices,
            total: rows.length,
        });
    } catch (err: any) {
        console.error('[check-conflicts] unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

