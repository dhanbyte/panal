import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Delete from public.users first (cascades to other tables based on schema)
    const { error: publicErr } = await supabaseServer.from('users').delete().eq('id', userId);
    if (publicErr) {
      return NextResponse.json({ error: `Failed to delete user data: ${publicErr.message}` }, { status: 500 });
    }

    // 2. Delete from auth.users
    const { error: authErr } = await supabaseServer.auth.admin.deleteUser(userId);
    if (authErr) {
      // It's possible the auth user doesn't exist anymore, we still return success if public user was deleted
      console.error('Auth delete error:', authErr);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
