import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  const session = cookies().get('admin_session')?.value;
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: sess } = await supabaseAdmin.from('admin_sessions').select('admin_id').eq('token', session).is('revoked_at', null).single();
  if (!sess) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { agency_id, action, plan_name, days, reason } = await request.json();
  if (!agency_id || !action) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  let updates: any = {};

  switch (action) {
    case 'change_plan': {
      const { data: plan } = await supabaseAdmin.from('subscription_plans').select('*').eq('name', plan_name).single();
      if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
      const now = new Date();
      const end = new Date(now); end.setMonth(end.getMonth() + 1);
      updates = { plan_name, plan_id: plan.id, status: 'active', subscription_started_at: now.toISOString(), subscription_ends_at: end.toISOString() };
      break;
    }
    case 'extend_trial': {
      const { data: ag } = await supabaseAdmin.from('agencies').select('trial_ends_at').eq('id', agency_id).single();
      if (!ag) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const current = new Date(ag.trial_ends_at);
      current.setDate(current.getDate() + (days || 7));
      updates = { trial_ends_at: current.toISOString() };
      break;
    }
    case 'ban':
      updates = { is_banned: true, ban_reason: reason || 'Banned by admin', status: 'paused' };
      break;
    case 'unban':
      updates = { is_banned: false, ban_reason: null };
      break;
    case 'cancel_subscription':
      updates = { status: 'cancelled' };
      break;
    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from('agencies').update(updates).eq('id', agency_id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit log
  await supabaseAdmin.from('admin_audit_log').insert({ admin_id: sess.admin_id, action, target_type: 'agency', target_id: agency_id, details: { plan_name, days, reason } });

  return NextResponse.json({ success: true });
}