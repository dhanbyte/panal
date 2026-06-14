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
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Check if phone already registered
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('phone', phone)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Phone number already registered' }, { status: 400 });
    }

    const fakeEmail = `${phone}@shopwave.app`;

    // 2. Check if email already exists
    const { data: emailExists } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', fakeEmail)
      .maybeSingle();

    if (emailExists) {
      return NextResponse.json({ error: 'This phone number is already registered' }, { status: 400 });
    }

    // 3. Try to create auth user first (for FK constraint if it exists)
    let finalUserId: string | null = null;

    try {
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: fakeEmail,
        password: `sw_${phone}_${Date.now()}`,
        email_confirm: true,
      });

      if (!authError && authData?.user?.id) {
        finalUserId = authData.user.id;
      }
    } catch {
      // auth.admin may not be available, continue without it
    }

    // 4. If we got an auth user ID, delete any trigger-created row first
    if (finalUserId) {
      // The trigger may have already created a partial row - delete it so we can insert properly
      await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', finalUserId);
    }

    // 5. Generate UUID if auth didn't provide one
    if (!finalUserId) {
      finalUserId = crypto.randomUUID();
    }

    // 6. Insert into public.users with all fields
    const { data: userProfile, error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: finalUserId,
        full_name: fullName,
        phone: phone,
        department: department,
        email: fakeEmail,
      })
      .select()
      .single();

    if (insertError) {
      // If insert failed due to FK constraint (auth.users reference), try without specifying id
      if (insertError.message.includes('foreign key') || insertError.message.includes('auth')) {
        // Table requires auth.users FK - we already created auth user above
        // Try insert again - maybe trigger already created the row, so upsert
        const { data: upsertData, error: upsertError } = await supabaseAdmin
          .from('users')
          .upsert({
            id: finalUserId,
            full_name: fullName,
            phone: phone,
            department: department,
            email: fakeEmail,
          }, { onConflict: 'id' })
          .select()
          .single();

        if (upsertError) {
          return NextResponse.json({ error: `Registration failed: ${upsertError.message}` }, { status: 500 });
        }

        return NextResponse.json({ success: true, user: upsertData });
      }

      return NextResponse.json({ error: `Registration failed: ${insertError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: userProfile });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
