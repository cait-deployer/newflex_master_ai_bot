// app/api/admin/appointments/[id]/route.ts
// PATCH (update status / notes) + DELETE for a single appointment.

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
);

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    const id = parseInt(params.id);
    if (isNaN(id)) return Response.json({ error: 'Invalid id' }, { status: 400 });

    const body = await req.json();

    // Only allow updating safe fields
    const allowed: Record<string, true> = {
        status: true,
        additional_notes: true,
        availability: true,
        visit_format: true,
    };
    const updates: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
        if (allowed[k]) updates[k] = v;
    }

    if (Object.keys(updates).length === 0) {
        return Response.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const { error } = await supabase.from('appointments').update(updates).eq('id', id);

    if (error) {
        console.error('[admin/appointments] PATCH error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
    const id = parseInt(params.id);
    if (isNaN(id)) return Response.json({ error: 'Invalid id' }, { status: 400 });

    const { error } = await supabase.from('appointments').delete().eq('id', id);

    if (error) {
        console.error('[admin/appointments] DELETE error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ ok: true });
}
