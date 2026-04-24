#!/usr/bin/env node
// scripts/process-clients.js
// ============================================
// RENEWALRADAR — MAIN DAILY ANALYSIS ENGINE
// Runs via GitHub Actions every day at 8am UTC
// Can also be triggered manually
// ============================================

const fetch = require('node-fetch');

// ── Config ──
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TWITTER_BEARER = process.env.TWITTER_BEARER_TOKEN;
const APP_URL = process.env.APP_URL || 'https://renewalradar.vercel.app';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// ============================================
// SUPABASE HELPERS
// ============================================

async function sb(path, options = {}) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase [${res.status}] ${path}: ${text}`);
  }

  return res.status === 204 ? null : res.json();
}

async function sbInsert(table, data, returning = false) {
  return sb(table, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      Prefer: returning ? 'return=representation' : 'return=minimal',
    },
  });
}

async function sbUpdate(table, id, data) {
  return sb(`${table}?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
    headers: { Prefer: 'return=minimal' },
  });
}

// ============================================
// EMAIL
// ============================================

async function sendEmail(to, subject, html) {
  if (!RESEND_API_KEY) {
    console.warn('⚠️  RESEND_API_KEY not set, skipping email');
    return null;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'RenewalRadar <onboarding@resend.dev>',
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    console.error(`Resend error: ${await res.text()}`);
    return null;
  }
  return res.json();
}

// ============================================
// SOCIAL API PULLERS
// ============================================

async function getTwitterMetrics(handle) {
  if (!TWITTER_BEARER) return null;

  try {
    const userRes = await fetch(
      `https://api.twitter.com/2/users/by/username/${handle}?user.fields=public_metrics`,
      { headers: { Authorization: `Bearer ${TWITTER_BEARER}` } }
    );

    if (!userRes.ok) {
      if (userRes.status === 429) {
        console.warn(`⏱  Twitter rate limited for @${handle}`);
        return null;
      }
      return null;
    }

    const userData = await userRes.json();
    const userId = userData.data?.id;
    if (!userId) return null;

    const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const tweetsRes = await fetch(
      `https://api.twitter.com/2/users/${userId}/tweets?max_results=100&tweet.fields=public_metrics&start_time=${start}`,
      { headers: { Authorization: `Bearer ${TWITTER_BEARER}` } }
    );

    const followerCount = userData.data.public_metrics?.followers_count || 0;

    if (!tweetsRes.ok) {
      return { followers: followerCount, impressions: 0, engagement_rate: 0, clicks: 0, posts_count: 0 };
    }

    const tweetsData = await tweetsRes.json();
    const tweets = tweetsData.data || [];

    const impressions = tweets.reduce((s, t) => s + (t.public_metrics?.impression_count || 0), 0);
    const likes = tweets.reduce((s, t) => s + (t.public_metrics?.like_count || 0), 0);
    const retweets = tweets.reduce((s, t) => s + (t.public_metrics?.retweet_count || 0), 0);
    const replies = tweets.reduce((s, t) => s + (t.public_metrics?.reply_count || 0), 0);
    const engagements = likes + retweets + replies;

    return {
      followers: followerCount,
      impressions,
      engagement_rate: impressions > 0 ? engagements / impressions : 0,
      clicks: 0,
      posts_count: tweets.length,
    };
  } catch (err) {
    console.error(`Twitter error @${handle}:`, err.message);
    return null;
  }
}

// ============================================
// RISK SCORING
// ============================================

function calculateRiskScore(current, history, daysSinceLastPost, daysUntilContractEnd) {
  let score = 0;
  const factors = [];

  // 1. Engagement drop
  if (history.engagement_7d_avg > 0) {
    const change = (current.engagement_rate - history.engagement_7d_avg) / history.engagement_7d_avg;
    if (change < -0.30) {
      score += 25;
      factors.push(`Engagement crashed ${Math.abs(Math.round(change * 100))}% vs last week`);
    } else if (change < -0.15) {
      score += 15;
      factors.push(`Engagement down ${Math.abs(Math.round(change * 100))}% from baseline`);
    }
  }

  // 2. Impressions crash
  if (history.impressions_7d_avg > 0) {
    const change = (current.impressions - history.impressions_7d_avg) / history.impressions_7d_avg;
    if (change < -0.40) {
      score += 20;
      factors.push(`Impressions fell ${Math.abs(Math.round(change * 100))}%`);
    } else if (change < -0.20) {
      score += 10;
      factors.push(`Impressions down ${Math.abs(Math.round(change * 100))}%`);
    }
  }

  // 3. Follower loss
  if (history.followers_7d_avg > 0) {
    const change = (current.followers - history.followers_7d_avg) / history.followers_7d_avg;
    if (change < -0.10) {
      score += 15;
      factors.push(`Audience shrinking: ${Math.abs(Math.round(change * 100))}% follower loss`);
    }
  }

  // 4. Content silence
  if (daysSinceLastPost > 7) {
    score += 20;
    factors.push(`Content blackout: no posts in ${daysSinceLastPost} days`);
  } else if (daysSinceLastPost > 3) {
    score += 10;
    factors.push(`Content gap: ${daysSinceLastPost} days since last post`);
  }

  // 5. Post frequency drop
  if (history.posts_7d_avg > 1 && current.posts_count < history.posts_7d_avg * 0.5) {
    score += 10;
    factors.push(`Posting frequency halved (avg: ${history.posts_7d_avg.toFixed(1)}/wk)`);
  }

  // 6. Contract ending soon
  if (daysUntilContractEnd !== undefined && daysUntilContractEnd > 0 && daysUntilContractEnd <= 30) {
    score += 15;
    factors.push(`Contract renews in ${daysUntilContractEnd} days`);
  }

  score = Math.min(100, Math.round(score));
  let level = 'low';
  if (score >= 75) level = 'critical';
  else if (score >= 50) level = 'high';
  else if (score >= 25) level = 'medium';

  return { score, level, factors };
}

// ============================================
// AI ANALYSIS (GPT-4o-mini, ~$0.0006/call)
// ============================================

async function generateAnalysis(client, current, history, risk) {
  if (!OPENAI_API_KEY) return null;

  const prompt = `CLIENT RETENTION ANALYSIS

CLIENT: ${client.name}
INDUSTRY: ${client.industry}
MONTHLY RETAINER: $${(client.monthly_retainer_cents / 100).toFixed(0)}
RISK SCORE: ${risk.score}/100 (${risk.level.toUpperCase()})
RISK SIGNALS: ${risk.factors.join(' | ')}

CURRENT WEEK:
- Followers: ${current.followers.toLocaleString()}
- Impressions: ${current.impressions.toLocaleString()}
- Engagement: ${(current.engagement_rate * 100).toFixed(2)}%
- Posts: ${current.posts_count}

7-DAY BASELINE:
- Avg Impressions: ${history.impressions_7d_avg.toLocaleString()}
- Avg Engagement: ${(history.engagement_7d_avg * 100).toFixed(2)}%
- Avg Posts/Week: ${history.posts_7d_avg.toFixed(1)}

Return ONLY valid JSON (no markdown, no explanation):
{
  "keep_doing": "one tactic that's clearly working with a specific number as evidence. max 2 sentences.",
  "stop_doing": "one tactic wasting budget with evidence. max 2 sentences.",
  "intervention_script": "exact words for the account manager to say on the phone. 2-3 sentences. natural, confident, not salesy. cite a specific number.",
  "upsell_opportunity": "one add-on service to pitch if metrics trending up or risk is low. null if risk is critical with no positive signals."
}`;

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a client retention expert for social media agencies. Every claim you make references specific data. You write like a smart colleague, not a consultant. Return only valid JSON.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 600,
        temperature: 0.6,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    return content ? JSON.parse(content) : null;
  } catch (err) {
    console.error('OpenAI error:', err.message);
    return null;
  }
}

// ============================================
// EMAIL BUILDER
// ============================================

function buildDigestEmail(agency, analyses, atRisk, revenueAtRisk, now) {
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const riskBorderColor = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' };
  const riskLabel = { critical: '🚨 CRITICAL', high: '⚠ HIGH', medium: '🟡 MEDIUM', low: '✅ STABLE' };

  const rows = analyses.slice(0, 8).map(({ client, risk, metrics }) => {
    const color = riskBorderColor[risk.level];
    return `
    <tr>
      <td style="padding:12px 20px;border-bottom:1px solid #111;">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;"></div>
          <span style="font-weight:700;font-size:14px;color:#f5f5f5;">${client.name}</span>
        </div>
        <div style="font-size:12px;color:#666;margin-top:2px;padding-left:16px;">${risk.factors[0] || 'Monitoring...'}</div>
      </td>
      <td style="padding:12px 20px;border-bottom:1px solid #111;text-align:center;">
        <span style="background:${color}22;color:${color};padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;">${riskLabel[risk.level]}</span>
      </td>
      <td style="padding:12px 20px;border-bottom:1px solid #111;text-align:right;font-weight:700;font-size:14px;color:${color};">${risk.score}/100</td>
      <td style="padding:12px 20px;border-bottom:1px solid #111;text-align:right;color:#666;font-size:13px;">$${(client.monthly_retainer_cents / 100).toLocaleString()}/mo</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:system-ui,-apple-system,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">

  <div style="background:#111;border-radius:12px 12px 0 0;padding:24px 28px;border-bottom:1px solid #1a1a1a;">
    <span style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#ef4444;font-weight:700;">RENEWALRADAR</span>
    <h2 style="margin:6px 0 0;font-size:20px;font-weight:800;color:#f5f5f5;">Good morning, ${agency.name}</h2>
    <p style="margin:4px 0 0;font-size:12px;color:#555;">${dateStr}</p>
  </div>

  <div style="background:#111;display:flex;border-bottom:1px solid #1a1a1a;">
    <div style="flex:1;text-align:center;padding:16px;border-right:1px solid #1a1a1a;">
      <p style="margin:0;font-size:24px;font-weight:800;color:#fff;">${analyses.length}</p>
      <p style="margin:4px 0 0;font-size:10px;color:#555;text-transform:uppercase;letter-spacing:0.1em;">Monitored</p>
    </div>
    <div style="flex:1;text-align:center;padding:16px;border-right:1px solid #1a1a1a;">
      <p style="margin:0;font-size:24px;font-weight:800;color:${atRisk > 0 ? '#ef4444' : '#22c55e'};">${atRisk}</p>
      <p style="margin:4px 0 0;font-size:10px;color:#555;text-transform:uppercase;letter-spacing:0.1em;">At Risk</p>
    </div>
    <div style="flex:1;text-align:center;padding:16px;">
      <p style="margin:0;font-size:24px;font-weight:800;color:${revenueAtRisk > 0 ? '#ef4444' : '#22c55e'};">$${(revenueAtRisk / 100).toLocaleString()}</p>
      <p style="margin:4px 0 0;font-size:10px;color:#555;text-transform:uppercase;letter-spacing:0.1em;">Revenue Exposed</p>
    </div>
  </div>

  <div style="background:#0d0d0d;border-radius:0 0 12px 12px;overflow:hidden;margin-bottom:16px;">
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#111;">
          <th style="padding:10px 20px;text-align:left;font-size:10px;color:#444;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;border-bottom:1px solid #1a1a1a;">Client</th>
          <th style="padding:10px 20px;text-align:center;font-size:10px;color:#444;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;border-bottom:1px solid #1a1a1a;">Status</th>
          <th style="padding:10px 20px;text-align:right;font-size:10px;color:#444;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;border-bottom:1px solid #1a1a1a;">Score</th>
          <th style="padding:10px 20px;text-align:right;font-size:10px;color:#444;text-transform:uppercase;letter-spacing:0.1em;font-weight:600;border-bottom:1px solid #1a1a1a;">Retainer</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>

  <div style="text-align:center;margin:20px 0;">
    <a href="${APP_URL}/digest/latest?agency=${agency.id}"
       style="display:inline-block;background:#ef4444;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:800;font-size:15px;">
      📖 Read Full Analysis + Scripts →
    </a>
    <p style="margin:10px 0 0;font-size:12px;color:#444;">Intervention scripts · Keep/stop doing · Upsell opportunities</p>
  </div>

  <div style="text-align:center;padding-top:16px;border-top:1px solid #1a1a1a;">
    <p style="font-size:11px;color:#333;margin:0;">
      <a href="${APP_URL}/dashboard?agency=${agency.id}" style="color:#555;text-decoration:none;">Dashboard</a>
      &nbsp;·&nbsp;RenewalRadar
    </p>
  </div>

</div>
</body></html>`;
}

function getSubject(criticalCount, highCount, totalCount) {
  if (criticalCount > 0) return `🚨 ${criticalCount} client${criticalCount > 1 ? 's' : ''} at CRITICAL churn risk — act today`;
  if (highCount > 0) return `⚠️ ${highCount} client${highCount > 1 ? 's' : ''} showing churn signals`;
  return `✅ All ${totalCount} clients stable — RenewalRadar daily report`;
}

// ============================================
// MAIN PROCESSOR
// ============================================

async function processClients() {
  console.log('🚀 RenewalRadar — starting daily analysis...');
  const now = new Date();
  let agenciesProcessed = 0, emailsSent = 0;
  const errors = [];

  // Fetch all active agencies + clients + accounts
  const agencies = await sb(
    'agencies?status=in.(trial,active)&select=*,clients(*,social_accounts(*))'
  );

  if (!agencies || agencies.length === 0) {
    console.log('📭 No active agencies');
    return;
  }

  console.log(`📊 Processing ${agencies.length} agencies`);

  for (const agency of agencies) {
    try {
      // Skip expired trials
      if (agency.status === 'trial' && new Date(agency.trial_ends_at) < now) {
        console.log(`⏭  Trial expired: ${agency.name}`);
        continue;
      }

      const analyses = [];
      let totalAtRisk = 0, totalRevenueAtRisk = 0;

      const activeClients = (agency.clients || []).filter(
        c => c.status === 'active' || c.status === 'at_risk'
      );

      for (const client of activeClients) {
        try {
          // ── Pull social metrics ──
          let aggregated = { followers: 0, impressions: 0, engagement_rate: 0, clicks: 0, posts_count: 0 };
          let accountCount = 0;

          for (const account of (client.social_accounts || []).filter(a => a.is_active)) {
            let metrics = null;
            if (account.platform === 'twitter') {
              metrics = await getTwitterMetrics(account.account_handle);
            }
            // LinkedIn/Instagram: implement when tokens available
            if (metrics) {
              aggregated.followers += metrics.followers;
              aggregated.impressions += metrics.impressions;
              aggregated.engagement_rate += metrics.engagement_rate;
              aggregated.clicks += metrics.clicks;
              aggregated.posts_count += metrics.posts_count;
              accountCount++;
            }
          }

          if (accountCount > 1) {
            aggregated.engagement_rate /= accountCount;
          }

          // ── Save today's metrics ──
          await sbInsert('daily_metrics', {
            client_id: client.id,
            platform: 'aggregated',
            ...aggregated,
          });

          // ── Get historical averages ──
          const historyRows = await sb(
            `daily_metrics?client_id=eq.${client.id}&order=logged_at.desc&limit=8`
          );
          const rows = (historyRows || []).slice(1); // skip today
          const n = rows.length || 1;

          const history = {
            followers_7d_avg: rows.reduce((s, m) => s + m.followers, 0) / n,
            impressions_7d_avg: rows.reduce((s, m) => s + m.impressions, 0) / n,
            engagement_7d_avg: rows.reduce((s, m) => s + m.engagement_rate, 0) / n,
            posts_7d_avg: rows.reduce((s, m) => s + m.posts_count, 0) / n,
          };

          // Days since last post (simplified)
          const daysSinceLastPost = aggregated.posts_count > 0 ? 0 :
            (rows.length > 0 && rows.every(r => r.posts_count === 0) ? 7 : 4);

          // Days until contract end
          let daysUntilContractEnd;
          if (client.contract_end_date) {
            daysUntilContractEnd = Math.ceil(
              (new Date(client.contract_end_date) - now) / (1000 * 60 * 60 * 24)
            );
          }

          // ── Calculate risk ──
          const risk = calculateRiskScore(aggregated, history, daysSinceLastPost, daysUntilContractEnd);

          // ── Save risk snapshot ──
          await sbInsert('risk_snapshots', {
            client_id: client.id,
            risk_score: risk.score,
            risk_level: risk.level,
            risk_factors: risk.factors,
            metrics_snapshot: aggregated,
          });

          // ── Update client ──
          await sb(`clients?id=eq.${client.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              risk_score: risk.score,
              risk_reason: risk.factors.join('; ') || null,
              status: risk.score >= 50 ? 'at_risk' : 'active',
            }),
            headers: { Prefer: 'return=minimal' },
          });

          // ── AI analysis for at-risk clients ──
          let analysis = null;
          if (risk.score >= 25) {
            analysis = await generateAnalysis(client, aggregated, history, risk);
            totalAtRisk++;
            totalRevenueAtRisk += client.monthly_retainer_cents;
          }

          analyses.push({ client, risk, metrics: aggregated, analysis });
          console.log(`  ✓ ${client.name}: risk ${risk.score}/100 (${risk.level})`);

        } catch (clientErr) {
          console.error(`  ✗ ${client.name}:`, clientErr.message);
          errors.push(`${client.name}: ${clientErr.message}`);
        }
      }

      // Sort by risk descending
      analyses.sort((a, b) => b.risk.score - a.risk.score);

      // ── Build & send email ──
      const criticalClients = analyses.filter(c => c.risk.level === 'critical');
      const highClients = analyses.filter(c => c.risk.level === 'high');
      const subject = getSubject(criticalClients.length, highClients.length, analyses.length);
      const html = buildDigestEmail(agency, analyses, totalAtRisk, totalRevenueAtRisk, now);
      const emailResult = await sendEmail(agency.owner_email, subject, html);

      // ── Save digest ──
      await sbInsert('daily_digests', {
        agency_id: agency.id,
        email_status: emailResult ? 'sent' : 'failed',
        email_subject: subject,
        short_summary: `${totalAtRisk} clients at risk, $${(totalRevenueAtRisk / 100).toFixed(0)} revenue exposed`,
        full_analysis: { clients: analyses },
        clients_at_risk: totalAtRisk,
        revenue_at_risk_cents: totalRevenueAtRisk,
      });

      agenciesProcessed++;
      if (emailResult) emailsSent++;
      console.log(`✅ ${agency.name}: ${totalAtRisk} at risk · email ${emailResult ? 'sent' : 'FAILED'}`);

    } catch (agencyErr) {
      console.error(`❌ ${agency.name}:`, agencyErr.message);
      errors.push(`${agency.name}: ${agencyErr.message}`);
    }
  }

  console.log(`\n🏁 Done — ${agenciesProcessed} agencies processed, ${emailsSent} emails sent`);
  if (errors.length > 0) {
    console.log('⚠️  Errors:', errors);
  }
}

// ── Keep-alive ping ──
async function keepAlive() {
  try {
    await sb('keep_alive', {
      method: 'POST',
      body: JSON.stringify({ id: 1, last_ping: new Date().toISOString() }),
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    });
    console.log('💓 Supabase keep-alive ping sent');
  } catch (err) {
    console.warn('Keep-alive ping failed:', err.message);
  }
}

// ── Entry point ──
const command = process.argv[2];

if (command === 'keep-alive') {
  keepAlive().then(() => process.exit(0)).catch(() => process.exit(1));
} else {
  keepAlive().then(() => processClients())
    .then(() => process.exit(0))
    .catch(err => {
      console.error('💥 Fatal:', err);
      process.exit(1);
    });
}
