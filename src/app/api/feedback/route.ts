// src/app/api/feedback/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { client_id, digest_id, outcome, notes } = body;

    if (!client_id || !outcome) {
      return NextResponse.json(
        { error: 'client_id and outcome are required' },
        { status: 400 }
      );
    }

    const validOutcomes = ['saved', 'lost', 'no_action', 'false_alarm'];
    if (!validOutcomes.includes(outcome)) {
      return NextResponse.json(
        { error: `outcome must be one of: ${validOutcomes.join(', ')}` },
        { status: 400 }
      );
    }

    // Insert feedback record
    const { data: feedback, error } = await supabaseAdmin
      .from('feedback')
      .insert({
        client_id,
        digest_id: digest_id || null,
        outcome,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) throw error;

    // Update client status based on outcome
    const statusMap: Record<string, string> = {
      saved: 'saved',
      lost: 'churned',
      no_action: 'active',
      false_alarm: 'active',
    };

    const updates: Record<string, any> = {
      status: statusMap[outcome],
      last_interaction_at: new Date().toISOString(),
    };

    // Reset risk score for false alarms
    if (outcome === 'false_alarm') {
      updates.risk_score = 0;
      updates.risk_reason = null;
    }

    await supabaseAdmin
      .from('clients')
      .update(updates)
      .eq('id', client_id);

    // Update agency aggregate counters
    if (outcome === 'saved') {
      // Get agency_id from client
      const { data: client } = await supabaseAdmin
        .from('clients')
        .select('agency_id, monthly_retainer_cents')
        .eq('id', client_id)
        .single();

      if (client) {
        await supabaseAdmin.rpc('increment_agency_saved', {
          p_agency_id: client.agency_id,
        });
      }
    } else if (outcome === 'lost') {
      const { data: client } = await supabaseAdmin
        .from('clients')
        .select('agency_id')
        .eq('id', client_id)
        .single();

      if (client) {
        await supabaseAdmin.rpc('increment_agency_lost', {
          p_agency_id: client.agency_id,
        });
      }
    }

    return NextResponse.json({ success: true, feedback });
  } catch (error: any) {
    console.error('Feedback error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
