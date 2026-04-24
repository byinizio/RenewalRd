// src/app/digest/[id]/page.tsx
export const dynamic = 'force-dynamic';

import { supabaseAdmin } from '@/lib/supabase';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import FeedbackButtons from './FeedbackButtons';
import { ClientAnalysisResult, RiskLevel } from '@/types';

export default async function DigestPage({
  params,
}: {
  params: { id: string };
}) {
  // Support 'latest' alias — redirect to most recent digest for agency
  let digestId = params.id;

  const { data: digest } = await supabaseAdmin
    .from('daily_digests')
    .select('*, agencies(*)')
    .eq('id', digestId)
    .single();

  if (!digest) notFound();

  const agency = digest.agencies;
  const analyses: ClientAnalysisResult[] = digest.full_analysis?.clients || [];

  const sentDate = new Date(digest.sent_at).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const criticalCount = analyses.filter((a) => a.risk.level === 'critical').length;
  const highCount = analyses.filter((a) => a.risk.level === 'high').length;

  return (
    <div
      className="min-h-screen bg-[#0a0a0a] text-white"
      style={{ fontFamily: 'Syne, sans-serif' }}
    >
      {/* Header */}
      <header className="border-b border-[#1a1a1a] bg-[#0a0a0a]/95 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard?agency=${agency?.id}`}
              className="text-[#555] hover:text-white text-sm transition-colors flex items-center gap-1.5"
            >
              ← Dashboard
            </Link>
          </div>
          <span className="text-xs text-[#555] font-mono">{sentDate}</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">

        {/* Title */}
        <div className="mb-10">
          <p className="text-xs text-[#ef4444] font-bold tracking-widest uppercase mb-3">
            Daily Report · {agency?.name}
          </p>
          <h1 className="text-4xl font-black tracking-tight mb-4">
            {criticalCount > 0
              ? `${criticalCount} client${criticalCount > 1 ? 's' : ''} need immediate attention.`
              : highCount > 0
              ? `${highCount} client${highCount > 1 ? 's' : ''} showing churn signals.`
              : 'All clients are stable.'}
          </h1>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            <SummaryCard label="Clients Monitored" value={analyses.length} />
            <SummaryCard
              label="At Risk"
              value={digest.clients_at_risk}
              highlight={digest.clients_at_risk > 0}
            />
            <SummaryCard
              label="Revenue Exposed"
              value={`$${(digest.revenue_at_risk_cents / 100).toLocaleString()}`}
              highlight={digest.revenue_at_risk_cents > 0}
            />
          </div>
        </div>

        {/* Client analyses */}
        <div className="space-y-8">
          {analyses.map(({ client, risk, metrics, analysis }) => {
            const riskColors: Record<RiskLevel, { bg: string; border: string; badge: string; text: string }> = {
              critical: { bg: 'rgba(239,68,68,0.05)', border: '#ef4444', badge: '#ef4444', text: '#fca5a5' },
              high: { bg: 'rgba(249,115,22,0.05)', border: '#f97316', badge: '#f97316', text: '#fdba74' },
              medium: { bg: 'rgba(234,179,8,0.05)', border: '#eab308', badge: '#eab308', text: '#fde047' },
              low: { bg: 'rgba(34,197,94,0.05)', border: '#22c55e', badge: '#22c55e', text: '#86efac' },
            };
            const colors = riskColors[risk.level];

            return (
              <div
                key={client.id}
                className="border rounded-2xl overflow-hidden"
                style={{
                  background: colors.bg,
                  borderColor: colors.border + '40',
                  borderLeftColor: colors.border,
                  borderLeftWidth: '4px',
                }}
              >
                {/* Client header */}
                <div className="px-7 pt-7 pb-5 border-b" style={{ borderColor: colors.border + '20' }}>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h2 className="text-2xl font-black">{client.name}</h2>
                      <p className="text-sm text-[#888] mt-1">
                        {client.industry} ·{' '}
                        <span className="font-mono">
                          ${(client.monthly_retainer_cents / 100).toLocaleString()}/mo
                        </span>
                        {client.contract_end_date && (
                          <> · Contract ends {new Date(client.contract_end_date).toLocaleDateString()}</>
                        )}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-5xl font-black" style={{ color: colors.badge }}>
                        {risk.score}
                      </p>
                      <span
                        className="text-xs font-black px-2.5 py-1 rounded-full mt-1 inline-block"
                        style={{ background: colors.badge + '20', color: colors.badge }}
                      >
                        {risk.level.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Metrics row */}
                  <div className="grid grid-cols-4 gap-3">
                    <MetricBox
                      label="Followers"
                      value={metrics.followers.toLocaleString()}
                    />
                    <MetricBox
                      label="Impressions"
                      value={metrics.impressions.toLocaleString()}
                    />
                    <MetricBox
                      label="Engagement"
                      value={`${(metrics.engagement_rate * 100).toFixed(2)}%`}
                    />
                    <MetricBox label="Posts" value={metrics.posts_count} />
                  </div>
                </div>

                {/* Risk factors */}
                {risk.factors.length > 0 && (
                  <div className="px-7 py-4 border-b" style={{ borderColor: colors.border + '20' }}>
                    <p className="text-xs font-bold tracking-widest uppercase text-[#666] mb-3">
                      Risk Signals
                    </p>
                    <div className="space-y-1.5">
                      {risk.factors.map((factor, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <span style={{ color: colors.badge }} className="text-sm mt-0.5">▸</span>
                          <p className="text-sm" style={{ color: colors.text }}>
                            {factor}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Analysis */}
                {analysis ? (
                  <div className="px-7 py-6 space-y-4">
                    <AnalysisBlock
                      icon="✅"
                      label="Keep Doing"
                      content={analysis.keep_doing}
                      colorClass="text-[#22c55e]"
                      bgClass="bg-[#22c55e]/5 border-[#22c55e]/20"
                    />
                    <AnalysisBlock
                      icon="❌"
                      label="Stop Doing"
                      content={analysis.stop_doing}
                      colorClass="text-[#ef4444]"
                      bgClass="bg-[#ef4444]/5 border-[#ef4444]/20"
                    />
                    <AnalysisBlock
                      icon="📞"
                      label="Intervention Script"
                      content={analysis.intervention_script}
                      colorClass="text-[#60a5fa]"
                      bgClass="bg-[#3b82f6]/5 border-[#3b82f6]/20"
                      mono
                    />
                    {analysis.upsell_opportunity && (
                      <AnalysisBlock
                        icon="💰"
                        label="Upsell Opportunity"
                        content={analysis.upsell_opportunity}
                        colorClass="text-[#a78bfa]"
                        bgClass="bg-[#8b5cf6]/5 border-[#8b5cf6]/20"
                      />
                    )}
                  </div>
                ) : (
                  <div className="px-7 py-5">
                    <p className="text-sm text-[#555]">
                      {risk.score < 25
                        ? '✅ This client is healthy — no AI analysis needed.'
                        : '⏳ AI analysis generating...'}
                    </p>
                  </div>
                )}

                {/* Feedback */}
                <div className="px-7 pb-7">
                  <FeedbackButtons
                    clientId={client.id}
                    digestId={digest.id}
                    clientName={client.name}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {analyses.length === 0 && (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">📊</p>
            <h2 className="text-xl font-black mb-2">No analysis data yet</h2>
            <p className="text-[#666] mb-6">
              This digest doesn't have any client data. Run the analysis to populate it.
            </p>
            <Link
              href={`/dashboard?agency=${agency?.id}`}
              className="btn-primary"
            >
              Back to Dashboard
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Sub-components ──

function SummaryCard({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-5 border ${
        highlight
          ? 'bg-[#ef4444]/5 border-[#ef4444]/20'
          : 'bg-[#161616] border-[#2a2a2a]'
      }`}
    >
      <p className="text-xs text-[#666] uppercase tracking-widest mb-2">{label}</p>
      <p
        className={`text-3xl font-black ${
          highlight ? 'text-[#ef4444]' : 'text-white'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function MetricBox({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-[#0a0a0a]/60 rounded-xl p-3 text-center">
      <p className="text-xs text-[#555] uppercase tracking-wider mb-1">{label}</p>
      <p className="font-black text-base">{value}</p>
    </div>
  );
}

function AnalysisBlock({
  icon,
  label,
  content,
  colorClass,
  bgClass,
  mono = false,
}: {
  icon: string;
  label: string;
  content: string;
  colorClass: string;
  bgClass: string;
  mono?: boolean;
}) {
  return (
    <div className={`border rounded-xl p-5 ${bgClass}`}>
      <p className={`text-xs font-black tracking-widest uppercase mb-3 flex items-center gap-2 ${colorClass}`}>
        <span>{icon}</span>
        {label}
      </p>
      <p
        className={`text-sm leading-relaxed text-[#ccc] ${
          mono ? 'font-mono bg-[#000]/30 rounded-lg p-3' : ''
        }`}
      >
        {mono ? `"${content}"` : content}
      </p>
    </div>
  );
}
