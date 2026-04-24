import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const rateLimitStore = new Map<string, number[]>();

export async function middleware(request: NextRequest) {
  const path      = request.nextUrl.pathname;
  const ip        = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const userAgent = request.headers.get('user-agent') || '';

  // Emergency bypass (use only for lockout recovery)
  const isEmergency = request.headers.get('x-emergency-bypass') === process.env.ADMIN_EMERGENCY_CODE;

  // Rate limit login endpoints
  if (path === '/api/admin/login' || path === '/admin/login') {
    if (isRateLimited(`login:${ip}`, 5, 15 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many attempts. Try again in 15 minutes.' }, { status: 429 });
    }
  }

  // Rate limit agency auth
  if (path === '/api/signup' || path === '/login') {
    if (isRateLimited(`auth:${ip}`, 10, 60 * 60 * 1000)) {
      return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
    }
  }

  // Admin route protection
  if (path.startsWith('/admin')) {
    if (path === '/admin/login') return NextResponse.next();

    if (!isEmergency) {
      const allowed = await checkIpWhitelist(ip);
      if (!allowed) {
        await createAlert('ip_blocked', 'high', ip, null, { path, userAgent });
        return new NextResponse(
          JSON.stringify({ error: 'Access denied', yourIp: ip }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    const sessionValid = await validateSession(request);
    if (!sessionValid) return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // Customer API rate limit
  if (path.startsWith('/api/') && !path.startsWith('/api/admin')) {
    if (isRateLimited(`api:${ip}`, 120, 60 * 1000)) {
      return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
    }
  }

  return NextResponse.next();
}

function isRateLimited(key: string, max: number, windowMs: number): boolean {
  const now     = Date.now();
  const stamps  = (rateLimitStore.get(key) || []).filter(t => now - t < windowMs);
  if (stamps.length >= max) return true;
  stamps.push(now); rateLimitStore.set(key, stamps); return false;
}

async function checkIpWhitelist(ip: string): Promise<boolean> {
  try {
    const sb = createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data } = await sb.from('ip_whitelist').select('id').eq('ip_address', ip).eq('enabled', true).single();
    if (data) { await sb.from('ip_whitelist').update({ last_used_at: new Date().toISOString() }).eq('ip_address', ip); }
    return !!data;
  } catch { return false; }
}

async function validateSession(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get('admin_session')?.value;
  if (!token) return false;
  try {
    const sb = createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data } = await sb.from('admin_sessions').select('id').eq('token', token).is('revoked_at', null).gt('expires_at', new Date().toISOString()).single();
    return !!data;
  } catch { return false; }
}

async function createAlert(type: string, severity: string, ip: string | null, email: string | null, details: any) {
  try {
    const sb = createClient(supabaseUrl, supabaseKey, { auth: { autoRefreshToken: false, persistSession: false } });
    await sb.from('security_alerts').insert({ alert_type: type, severity, ip_address: ip, email, details });
  } catch {}
}

export const config = { matcher: ['/admin/:path*', '/api/admin/:path*', '/api/:path*', '/login', '/api/signup'] };