import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { fullName, phone, department } = await request.json();

    if (!fullName || !phone || !department) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 
                               process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseServiceKey) {
      return NextResponse.json({ error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY not found' }, { status: 500 });
    }

    const supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // 1. Check if phone already registered
    const { data: existing } = await supabaseServer
      .from('users')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Phone number already registered' }, { status: 400 });
    }

    const fakeEmail = `${phone}@shopwave.app`;
    const tempPassword = `sw_${phone}_${Date.now()}`;

    // 2. Create auth user first (satisfies FK constraint)
    const { data: authData, error: authError } = await supabaseServer.auth.admin.createUser({
      email: fakeEmail,
      password: tempPassword,
      email_confirm: true,
    });

    if (authError || !authData?.user) {
      return NextResponse.json({ error: `Auth creation failed: ${authError?.message || 'Unknown error'}` }, { status: 500 });
    }

    // 3. Insert into public.users with the auth user's ID
    const { data: userProfile, error: profileError } = await supabaseServer
      .from('users')
      .insert({
        id: authData.user.id,
        full_name: fullName,
        phone: phone,
        department: department,
        email: fakeEmail,
      })
      .select()
      .single();

    if (profileError) {
      // Cleanup auth user if public.users insert fails
      await supabaseServer.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: `Profile creation failed: ${profileError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: userProfile });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
