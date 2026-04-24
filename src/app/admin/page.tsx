export const dynamic = 'force-dynamic';

import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminClientRow from './AdminClientRow';

export default async function AdminDashboard() {
  const session = cookies().get('admin_session')?.value;
  if (!session) redirect('/admin/login');

  const { data: sessionRow } = await supabaseAdmin.from('admin_sessions').select('admin_id').eq('token', session).is('revoked_at', null).single();
  if (!sessionRow) redirect('/admin/login');

  const [{ data: agencies }, { data: plans }, { data: payments }, { data: alerts }] = await Promise.all([
    supabaseAdmin.from('agencies').select('*, clients(count), subscription_plans(display_name, price_cents)').order('created_at', { ascending: false }),
    supabaseAdmin.from('subscription_plans').select('*'),
    supabaseAdmin.from('payments').select('*').order('created_at', { ascending: false }).limit(50),
    supabaseAdmin.from('security_alerts').select('*').is('acknowledged_at', null).order('created_at', { ascending: false }).limit(5),
  ]);

  const totalMRR = (agencies || []).filter(a => a.status === 'active').reduce((sum: number, a: any) => sum + (a.subscription_plans?.price_cents || 0), 0);
  const trialCount = (agencies || []).filter(a => a.status === 'trial').length;
  const activeCount = (agencies || []).filter(a => a.status === 'active').length;
  const bannedCount = (agencies || []).filter(a => a.is_banned).length;
  const pendingPayments = (payments || []).filter(p => p.status === 'pending').length;

  return (
    <div className="min-h-screen bg-[#050505] text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
      {/* Admin Nav */}
      <header className="border-b border-[#111] bg-[#0a0a0a] px-8 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <span className="text-[#ef4444] font-black text-sm tracking-widest">RENEWALRADAR ADMIN</span>
          <a href="/admin" className="text-xs text-[#555] hover:text-white">Dashboard</a>
          <a href="/admin/agencies" className="text-xs text-[#555] hover:text-white">Agencies</a>
          <a href="/admin/payments" className="text-xs text-[#555] hover:text-white">Payments</a>
          <a href="/admin/security" className="text-xs text-[#555] hover:text-white">Security</a>
          <a href="/admin/ip-whitelist" className="text-xs text-[#555] hover:text-white">IP Whitelist</a>
          <a href="/admin/2fa-setup" className="text-xs text-[#555] hover:text-white">2FA</a>
        </div>
        <form action="/api/admin/logout" method="POST">
          <button type="submit" className="text-xs text-[#ef4444] hover:text-red-300 font-bold">Logout</button>
        </form>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-8">

        {/* Critical alerts */}
        {alerts && alerts.length > 0 && (
          <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-xl p-4 mb-6">
            <p className="text-[#ef4444] font-bold text-sm mb-2">🚨 {alerts.length} unacknowledged security alert{alerts.length > 1 ? 's' : ''}</p>
            {alerts.slice(0, 2).map((a: any) => (
              <p key={a.id} className="text-xs text-[#888]">{a.alert_type} from {a.ip_address} — {new Date(a.created_at).toLocaleString()}</p>
            ))}
            <a href="/admin/security" className="text-xs text-[#ef4444] hover:underline mt-1 block">View all →</a>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Total Agencies', value: agencies?.length || 0, color: 'white' },
            { label: 'Active (Paid)', value: activeCount, color: '#22c55e' },
            { label: 'Trial', value: trialCount, color: '#eab308' },
            { label: 'MRR', value: `$${(totalMRR / 100).toLocaleString()}`, color: '#22c55e' },
            { label: 'Pending Payments', value: pendingPayments, color: pendingPayments > 0 ? '#ef4444' : 'white' },
          ].map(stat => (
            <div key={stat.label} className="bg-[#111] border border-[#1a1a1a] rounded-xl p-5">
              <p className="text-xs text-[#444] uppercase tracking-widest mb-2">{stat.label}</p>
              <p className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Agencies table */}
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[#1a1a1a] flex items-center justify-between">
            <h2 className="font-black text-base">All Agencies</h2>
            {bannedCount > 0 && <span className="text-xs text-[#ef4444] font-bold">{bannedCount} banned</span>}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1a1a1a]">
                {['Agency', 'Owner', 'Plan', 'Status', 'Clients', 'Created', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs text-[#444] uppercase tracking-widest font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#111]">
              {(agencies || []).map((agency: any) => (
                <AdminClientRow key={agency.id} agency={agency} plans={plans || []} />
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}