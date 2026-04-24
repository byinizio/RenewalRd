import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import speakeasy from 'speakeasy';
import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const { code, secret } = await request.json();
  const ok = speakeasy.totp.verify({ secret, encoding: 'base32', token: code, window: 2 });
  if (!ok) return NextResponse.json({ error: 'Invalid code' }, { status: 400 });

  const session = cookies().get('admin_session')?.value;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: sess } = await supabaseAdmin.from('admin_sessions').select('admin_id').eq('token', session).single();
  if (!sess) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const backupCodes = Array.from({ length: 10 }, () => randomBytes(4).toString('hex').toUpperCase());
  await supabaseAdmin.from('admin_2fa').upsert({ admin_id: sess.admin_id, secret, enabled: true, backup_codes: backupCodes });

  return NextResponse.json({ success: true, backupCodes });
}