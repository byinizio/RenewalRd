import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const session = cookies().get('admin_session')?.value;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: sess } = await supabaseAdmin.from('admin_sessions').select('admin_id').eq('token', session).is('revoked_at', null).single();
  if (!sess) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { payment_id, agency_id, plan_name, wise_transfer_id, notes } = await request.json();

  // Get plan
  const { data: plan } = await supabaseAdmin.from('subscription_plans').select('*').eq('name', plan_name).single();
  if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });

  const now = new Date();
  const periodEnd = new Date(now); periodEnd.setMonth(periodEnd.getMonth() + 1);

  // Update payment
  if (payment_id) {
    await supabaseAdmin.from('payments').update({ status: 'confirmed', confirmed_by_admin: sess.admin_id, confirmed_at: now.toISOString(), wise_transfer_id: wise_transfer_id || null, notes: notes || null }).eq('id', payment_id);
  } else {
    // Create payment record
    await supabaseAdmin.from('payments').insert({ agency_id, plan_id: plan.id, amount_cents: plan.price_cents, wise_transfer_id: wise_transfer_id || null, status: 'confirmed', confirmed_by_admin: sess.admin_id, confirmed_at: now.toISOString(), period_start: now.toISOString(), period_end: periodEnd.toISOString(), notes: notes || null });
  }

  // Activate plan
  await supabaseAdmin.from('agencies').update({ plan_name, plan_id: plan.id, status: 'active', subscription_started_at: now.toISOString(), subscription_ends_at: periodEnd.toISOString() }).eq('id', agency_id);

  // Audit
  await supabaseAdmin.from('admin_audit_log').insert({ admin_id: sess.admin_id, action: 'confirm_payment', target_type: 'agency', target_id: agency_id, details: { plan_name, wise_transfer_id } });

  return NextResponse.json({ success: true });
}