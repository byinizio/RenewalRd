// src/app/api/signup/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail, buildWelcomeEmail } from '@/lib/resend';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const name = (formData.get('name') as string)?.trim();
    const owner_email = (formData.get('email') as string)?.toLowerCase().trim();
    const owner_phone = (formData.get('phone') as string)?.replace(/\D/g, '') || '';
    const timezone = (formData.get('timezone') as string) || 'America/New_York';
    const send_time = (formData.get('send_time') as string) || '08:00';

    // Basic validation
    if (!name || !owner_email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    if (!owner_email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const trialEndsAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    // Create agency
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
      })
      .select()
      .single();

    if (insertError) {
      if (
        insertError.message.includes('duplicate') ||
        insertError.message.includes('unique')
      ) {
        return NextResponse.json(
          { error: 'This email is already registered. Try logging in.' },
          { status: 409 }
        );
      }
      throw insertError;
    }

    // Send welcome email (non-blocking — don't fail signup if email fails)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://renewalradar.vercel.app';
    const welcomeHtml = buildWelcomeEmail(
      agency.name,
      agency.id,
      trialEndsAt,
      send_time,
      appUrl
    );

    sendEmail(owner_email, 'Welcome to RenewalRadar 👁️', welcomeHtml).catch(
      (err) => console.error('Welcome email failed:', err)
    );

    // Redirect to thank-you page
    return NextResponse.redirect(
      `${appUrl}/thank-you?agency=${agency.id}`,
      302
    );
  } catch (error: any) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
