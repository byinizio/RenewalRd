// src/app/dashboard/page.tsx
export const dynamic = 'force-dynamic';

import { supabaseAdmin } from '@/lib/supabase';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import AddClientForm from './AddClientForm';
import AddAccountForm from './AddAccountForm';
import { RiskLevel } from '@/types';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { agency?: string; added?: string };
}) {
  const agencyId = searchParams.agency;
  if (!agencyId) notFound();

  const { data: agency } = await supabaseAdmin
    .from('agencies')
    .select('*, clients(*, social_accounts(*))')
    .eq('id', agencyId)
    .single();

  if (!agency) notFound();

  const { data: recentDigests } = await supabaseAdmin
    .from('daily_digests')
    .select('*')
    .eq('agency_id', agencyId)
    .order('sent_at', { ascending: false })
    .limit(10);

  const trialDaysLeft = Math.max(
    0,
    Math.ceil(
      (new Date(agency.trial_ends_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
  );

  const clients = agency.clients || [];
  const activeClients = clients.filter((c: any) => c.status === 'active' || c.status === 'at_risk');
  const atRiskClients = clients.filter((c: any) => c.risk_score >= 50);
  const criticalClients = clients.filter((c: any) => c.risk_score >= 75);
  const totalMRR = clients.reduce(
    (sum: number, c: any) => sum + (c.monthly_retainer_cents || 0),
    0
  );
  const atRiskMRR = atRiskClients.reduce(
    (sum: number, c: any) => sum + (c.monthly_retainer_cents || 0),
    0
  );

  // Sort clients by risk descending
  const sortedClients = [...clients].sort(
    (a: any, b: any) => b.risk_score - a.risk_score
  );

  return (
    <div
      className="min-h-screen bg-[#0a0a0a] text-white"
      style={{ fontFamily: 'Syne, sans-serif' }}
    >
      {/* ── Top Nav ── */}
      <header className="border-b border-[#1a1a1a] bg-[#0a0a0a]/95 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <RadarMini />
            <span className="font-black text-base">RenewalRadar</span>
            <span className="text-[#333] mx-2">/</span>
            <span className="text-[#888] text-sm truncate max-w-[200px]">{agency.name}</span>
          </div>
          <div className="flex items-center gap-3">
            {agency.status === 'trial' && (
              <div className="bg-[#eab308]/10 border border-[#eab308]/20 text-[#eab308] text-xs font-bold px-3 py-1.5 rounded-full">
                Trial: {trialDaysLeft}d left
              </div>
            )}
            <div className="text-xs text-[#555] font-mono hidden md:block">{agency.owner_email}</div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* ── Alert Banner (Critical Clients) ── */}
        {criticalClients.length > 0 && (
          <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-xl p-5 mb-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-[#ef4444] animate-blink"></div>
              <div>
                <p className="font-bold text-[#ef4444]">
                  {criticalClients.length} client{criticalClients.length > 1 ? 's' : ''} at CRITICAL churn risk
                </p>
                <p className="text-sm text-[#888] mt-0.5">
                  ${(atRiskMRR / 100).toLocaleString()} monthly revenue at stake — call today
                </p>
              </div>
            </div>
            <a
              href="#clients"
              className="bg-[#ef4444] text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-[#dc2626] transition-colors flex-shrink-0"
            >
              View Details
            </a>
          </div>
        )}

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <StatCard label="Total Clients" value={clients.length} />
          <StatCard
            label="At Risk"
            value={atRiskClients.length}
            highlight={atRiskClients.length > 0}
          />
          <StatCard
            label="Monthly Revenue"
            value={`$${(totalMRR / 100).toLocaleString()}`}
          />
          <StatCard
            label="Revenue at Risk"
            value={`$${(atRiskMRR / 100).toLocaleString()}`}
            highlight={atRiskMRR > 0}
          />
        </div>

        {/* ── Main Content: Clients + Sidebar ── */}
        <div className="grid lg:grid-cols-3 gap-8">

          {/* Client List */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-5" id="clients">
              <h2 className="font-black text-xl">Client Portfolio</h2>
              <span className="text-xs text-[#555]">{activeClients.length} active</span>
            </div>

            <div className="space-y-3 mb-8">
              {sortedClients.length === 0 ? (
                <div className="bg-[#161616] border border-dashed border-[#2a2a2a] rounded-xl p-12 text-center">
                  <p className="text-3xl mb-3">🏢</p>
                  <p className="font-bold mb-2">No clients yet</p>
                  <p className="text-sm text-[#666] mb-6">
                    Add your first client below to start monitoring churn risk.
                  </p>
                </div>
              ) : (
                sortedClients.map((client: any) => (
                  <ClientCard key={client.id} client={client} agencyId={agencyId} />
                ))
              )}
            </div>

            {/* Add Client Form */}
            <div id="add-client">
              <h3 className="font-black text-lg mb-4">Add Client</h3>
              <AddClientForm agencyId={agencyId} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Digests */}
            <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6">
              <h3 className="font-black text-base mb-4">Recent Reports</h3>
              {recentDigests && recentDigests.length > 0 ? (
                <div className="space-y-3">
                  {recentDigests.slice(0, 7).map((digest: any) => (
                    <Link
                      key={digest.id}
                      href={`/digest/${digest.id}`}
                      className="flex items-center justify-between group hover:bg-[#1a1a1a] -mx-3 px-3 py-2 rounded-lg transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium group-hover:text-white transition-colors">
                          {new Date(digest.sent_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                        <p className="text-xs text-[#555]">
                          {digest.clients_at_risk} at risk
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            digest.email_status === 'sent'
                              ? 'bg-[#22c55e]'
                              : 'bg-[#ef4444]'
                          }`}
                        ></span>
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 14 14"
                          fill="none"
                          className="text-[#444] group-hover:text-[#888] transition-colors"
                        >
                          <path
                            d="M2 7h10M8 3l4 4-4 4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#555] text-center py-4">
                  No reports yet.
                  <br />
                  First report arrives tomorrow at 8am.
                </p>
              )}
            </div>

            {/* Stats Summary */}
            <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6">
              <h3 className="font-black text-base mb-4">All-Time Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#888]">Clients Saved</span>
                  <span className="font-bold text-[#22c55e]">{agency.total_saved || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#888]">Clients Lost</span>
                  <span className="font-bold text-[#ef4444]">{agency.total_lost || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#888]">Save Rate</span>
                  <span className="font-bold">
                    {agency.total_saved + agency.total_lost > 0
                      ? `${Math.round((agency.total_saved / (agency.total_saved + agency.total_lost)) * 100)}%`
                      : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Manual Trigger */}
            <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6">
              <h3 className="font-black text-base mb-2">Run Analysis Now</h3>
              <p className="text-sm text-[#666] mb-4">
                Manually trigger risk analysis instead of waiting for the 8am cron.
              </p>
              <a
                href={`/api/cron/process?secret=${process.env.CRON_SECRET}`}
                target="_blank"
                className="block w-full bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#444] text-center text-sm font-bold py-2.5 rounded-lg transition-colors"
              >
                ▶ Trigger Analysis
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Sub-components ──

function RadarMini() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8" stroke="#ef4444" strokeWidth="1" strokeDasharray="2 2" opacity="0.5" />
      <circle cx="10" cy="10" r="4" stroke="#ef4444" strokeWidth="1" opacity="0.7" />
      <circle cx="10" cy="10" r="2" fill="#ef4444" />
    </svg>
  );
}

function StatCard({
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
        className={`text-2xl font-black ${
          highlight ? 'text-[#ef4444]' : 'text-white'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ClientCard({ client, agencyId }: { client: any; agencyId: string }) {
  const riskColors: Record<string, string> = {
    critical: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#22c55e',
  };

  const riskLevel: RiskLevel =
    client.risk_score >= 75
      ? 'critical'
      : client.risk_score >= 50
      ? 'high'
      : client.risk_score >= 25
      ? 'medium'
      : 'low';

  const color = riskColors[riskLevel];
  const platforms = (client.social_accounts || [])
    .filter((a: any) => a.is_active)
    .map((a: any) => a.platform);

  return (
    <div
      className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-5 hover:border-[#333] transition-colors"
      style={{ borderLeftColor: color, borderLeftWidth: '3px' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="font-black text-base truncate">{client.name}</h3>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{ background: color + '20', color }}
            >
              {riskLevel.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-[#555] mb-3">
            ${(client.monthly_retainer_cents / 100).toLocaleString()}/mo ·{' '}
            {client.industry}
            {platforms.length > 0 && (
              <> · {platforms.join(', ')}</>
            )}
          </p>

          {client.risk_reason && (
            <p className="text-xs text-[#888] bg-[#111] rounded-lg px-3 py-2">
              ⚠ {client.risk_reason.split(';')[0]}
            </p>
          )}
        </div>

        <div className="text-right flex-shrink-0">
          <p className="text-3xl font-black" style={{ color }}>
            {client.risk_score}
          </p>
          <p className="text-xs text-[#555]">/ 100</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[#1a1a1a]">
        <div className="flex-1">
          <div className="h-1.5 bg-[#111] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${client.risk_score}%`,
                background: color,
              }}
            ></div>
          </div>
        </div>
        <AddAccountForm clientId={client.id} agencyId={agencyId} />
      </div>
    </div>
  );
}
