import { type NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase-server'

export interface ImportRow {
  provider_name: string
  doctor_name?: string
  specialty?: string
  address: string
  address_line_2?: string
  city?: string
  state?: string
  zip_code?: string
  intake_phone?: string
  intake_email?: string
  records_email?: string
  billing_email?: string
  negotiations_email?: string
  website_url?: string
  logo_url?: string
  latitude?: number
  longitude?: number
  modality?: string[]
  machine_description?: string[]
  languages?: string[]
  hours_of_operation?: string
  workers_comp?: boolean
  pi?: boolean
  telemed?: boolean
  in_person?: boolean
}

/** A row to be merged into an existing record (has the target DB id) */
export interface MergeRow extends ImportRow {
  _existingId: number
}

/**
 * strategy is only used when mergeRows/cleanRows split is NOT provided
 * (i.e. legacy / bulk import without conflict resolution).
 *
 * When the conflict-resolution flow is used, the front-end sends:
 *   insertRows  — rows confirmed as new
 *   mergeRows   — rows whose fields should overwrite an existing record
 */
export type DuplicateStrategy = 'upsert' | 'skip' | 'insert'

export interface ImportResult {
  inserted: number
  updated: number
  skipped: number
  errors: { row: number; message: string }[]
  geocoded_count?: number
}

// ─── Google Geocoding ──────────────────────────────────────────────────────────

async function geocodeAddress(
  address: string,
  city?: string,
  state?: string,
  zip?: string,
): Promise<{ latitude: number; longitude: number } | null> {
  const apiKey =
    process.env.GOOGLE_MAPS_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    console.warn('[geocode] No GOOGLE_MAPS_API_KEY — skipping')
    return null
  }
  const parts = [address, city, state, zip].filter(Boolean).join(', ')
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(parts)}&key=${apiKey}`
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) })
    if (!res.ok) return null
    const data = await res.json() as {
      status: string
      results: { geometry: { location: { lat: number; lng: number } } }[]
    }
    if (data.status !== 'OK') return null
    const { lat, lng } = data.results[0].geometry.location
    return { latitude: lat, longitude: lng }
  } catch {
    return null
  }
}

async function batchGeocode(rows: ImportRow[], concurrency = 5): Promise<ImportRow[]> {
  const results = [...rows]
  const toGeocode = rows
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => !r.latitude || !r.longitude)
  for (let c = 0; c < toGeocode.length; c += concurrency) {
    await Promise.all(
      toGeocode.slice(c, c + concurrency).map(async ({ r, i }) => {
        const coords = await geocodeAddress(r.address, r.city, r.state, r.zip_code)
        if (coords) results[i] = { ...results[i], ...coords }
      }),
    )
  }
  return results
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(rows: ImportRow[]): { valid: ImportRow[]; errors: ImportResult['errors'] } {
  const valid: ImportRow[] = []
  const errors: ImportResult['errors'] = []
  rows.forEach((row, idx) => {
    const rowNum = idx + 2
    if (!row.provider_name?.trim()) {
      errors.push({ row: rowNum, message: 'provider_name is required' })
      return
    }
    if (!row.address?.trim()) {
      errors.push({ row: rowNum, message: 'address is required' })
      return
    }
    const telemed = !!row.telemed
    const in_person = row.in_person !== false
    if (!telemed && !in_person) {
      errors.push({ row: rowNum, message: 'At least one of telemed or in_person must be true' })
      return
    }
    valid.push({ ...row, telemed, in_person })
  })
  return { valid, errors }
}

// ─── POST /api/admin/providers/import ─────────────────────────────────────────
//
// Accepts two modes:
//
// MODE A — conflict-resolution flow (preferred):
//   { insertRows: ImportRow[], mergeRows: MergeRow[] }
//
// MODE B — legacy bulk strategy (fallback):
//   { rows: ImportRow[], strategy?: DuplicateStrategy }

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient()
    const body = await request.json()

    // ── Detect mode ───────────────────────────────────────────────────────────
    const isResolutionMode =
      Array.isArray(body.insertRows) || Array.isArray(body.mergeRows)

    let inserted = 0
    let updated = 0
    let skipped = 0
    const errors: ImportResult['errors'] = []

    if (isResolutionMode) {
      // ── MODE A: conflict-resolution ────────────────────────────────────────
      const rawInsert: ImportRow[] = body.insertRows ?? []
      const rawMerge: MergeRow[] = body.mergeRows ?? []

      // Validate insert rows
      const { valid: toInsert, errors: insertErrors } = validate(rawInsert)
      errors.push(...insertErrors)

      // Geocode both sets concurrently
      const [geocodedInsert, geocodedMerge] = await Promise.all([
        batchGeocode(toInsert),
        batchGeocode(rawMerge),
      ])

      // INSERT new records (chunks of 500)
      // We use upsert with ignoreDuplicates:true so that if the user picked
      // "Add as new" for a same_clinic/fuzzy conflict but the unique key
      // (provider_name, address, zip_code) already exists, we skip silently
      // instead of throwing a constraint error.
      const CHUNK = 500
      for (let i = 0; i < geocodedInsert.length; i += CHUNK) {
        const chunk = geocodedInsert.slice(i, i + CHUNK)
        const { data, error } = await supabase
          .from('medical_providers')
          .upsert(chunk, {
            onConflict: 'provider_name,address,zip_code',
            ignoreDuplicates: true,   // ON CONFLICT DO NOTHING
          })
          .select('id')
        if (error) {
          console.error('[import] insert error:', error)
          return NextResponse.json(
            { error: error.message, inserted, updated, skipped, errors },
            { status: 500 },
          )
        }
        const actuallyInserted = data?.length ?? chunk.length
        inserted += actuallyInserted
        skipped  += chunk.length - actuallyInserted
      }

      // UPDATE existing records one-by-one (merge semantics: overwrite with non-null incoming fields)
      for (const mergeRow of geocodedMerge) {
        const { _existingId, ...fields } = mergeRow as MergeRow & { _existingId: number }
        // Strip undefined so we don't accidentally null-out existing values
        const patch = Object.fromEntries(
          Object.entries(fields).filter(([, v]) => v !== undefined && v !== null && v !== ''),
        )
        const { error } = await supabase
          .from('medical_providers')
          .update(patch)
          .eq('id', _existingId)
        if (error) {
          console.error(`[import] update error id=${_existingId}:`, error)
          errors.push({ row: -1, message: `Failed to update id=${_existingId}: ${error.message}` })
        } else {
          updated++
        }
      }

      skipped = body.skippedCount ?? 0
    } else {
      // ── MODE B: legacy bulk strategy ───────────────────────────────────────
      const { rows, strategy = 'upsert' }: { rows: ImportRow[]; strategy?: DuplicateStrategy } = body

      if (!Array.isArray(rows) || rows.length === 0) {
        return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
      }

      const { valid, errors: valErrors } = validate(rows)
      errors.push(...valErrors)

      if (valid.length === 0) {
        return NextResponse.json<ImportResult>(
          { inserted: 0, updated: 0, skipped: 0, errors },
          { status: 422 },
        )
      }

      const geocoded = await batchGeocode(valid)
      const CHUNK = 500

      if (strategy === 'insert') {
        for (let i = 0; i < geocoded.length; i += CHUNK) {
          const chunk = geocoded.slice(i, i + CHUNK)
          const { error } = await supabase.from('medical_providers').insert(chunk)
          if (error)
            return NextResponse.json(
              { error: error.message, inserted, updated, skipped, errors },
              { status: 500 },
            )
          inserted += chunk.length
        }
      } else if (strategy === 'skip') {
        for (let i = 0; i < geocoded.length; i += CHUNK) {
          const chunk = geocoded.slice(i, i + CHUNK)
          const { data, error } = await supabase
            .from('medical_providers')
            .upsert(chunk, { onConflict: 'provider_name,address,zip_code', ignoreDuplicates: true })
            .select('id')
          if (error)
            return NextResponse.json(
              { error: error.message, inserted, updated, skipped, errors },
              { status: 500 },
            )
          const n = data?.length ?? 0
          inserted += n
          skipped += chunk.length - n
        }
      } else {
        // upsert
        for (let i = 0; i < geocoded.length; i += CHUNK) {
          const chunk = geocoded.slice(i, i + CHUNK)
          const names = chunk.map(r => r.provider_name)
          const { data: existing } = await supabase
            .from('medical_providers')
            .select('provider_name, address, zip_code')
            .in('provider_name', names)

          const existingSet = new Set(
            (existing ?? []).map(r => `${r.provider_name}||${r.address}||${r.zip_code ?? ''}`),
          )
          const newCount = chunk.filter(
            r => !existingSet.has(`${r.provider_name}||${r.address}||${r.zip_code ?? ''}`),
          ).length

          const { error } = await supabase
            .from('medical_providers')
            .upsert(chunk, { onConflict: 'provider_name,address,zip_code', ignoreDuplicates: false })
          if (error) {
            if (error.code === '42P10' || error.message.includes('no unique')) {
              return NextResponse.json(
                { error: 'UNIQUE constraint on (provider_name, address, zip_code) is required.' },
                { status: 400 },
              )
            }
            return NextResponse.json(
              { error: error.message, inserted, updated, skipped, errors },
              { status: 500 },
            )
          }
          inserted += newCount
          updated += chunk.length - newCount
        }
      }
    }

    console.log(`[import] inserted=${inserted} updated=${updated} skipped=${skipped}`)
    return NextResponse.json<ImportResult>(
      { inserted, updated, skipped, errors },
      { status: 200 },
    )
  } catch (err: any) {
    console.error('[providers/import] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
