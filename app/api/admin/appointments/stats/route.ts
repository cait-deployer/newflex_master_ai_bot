import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

// GET /api/admin/appointments/stats
export async function GET(_request: NextRequest) {
    try {
        const supabase = getSupabaseServerClient();

        const { data, error } = await supabase.from('appointments').select(`
          service_type,
          visit_format,
          created_at,
          provider_id,
          provider_name,
          legal_firm,
          attorney_name,
          medical_providers ( id, provider_name, specialty )
        `);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const rows = data ?? [];

        const byServiceType: Record<string, number> = {};
        const byVisitFormat: Record<string, number> = {};
        const byProviderMap: Record<string, { name: string; specialty?: string; count: number }> = {};
        const byLawFirmMap: Record<string, number> = {};

        const last7: Record<string, number> = {};
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            last7[d.toISOString().slice(0, 10)] = 0;
        }

        const now         = new Date();
        const todayKey    = now.toISOString().slice(0, 10);
        const weekAgo     = new Date(now.getTime() -  7 * 86_400_000).toISOString().slice(0, 10);
        const twoWeeksAgo = new Date(now.getTime() - 14 * 86_400_000).toISOString().slice(0, 10);
        const yesterdayKey = new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10);

        let thisWeek = 0;
        let lastWeek = 0;

        rows.forEach((r: any) => {
            if (r.service_type) byServiceType[r.service_type] = (byServiceType[r.service_type] ?? 0) + 1;
            if (r.visit_format) byVisitFormat[r.visit_format] = (byVisitFormat[r.visit_format] ?? 0) + 1;

            const day = r.created_at?.slice(0, 10);
            if (day && day in last7) last7[day]++;
            if (day && day >= weekAgo)     thisWeek++;
            else if (day && day >= twoWeeksAgo) lastWeek++;

            // Provider — prefer FK, fall back to plain text
            if (r.provider_id && r.medical_providers) {
                const key = String(r.provider_id);
                if (!byProviderMap[key]) {
                    byProviderMap[key] = {
                        name: r.medical_providers.provider_name,
                        specialty: r.medical_providers.specialty ?? undefined,
                        count: 0,
                    };
                }
                byProviderMap[key].count++;
            } else if (r.provider_name) {
                const key = `txt_${r.provider_name}`;
                if (!byProviderMap[key]) byProviderMap[key] = { name: r.provider_name, count: 0 };
                byProviderMap[key].count++;
            }

            const firm = r.legal_firm ?? r.attorney_name;
            if (firm) byLawFirmMap[firm] = (byLawFirmMap[firm] ?? 0) + 1;
        });

        const byProvider = Object.values(byProviderMap)
            .sort((a, b) => b.count - a.count)
            .slice(0, 6);

        const byLawFirm = Object.entries(byLawFirmMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));

        const byServiceTypeArr = Object.entries(byServiceType)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name, count }));

        return NextResponse.json({
            total:     rows.length,
            today:     last7[todayKey]     ?? 0,
            yesterday: last7[yesterdayKey] ?? 0,
            thisWeek,
            lastWeek,
            telemed:  byVisitFormat['telemed']   ?? 0,
            inPerson: byVisitFormat['in_person'] ?? 0,
            byProvider,
            byLawFirm,
            byServiceType: byServiceTypeArr,
            last7: Object.entries(last7).map(([date, count]) => ({ date, count })),
        });
    } catch (err) {
        console.error('[appointments/stats] error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
