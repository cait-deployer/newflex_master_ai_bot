import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

// DELETE /api/admin/providers/bulk-delete
// Body: { ids: number[] }
export async function DELETE(request: NextRequest) {
    try {
        const supabase = getSupabaseServerClient();
        const { ids } = (await request.json()) as { ids: number[] };

        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'No IDs provided' }, { status: 400 });
        }

        const { error } = await supabase.from('medical_providers').delete().in('id', ids);

        if (error) {
            console.error('[providers/bulk-delete] error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, deleted: ids.length });
    } catch (err: any) {
        console.error('[providers/bulk-delete] error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
