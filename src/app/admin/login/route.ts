import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { compare } from 'bcryptjs';
import speakeasy from 'speakeasy';
import { randomBytes } from 'crypto';

export async function POST(request: Request) {
  const ip        = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    const { email, password, totpCode, backupCode } = await request.json();

    const { data: admin, error } = await supabaseAdmin
      .from('admin_users')
      .select('*, admin_2fa(enabled, secret, backup_codes)')
      .eq('email', email)
      .single();

    if (error || !admin) {
      await logAttempt(ip, email, userAgent, false, 'invalid_email');
      return NextResponse.json({ error: 'Invalid credentials', step: 'credentials' }, { status: 401 });
    }

    const valid = await compare(password, admin.password_hash);
    if (!valid) {
      await logAttempt(ip, email, userAgent, false, 'invalid_password');
      await checkBruteForce(ip, email);
      return NextResponse.json({ error: 'Invalid credentials', step: 'credentials' }, { status: 401 });
    }

    const twoFa = admin.admin_2fa?.[0];
    if (twoFa?.enabled) {
      if (totpCode) {
        const ok = speakeasy.totp.verify({ secret: twoFa.secret, encoding: 'base32', token: totpCode, window: 2 });
        if (!ok) { await logAttempt(ip, email, userAgent, false, 'invalid_2fa'); return NextResponse.json({ error: 'Invalid 2FA code', step: '2fa' }, { status: 401 }); }
      } else if (backupCode) {
        const idx = twoFa.backup_codes?.indexOf(backupCode.toUpperCase());
        if (idx === -1 || idx === undefined) { return NextResponse.json({ error: 'Invalid backup code', step: '2fa' }, { status: 401 }); }
        const newCodes = [...twoFa.backup_codes]; newCodes.splice(idx, 1);
        await supabaseAdmin.from('admin_2fa').update({ backup_codes: newCodes }).eq('admin_id', admin.id);
      } else {
        return NextResponse.json({ error: '2FA required', step: '2fa' }, { status: 401 });
      }
    }

    const token      = randomBytes(32).toString('hex');
    const expiresAt  = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await supabaseAdmin.from('admin_sessions').insert({ admin_id: admin.id, token, ip_address: ip, user_agent: userAgent, expires_at: expiresAt.toISOString() });
    await supabaseAdmin.from('admin_users').update({ last_login_at: new Date().toISOString() }).eq('id', admin.id);
    await logAttempt(ip, email, userAgent, true, null);

    // Alert on new IP
    const { data: knownIp } = await supabaseAdmin.from('ip_whitelist').select('id').eq('ip_address', ip).single();
    if (!knownIp) {
      await supabaseAdmin.from('security_alerts').insert({ alert_type: 'new_ip_login', severity: 'medium', ip_address: ip, email, details: { userAgent } });
    }

    return NextResponse.json({ success: true }, {
      headers: {
        'Set-Cookie': [
          `admin_session=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=86400; Path=/admin`,
        ].join(', '),
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

async function logAttempt(ip: string, email: string | null, ua: string, success: boolean, reason: string | null) {
  await supabaseAdmin.from('login_attempts').insert({ ip_address: ip, email, user_agent: ua, path: '/api/admin/login', success, failure_reason: reason });
}

async function checkBruteForce(ip: string, email: string) {
  const { count } = await supabaseAdmin.from('login_attempts').select('*', { count: 'exact', head: true }).eq('ip_address', ip).eq('success', false).gt('created_at', new Date(Date.now() - 15 * 60 * 1000).toISOString());
  if (count && count >= 5) {
    await supabaseAdmin.from('security_alerts').insert({ alert_type: 'brute_force', severity: 'critical', ip_address: ip, email, details: { attemptCount: count } });
  }
}