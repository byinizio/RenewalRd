// src/app/api/signup/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { sendEmail, buildWelcomeEmail } from '@/lib/resend';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const name         = (formData.get('name') as string)?.trim();
    const owner_email  = (formData.get('email') as string)?.toLowerCase().trim();
    const password     = (formData.get('password') as string);
    const owner_phone  = (formData.get('phone') as string)?.replace(/\D/g, '') || '';
    const timezone     = (formData.get('timezone') as string) || 'America/New_York';
    const send_time    = (formData.get('send_time') as string) || '08:00';
    const plan_name    = (formData.get('plan') as string) || 'starter';

    if (!name || !owner_email || !password) {
      return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    // Create Supabase Auth user
    const supabaseAuth = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: authData, error: authError } = await supabaseAuth.auth.admin.createUser({
      email: owner_email,
      password,
      email_confirm: true,
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        return NextResponse.json({ error: 'This email is already registered.' }, { status: 409 });
      }
      throw authError;
    }

    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    // Get starter plan by default
    const { data: plan } = await supabaseAdmin
      .from('subscription_plans')
      .select('id')
      .eq('name', plan_name)
      .single();

    const { data: agency, error: insertError } = await supabaseAdmin
      .from('agencies')
      .insert({
        name,
        owner_email,
        owner_phone: owner_phone || null,
        timezone,
        send_time: `${send_time}:00`,
        status: 'trial',
        trial_ends_at: trialEndsAt,
        auth_user_id: authData.user.id,
        plan_name,
        plan_id: plan?.id || null,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://renewalradar.vercel.app';
    const welcomeHtml = buildWelcomeEmail(agency.name, agency.id, trialEndsAt, send_time, appUrl);
    sendEmail(owner_email, 'Welcome to RenewalRadar 👁️', welcomeHtml).catch(console.error);

    return NextResponse.redirect(`${appUrl}/thank-you?agency=${agency.id}`, 302);
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}