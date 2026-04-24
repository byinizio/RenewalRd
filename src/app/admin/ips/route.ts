import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

function requireAdmin() {
  const session = cookies().get('admin_session')?.value;
  if (!session) throw new Error('Unauthorized');
  return session;
}

export async function GET() {
  try { requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const { data: ips } = await supabaseAdmin.from('ip_whitelist').select('*').order('created_at', { ascending: false });
  return NextResponse.json({ ips: ips || [] });
}

export async function POST(request: Request) {
  try { requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const { ip_address, label } = await request.json();
  if (!/^(?:\d{1,3}\.){3}\d{1,3}$/.test(ip_address)) return NextResponse.json({ error: 'Invalid IP format' }, { status: 400 });
  const { data, error } = await supabaseAdmin.from('ip_whitelist').insert({ ip_address, label: label || 'Unnamed' }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true, ip: data });
}