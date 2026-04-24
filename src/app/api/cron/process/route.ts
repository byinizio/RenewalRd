// src/app/api/cron/process/route.ts
// Secured endpoint — triggered by GitHub Actions daily at 8am UTC
// Can also be triggered manually from dashboard

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getTwitterMetrics } from '@/lib/twitter';
import { calculateRiskScore, predictChurnDate, getEmailSubject } from '@/lib/churn';
import { generateClientAnalysis } from '@/lib/openai';
import { sendEmail } from '@/lib/resend';
import {
  ClientMetricsData,
  HistoricalMetrics,
  ClientAnalysisResult,
} from '@/types';

export const maxDuration = 300; // 5 min timeout on Vercel

export async function POST(request: Request) {
  // Secure with CRON_SECRET
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results = await runDailyAnalysis();
    return NextResponse.json({ success: true, ...results });
  } catch (error: any) {
    console.error('Cron process error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET for quick manual trigger from browser (dev only)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const results = await runDailyAnalysis();
    return NextResponse.json({ success: true, ...results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function runDailyAnalysis() {
  const startTime = Date.now();
  const now = new Date();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://renewalradar.vercel.app';
  const twitterBearer = process.env.TWITTER_BEARER_TOKEN || '';

  let agenciesProcessed = 0;
  let emailsSent = 0;
  let errors: string[] = [];

  // Fetch all active/trial agencies with their clients + accounts
  const { data: agencies, error: agencyError } = await supabaseAdmin
    .from('agencies')
    .select(`
      *,
      clients (
        *,
        social_accounts (*)
      )
    `)
    .in('status', ['trial', 'active']);

  if (agencyError) throw agencyError;
  if (!agencies || agencies.length === 0) {
    return { agenciesProcessed: 0, emailsSent: 0, message: 'No active agencies' };
  }

  for (const agency of agencies) {
    try {
      // Skip expired trials
      if (
        agency.status === 'trial' &&
        new Date(agency.trial_ends_at) < now
      ) {
        console.log(`Trial expired: ${agency.name}`);
        continue;
      }

      const clientAnalyses: ClientAnalysisResult[] = [];
      let totalAtRisk = 0;
      let totalRevenueAtRisk = 0;

      const activeClients = (agency.clients || []).filter(
        (c: any) => c.status === 'active' || c.status === 'at_risk'
      );

      for (const client of activeClients) {
        try {
          // ── Aggregate metrics from all connected accounts ──
          let aggregated: ClientMetricsData = {
            followers: 0,
            impressions: 0,
            engagement_rate: 0,
            clicks: 0,
            posts_count: 0,
          };
          let accountCount = 0;

          for (const account of client.social_accounts || []) {
            if (!account.is_active) continue;

            let metrics: ClientMetricsData | null = null;

            switch (account.platform) {
              case 'twitter':
                if (twitterBearer) {
                  metrics = await getTwitterMetrics(account.account_handle, twitterBearer);
                }
                break;
              case 'linkedin':
                // TODO: implement with access token from account
                break;
              case 'instagram':
                // TODO: implement with access token from account
                break;
            }

            if (metrics) {
              aggregated.followers += metrics.followers;
              aggregated.impressions += metrics.impressions;
              aggregated.engagement_rate += metrics.engagement_rate;
              aggregated.clicks += metrics.clicks;
              aggregated.posts_count += metrics.posts_count;
              accountCount++;
            }
          }

          // Average engagement rate across platforms
          if (accountCount > 1) {
            aggregated.engagement_rate /= accountCount;
          }

          // ── Save today's metrics ──
          await supabaseAdmin.from('daily_metrics').insert({
            client_id: client.id,
            platform: 'aggregated',
            followers: aggregated.followers,
            impressions: aggregated.impressions,
            engagement_rate: aggregated.engagement_rate,
            clicks: aggregated.clicks,
            posts_count: aggregated.posts_count,
          });

          // ── Compute historical averages (last 7 days) ──
          const { data: historyRows } = await supabaseAdmin
            .from('daily_metrics')
            .select('*')
            .eq('client_id', client.id)
            .order('logged_at', { ascending: false })
            .limit(8); // 8 to exclude today

          const rows = (historyRows || []).slice(1); // skip today
          const count = rows.length || 1;

          const history: HistoricalMetrics = {
            followers_7d_avg: rows.reduce((s: number, m: any) => s + m.followers, 0) / count,
            impressions_7d_avg: rows.reduce((s: number, m: any) => s + m.impressions, 0) / count,
            engagement_7d_avg: rows.reduce((s: number, m: any) => s + m.engagement_rate, 0) / count,
            posts_7d_avg: rows.reduce((s: number, m: any) => s + m.posts_count, 0) / count,
            followers_30d_avg: 0,
            impressions_30d_avg: 0,
            engagement_30d_avg: 0,
          };

          // Days since last post
          const daysSinceLastPost = aggregated.posts_count > 0
            ? 0
            : rows.length > 0 && rows[0].posts_count === 0
              ? 4
              : 0;

          // Days until contract end
          let daysUntilContractEnd: number | undefined;
          if (client.contract_end_date) {
            const contractEnd = new Date(client.contract_end_date);
            daysUntilContractEnd = Math.ceil(
              (contractEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );
          }

          // ── Calculate risk ──
          const risk = calculateRiskScore(
            aggregated,
            history,
            daysSinceLastPost,
            daysUntilContractEnd
          );

          const predictedChurnDate = predictChurnDate(risk.score, now);

          // ── Save risk snapshot ──
          await supabaseAdmin.from('risk_snapshots').insert({
            client_id: client.id,
            risk_score: risk.score,
            risk_level: risk.level,
            risk_factors: risk.factors,
            metrics_snapshot: aggregated,
            predicted_churn_date: predictedChurnDate?.toISOString().split('T')[0] || null,
          });

          // ── Update client risk score ──
          await supabaseAdmin
            .from('clients')
            .update({
              risk_score: risk.score,
              risk_reason: risk.factors.join('; ') || null,
              status: risk.score >= 50 ? 'at_risk' : 'active',
            })
            .eq('id', client.id);

          // ── Generate AI analysis for at-risk clients (score >= 25) ──
          let analysis = null;
          if (risk.score >= 25) {
            analysis = await generateClientAnalysis(client, aggregated, history, risk);
            totalAtRisk++;
            totalRevenueAtRisk += client.monthly_retainer_cents;
          }

          clientAnalyses.push({ client, risk, metrics: aggregated, analysis });
        } catch (clientErr: any) {
          console.error(`Client ${client.name} failed:`, clientErr.message);
          errors.push(`${client.name}: ${clientErr.message}`);
        }
      }

      // Sort: highest risk first
      clientAnalyses.sort((a, b) => b.risk.score - a.risk.score);

      // ── Build and send digest email ──
      const criticalClients = clientAnalyses.filter((c) => c.risk.level === 'critical');
      const highClients = clientAnalyses.filter((c) => c.risk.level === 'high');
      const subject = getEmailSubject(
        criticalClients.length,
        highClients.length,
        clientAnalyses.length
      );

      const emailHtml = buildDigestEmail(
        agency,
        clientAnalyses,
        totalAtRisk,
        totalRevenueAtRisk,
        appUrl,
        now
      );

      const emailResult = await sendEmail(agency.owner_email, subject, emailHtml);

      // ── Save digest record ──
      const { data: digest } = await supabaseAdmin
        .from('daily_digests')
        .insert({
          agency_id: agency.id,
          email_status: emailResult ? 'sent' : 'failed',
          email_subject: subject,
          short_summary: `${totalAtRisk} clients at risk, $${(totalRevenueAtRisk / 100).toFixed(0)} revenue exposed`,
          full_analysis: { clients: clientAnalyses },
          clients_at_risk: totalAtRisk,
          clients_saved: 0,
          revenue_at_risk_cents: totalRevenueAtRisk,
        })
        .select()
        .single();

      // ── SMS alert for critical clients ──
      if (criticalClients.length > 0 && agency.owner_phone && agency.carrier) {
        const smsMsg = `RenewalRadar: ${criticalClients.length} client${criticalClients.length > 1 ? 's' : ''} at CRITICAL risk. Open email immediately. ${appUrl}/dashboard?agency=${agency.id}`;
        // sendSmsViaEmail(agency.owner_phone, agency.carrier, smsMsg);
      }

      agenciesProcessed++;
      if (emailResult) emailsSent++;
      console.log(`✅ ${agency.name}: ${totalAtRisk} at risk, email ${emailResult ? 'sent' : 'FAILED'}`);
    } catch (agencyErr: any) {
      console.error(`Agency ${agency.name} failed:`, agencyErr.message);
      errors.push(`${agency.name}: ${agencyErr.message}`);
    }
  }

  return {
    agenciesProcessed,
    emailsSent,
    errors,
    durationMs: Date.now() - startTime,
  };
}

function buildDigestEmail(
  agency: any,
  analyses: ClientAnalysisResult[],
  atRisk: number,
  revenueAtRisk: number,
  appUrl: string,
  now: Date
): string {
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const topClients = analyses.slice(0, 6);

  const riskBg: Record<string, string> = {
    critical: '#fef2f2',
    high: '#fff7ed',
    medium: '#fefce8',
    low: '#f0fdf4',
  };
  const riskBorder: Record<string, string> = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#22c55e',
  };
  const riskLabel: Record<string, string> = {
    critical: '🚨 CRITICAL',
    high: '⚠️ HIGH',
    medium: '🟡 MEDIUM',
    low: '✅ STABLE',
  };

  const clientRows = topClients
    .map(
      ({ client, risk, metrics }) => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="width:10px;height:10px;border-radius:50%;background:${riskBorder[risk.level]};flex-shrink:0;"></div>
          <span style="font-weight:600;font-size:14px;">${client.name}</span>
        </div>
        <div style="font-size:12px;color:#888;margin-top:2px;padding-left:18px;">${risk.factors[0] || 'Monitoring...'}</div>
      </td>
      <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;text-align:center;">
        <span style="background:${riskBorder[risk.level]};color:white;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.05em;">${riskLabel[risk.level]}</span>
      </td>
      <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;font-size:14px;">
        ${risk.score}/100
      </td>
      <td style="padding:12px 16px;border-bottom:1px solid #f0f0f0;text-align:right;color:#555;font-size:13px;">
        $${(client.monthly_retainer_cents / 100).toLocaleString()}/mo
      </td>
    </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px 16px;">
    
    <!-- Header -->
    <div style="background:#0a0a0a;border-radius:12px 12px 0 0;padding:24px 28px;margin-bottom:0;">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <span style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#ef4444;font-weight:700;">RENEWALRADAR</span>
          <p style="margin:4px 0 0;font-size:18px;font-weight:700;color:#fff;">Good morning, ${agency.name}</p>
        </div>
        <p style="margin:0;font-size:12px;color:#666;">${dateStr}</p>
      </div>
    </div>
    
    <!-- Stats Bar -->
    <div style="background:#161616;padding:20px 28px;display:flex;gap:0;border-bottom:1px solid #2a2a2a;">
      <div style="flex:1;text-align:center;border-right:1px solid #2a2a2a;">
        <p style="margin:0;font-size:22px;font-weight:800;color:#fff;">${analyses.length}</p>
        <p style="margin:4px 0 0;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.1em;">Monitored</p>
      </div>
      <div style="flex:1;text-align:center;border-right:1px solid #2a2a2a;">
        <p style="margin:0;font-size:22px;font-weight:800;color:${atRisk > 0 ? '#ef4444' : '#22c55e'};">${atRisk}</p>
        <p style="margin:4px 0 0;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.1em;">At Risk</p>
      </div>
      <div style="flex:1;text-align:center;">
        <p style="margin:0;font-size:22px;font-weight:800;color:${revenueAtRisk > 0 ? '#ef4444' : '#22c55e'};">$${(revenueAtRisk / 100).toLocaleString()}</p>
        <p style="margin:4px 0 0;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:0.1em;">Revenue Exposed</p>
      </div>
    </div>
    
    <!-- Client Table -->
    <div style="background:#fff;border-radius:0 0 12px 12px;overflow:hidden;margin-bottom:16px;">
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr style="background:#fafafa;">
            <th style="padding:10px 16px;text-align:left;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;border-bottom:1px solid #eee;">Client</th>
            <th style="padding:10px 16px;text-align:center;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;border-bottom:1px solid #eee;">Status</th>
            <th style="padding:10px 16px;text-align:right;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;border-bottom:1px solid #eee;">Score</th>
            <th style="padding:10px 16px;text-align:right;font-size:11px;color:#999;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;border-bottom:1px solid #eee;">Retainer</th>
          </tr>
        </thead>
        <tbody>
          ${clientRows}
        </tbody>
      </table>
    </div>
    
    <!-- CTA -->
    <div style="text-align:center;margin-bottom:16px;">
      <a href="${appUrl}/digest/latest?agency=${agency.id}"
         style="display:inline-block;background:#ef4444;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;">
        📖 Read Full Analysis + Scripts →
      </a>
      <p style="margin:12px 0 0;font-size:12px;color:#999;">Intervention scripts · Keep/stop doing · Upsell opportunities</p>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding-top:16px;border-top:1px solid #e5e5e5;">
      <p style="font-size:12px;color:#aaa;margin:0;">
        <a href="${appUrl}/dashboard?agency=${agency.id}" style="color:#666;text-decoration:none;">Dashboard</a>
        &nbsp;·&nbsp;
        <a href="${appUrl}/settings?agency=${agency.id}" style="color:#666;text-decoration:none;">Settings</a>
        &nbsp;·&nbsp;
        <span>RenewalRadar</span>
      </p>
    </div>
    
  </div>
</body>
</html>`;
}
