import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function POST() {
  const token = cookies().get('admin_session')?.value;
  if (token) await supabaseAdmin.from('admin_sessions').update({ revoked_at: new Date().toISOString() }).eq('token', token);
  const res = NextResponse.redirect(new URL('/admin/login', process.env.NEXT_PUBLIC_APP_URL));
  res.cookies.set('admin_session', '', { maxAge: 0, path: '/admin' });
  return res;
}