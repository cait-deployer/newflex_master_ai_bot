import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
    const { username, password } = await req.json();

    // Проверяем юзера — pgcrypto сам сравнивает хеш
    const { data, error } = await supabase.rpc('check_admin_password', {
        p_username: username,
        p_password: password,
    });

    if (error || !data) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set('admin_session', 'authenticated', {
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 86400,
        path: '/',
    });
    return response;
}
