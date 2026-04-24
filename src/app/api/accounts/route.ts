// src/app/api/accounts/route.ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { client_id, platform, account_handle, access_token, refresh_token } = body;

    if (!client_id || !platform || !account_handle) {
      return NextResponse.json(
        { error: 'client_id, platform, and account_handle are required' },
        { status: 400 }
      );
    }

    const validPlatforms = ['twitter', 'linkedin', 'instagram'];
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json(
        { error: `platform must be one of: ${validPlatforms.join(', ')}` },
        { status: 400 }
      );
    }

    // Check for duplicate
    const { data: existing } = await supabaseAdmin
      .from('social_accounts')
      .select('id')
      .eq('client_id', client_id)
      .eq('platform', platform)
      .eq('account_handle', account_handle.replace('@', '').toLowerCase())
      .single();

    if (existing) {
      // Update existing instead of creating duplicate
      const { data, error } = await supabaseAdmin
        .from('social_accounts')
        .update({
          access_token_encrypted: access_token || null,
          refresh_token_encrypted: refresh_token || null,
          is_active: true,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, account: data, updated: true });
    }

    const { data: account, error } = await supabaseAdmin
      .from('social_accounts')
      .insert({
        client_id,
        platform,
        account_handle: account_handle.replace('@', '').toLowerCase().trim(),
        access_token_encrypted: access_token || null,
        refresh_token_encrypted: refresh_token || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, account }, { status: 201 });
  } catch (error: any) {
    console.error('Create account error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const account_id = searchParams.get('account_id');

  if (!account_id) {
    return NextResponse.json({ error: 'account_id required' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('social_accounts')
    .update({ is_active: false })
    .eq('id', account_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
