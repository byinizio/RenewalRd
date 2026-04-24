import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  const signature = request.headers.get('x-signature-sha256');
  const body      = await request.text();

  // Verify Wise signature
  const expected = createHmac('sha256', process.env.WISE_WEBHOOK_SECRET!)
    .update(body).digest('base64');
  if (signature !== expected) return new Response('Unauthorized', { status: 401 });

  const event = JSON.parse(body);

  if (event.event_type === 'transfers#state-change' && event.data?.current_state === 'outgoing_payment_sent') {
    const ref = event.data?.resource?.details?.reference as string;
    // Reference format: RR-{AGENCY_ID_PREFIX}
    if (ref?.startsWith('RR-')) {
      const prefix = ref.replace('RR-', '').toLowerCase();
      const { data: agency } = await supabaseAdmin.from('agencies').select('id, plan_name').filter('id', 'ilike', `${prefix}%`).single();
      if (agency) {
        await supabaseAdmin.from('payments').update({ status: 'confirmed', confirmed_at: new Date().toISOString(), wise_transfer_id: String(event.data?.resource?.id) }).eq('agency_id', agency.id).eq('status', 'pending');
        const { data: plan } = await supabaseAdmin.from('subscription_plans').select('id').eq('name', agency.plan_name).single();
        const now = new Date(); const end = new Date(now); end.setMonth(end.getMonth() + 1);
        await supabaseAdmin.from('agencies').update({ status: 'active', plan_id: plan?.id, subscription_started_at: now.toISOString(), subscription_ends_at: end.toISOString() }).eq('id', agency.id);
      }
    }
  }

  return NextResponse.json({ received: true });
}