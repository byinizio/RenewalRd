// src/app/api/clients/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      agency_id,
      name,
      industry,
      contact_email,
      contact_phone,
      monthly_retainer,
      contract_end_date,
    } = body;

    if (!agency_id || !name) {
      return NextResponse.json(
        { error: 'agency_id and name are required' },
        { status: 400 }
      );
    }

    // Verify agency exists
    const { data: agency } = await supabaseAdmin
      .from('agencies')
      .select('id, status')
      .eq('id', agency_id)
      .single();

    if (!agency) {
      return NextResponse.json({ error: 'Agency not found' }, { status: 404 });
    }

    const { data: client, error } = await supabaseAdmin
      .from('clients')
      .insert({
        agency_id,
        name: name.trim(),
        industry: industry || 'saas',
        contact_email: contact_email?.trim() || null,
        contact_phone: contact_phone?.replace(/\D/g, '') || null,
        monthly_retainer_cents: monthly_retainer
          ? Math.round(Number(monthly_retainer) * 100)
          : 50000,
        contract_end_date: contract_end_date || null,
        status: 'active',
        risk_score: 0,
      })
      .select()
      .single();

    if (error) throw error;

    // Increment total_clients counter
    await supabaseAdmin.rpc('increment_agency_clients', { p_agency_id: agency_id });

    return NextResponse.json({ success: true, client }, { status: 201 });
  } catch (error: any) {
    console.error('Create client error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agency_id = searchParams.get('agency_id');

  if (!agency_id) {
    return NextResponse.json({ error: 'agency_id required' }, { status: 400 });
  }

  const { data: clients, error } = await supabaseAdmin
    .from('clients')
    .select('*, social_accounts(*)')
    .eq('agency_id', agency_id)
    .order('risk_score', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ clients });
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { client_id, ...updates } = body;

    if (!client_id) {
      return NextResponse.json({ error: 'client_id required' }, { status: 400 });
    }

    // Sanitize updates — only allow safe fields
    const allowed = [
      'name',
      'industry',
      'contact_email',
      'contact_phone',
      'monthly_retainer_cents',
      'contract_end_date',
      'status',
    ];
    const safeUpdates = Object.fromEntries(
      Object.entries(updates).filter(([key]) => allowed.includes(key))
    );

    const { data, error } = await supabaseAdmin
      .from('clients')
      .update(safeUpdates)
      .eq('id', client_id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, client: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const client_id = searchParams.get('client_id');

  if (!client_id) {
    return NextResponse.json({ error: 'client_id required' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('clients')
    .delete()
    .eq('id', client_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
