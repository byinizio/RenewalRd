import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  const { agency_id } = await request.json();
  if (!agency_id) return NextResponse.json({ error: 'Missing agency_id' }, { status: 400 });

  const { data: agency } = await supabaseAdmin.from('agencies').select('subscription_ends_at, owner_email, name').eq('id', agency_id).single();
  if (!agency) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await supabaseAdmin.from('agencies').update({ status: 'cancelled' }).eq('id', agency_id);

  // TODO: notify admin by email about cancellation
  return NextResponse.json({ success: true });
}