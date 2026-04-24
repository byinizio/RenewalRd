import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

function requireAdmin() { const s = cookies().get('admin_session')?.value; if (!s) throw new Error('Unauthorized'); }

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try { requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const { enabled } = await req.json();
  await supabaseAdmin.from('ip_whitelist').update({ enabled }).eq('id', params.id);
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try { requireAdmin(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  await supabaseAdmin.from('ip_whitelist').delete().eq('id', params.id);
  return NextResponse.json({ success: true });
}