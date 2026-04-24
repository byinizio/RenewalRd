// src/lib/openai.ts
// GPT-4o-mini analysis — ~$0.0006 per client analysis
// Generates: keep doing / stop doing / intervention script / upsell

import { AIAnalysis, Client, ClientMetricsData, HistoricalMetrics, RiskResult } from '@/types';

export async function generateClientAnalysis(
  client: Client,
  current: ClientMetricsData,
  history: HistoricalMetrics,
  risk: RiskResult
): Promise<AIAnalysis | null> {
  try {
    const prompt = buildAnalysisPrompt(client, current, history, risk);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a client retention strategist for social media agencies. You write data-driven, actionable analysis that helps agency account managers save clients. Every claim must reference specific numbers. Be direct, not corporate.',
          },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 700,
        temperature: 0.65,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('OpenAI error:', err);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as AIAnalysis;
    return parsed;
  } catch (err) {
    console.error('generateClientAnalysis failed:', err);
    return null;
  }
}

function buildAnalysisPrompt(
  client: Client,
  current: ClientMetricsData,
  history: HistoricalMetrics,
  risk: RiskResult
): string {
  const retainer = (client.monthly_retainer_cents / 100).toFixed(0);
  const currentEng = (current.engagement_rate * 100).toFixed(2);
  const histEng = (history.engagement_7d_avg * 100).toFixed(2);

  return `CLIENT RETENTION ANALYSIS REQUEST

CLIENT: ${client.name}
INDUSTRY: ${client.industry}
MONTHLY RETAINER: $${retainer}
RISK SCORE: ${risk.score}/100 (${risk.level.toUpperCase()})
RISK SIGNALS: ${risk.factors.join(' | ')}

CURRENT WEEK METRICS:
• Followers: ${current.followers.toLocaleString()}
• Impressions: ${current.impressions.toLocaleString()}
• Engagement Rate: ${currentEng}%
• Posts Published: ${current.posts_count}
• Link Clicks: ${current.clicks.toLocaleString()}

7-DAY HISTORICAL BASELINE:
• Avg Followers: ${history.followers_7d_avg.toLocaleString()}
• Avg Impressions: ${history.impressions_7d_avg.toLocaleString()}
• Avg Engagement: ${histEng}%
• Avg Posts/Week: ${history.posts_7d_avg.toFixed(1)}

Respond ONLY with valid JSON in this exact schema:
{
  "keep_doing": "One specific tactic that's working, with a concrete number as evidence. Max 2 sentences.",
  "stop_doing": "One specific tactic wasting their budget or hurting performance, with evidence. Max 2 sentences.",
  "intervention_script": "Exact words for the account manager to say when they call this client. 2-3 sentences, natural and confident — not salesy. Reference a specific number.",
  "upsell_opportunity": "If ANY metric is trending up OR the risk is low, suggest one specific add-on service the agency could pitch. Return null if risk is critical and there's no positive signal."
}

Rules:
- If risk is CRITICAL: intervention_script must create urgency without panic
- If risk is LOW: intervention_script is a check-in that opens an upsell conversation
- Reference specific numbers from the data in EVERY field
- Write like a smart colleague, not a consultant`;
}
