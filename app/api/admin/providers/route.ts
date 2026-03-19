import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

// GET - List all providers
export async function GET(request: NextRequest) {
    try {
        const supabase = getSupabaseServerClient();
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search')?.trim();

        let query = supabase
            .from('medical_providers')
            .select('*')
            .order('created_at', { ascending: false });

        if (search) {
            query = (query as any).or(
                `provider_name.ilike.%${search}%,specialty.ilike.%${search}%,city.ilike.%${search}%`,
            );
        }

        const { data, error } = await query;

        if (error) {
            console.error('[admin-providers] GET error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ providers: data ?? [] });
    } catch (error) {
        console.error('[admin-providers] GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Create a new provider
export async function POST(request: NextRequest) {
    try {
        const supabase = getSupabaseServerClient();
        const providerData = await request.json();

        const { data, error } = await supabase
            .from('medical_providers')
            .insert([providerData])
            .select()
            .single();

        if (error) {
            console.error('[admin-providers] Create error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, provider: data }, { status: 201 });
    } catch (error) {
        console.error('[admin-providers] POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PUT - Update an existing provider
export async function PUT(request: NextRequest) {
    try {
        const supabase = getSupabaseServerClient();
        const { id, ...providerData } = await request.json();

        if (!id) {
            return NextResponse.json({ error: 'Provider ID is required' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('medical_providers')
            .update(providerData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('[admin-providers] Update error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, provider: data });
    } catch (error) {
        console.error('[admin-providers] PUT error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE - Delete a provider
export async function DELETE(request: NextRequest) {
    try {
        const supabase = getSupabaseServerClient();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Provider ID is required' }, { status: 400 });
        }

        const { error } = await supabase.from('medical_providers').delete().eq('id', id);

        if (error) {
            console.error('[admin-providers] Delete error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[admin-providers] DELETE error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
