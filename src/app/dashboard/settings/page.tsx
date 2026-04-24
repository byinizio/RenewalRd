'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const PLANS = [
  { name: 'starter',    label: 'Starter',    price: '$49/mo', clients: '5 clients',      features: ['Daily risk scores', '7-day history', 'Email digest'] },
  { name: 'growth',     label: 'Growth',     price: '$79/mo', clients: '20 clients',     features: ['Everything in Starter', 'AI intervention scripts', 'Upsell signals', '14-day history'] },
  { name: 'agency_pro', label: 'Agency Pro', price: '$149/mo', clients: 'Unlimited',     features: ['Everything in Growth', 'White-label email', '30-day history', 'Priority support'] },
];

export default function AgencySettings({ searchParams }: { searchParams: { agency?: string } }) {
  const agencyId = searchParams.agency;
  const [agency, setAgency]         = useState<any>(null);
  const [loading, setLoading]       = useState(false);
  const [message, setMessage]       = useState('');
  const [activeTab, setActiveTab]   = useState<'profile' | 'alerts' | 'subscription' | 'danger'>('profile');

  // Form states
  const [name, setName]             = useState('');
  const [timezone, setTimezone]     = useState('America/New_York');
  const [sendTime, setSendTime]     = useState('08:00');
  const [phone, setPhone]           = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPw, setConfirmPw]   = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');

  useEffect(() => { if (agencyId) loadAgency(); }, [agencyId]);

  const loadAgency = async () => {
    const { data } = await supabase.from('agencies').select('*, subscription_plans(*)').eq('id', agencyId!).single();
    if (data) {
      setAgency(data);
      setName(data.name);
      setTimezone(data.timezone);
      setSendTime(data.send_time?.slice(0, 5) || '08:00');
      setPhone(data.owner_phone || '');
      setSelectedPlan(data.plan_name || 'starter');
    }
  };

  const saveProfile = async () => {
    setLoading(true);
    const { error } = await supabase.from('agencies').update({ name, timezone, send_time: `${sendTime}:00`, owner_phone: phone }).eq('id', agencyId!);
    setMessage(error ? error.message : '✅ Profile saved');
    setLoading(false);
  };

  const changePassword = async () => {
    if (newPassword !== confirmPw) return setMessage('Passwords do not match');
    if (newPassword.length < 8) return setMessage('Min 8 characters');
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setMessage(error ? error.message : '✅ Password updated');
    setNewPassword(''); setConfirmPw('');
    setLoading(false);
  };

  const requestPlanChange = async (planName: string) => {
    const plan = PLANS.find(p => p.name === planName);
    if (!plan) return;
    const ref = `RR-${agencyId!.slice(0, 8).toUpperCase()}`;
    const subject = `RenewalRadar Plan Change Request: ${plan.label}`;
    const body = `Hi, I'd like to upgrade to the ${plan.label} plan (${plan.price}). My account reference: ${ref}`;
    window.open(`mailto:your@email.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    setMessage(`📧 Email opened. Send it and your plan will be upgraded once payment is confirmed.`);
  };

  const cancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel? Your account will revert to trial mode.')) return;
    const res = await fetch('/api/subscription/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agency_id: agencyId }) });
    if (res.ok) { setMessage('Cancellation requested. You\'ll retain access until your period ends.'); loadAgency(); }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  if (!agency) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center"><div className="text-white">Loading...</div></div>;

  const tabs = ['profile', 'alerts', 'subscription', 'danger'] as const;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
      <header className="border-b border-[#1a1a1a] bg-[#0a0a0a]/95 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href={`/dashboard?agency=${agencyId}`} className="text-[#555] hover:text-white text-sm">← Dashboard</a>
            <span className="text-[#333]">/</span>
            <span className="text-sm">Settings</span>
          </div>
          <button onClick={logout} className="text-xs text-[#555] hover:text-[#ef4444] font-bold">Logout</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-black mb-8">Account Settings</h1>

        {message && (
          <div className={`px-4 py-3 rounded-xl mb-6 text-sm border ${message.startsWith('✅') ? 'bg-[#22c55e]/10 border-[#22c55e]/20 text-[#22c55e]' : 'bg-[#ef4444]/10 border-[#ef4444]/20 text-[#ef4444]'}`}>
            {message}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-[#161616] p-1 rounded-xl border border-[#2a2a2a] mb-8 w-fit">
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${activeTab === tab ? 'bg-[#ef4444] text-white' : 'text-[#555] hover:text-white'}`}>
              {tab === 'danger' ? '⚠ Danger Zone' : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="bg-[#161616] border border-[#2a2a2a] rounded-2xl p-6">
              <h2 className="font-black text-lg mb-4">Agency Profile</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold tracking-widest uppercase text-[#666] mb-2">Agency Name</label>
                  <input className="input-dark" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold tracking-widest uppercase text-[#666] mb-2">Phone (for SMS alerts)</label>
                  <input className="input-dark" value={phone} onChange={e => setPhone(e.target.value)} placeholder="5551234567" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold tracking-widest uppercase text-[#666] mb-2">Timezone</label>
                    <select className="input-dark" value={timezone} onChange={e => setTimezone(e.target.value)}>
                      <option value="America/New_York">Eastern (ET)</option>
                      <option value="America/Chicago">Central (CT)</option>
                      <option value="America/Denver">Mountain (MT)</option>
                      <option value="America/Los_Angeles">Pacific (PT)</option>
                      <option value="Europe/London">London (GMT)</option>
                      <option value="Europe/Paris">Paris (CET)</option>
                      <option value="Asia/Kolkata">India (IST)</option>
                      <option value="Australia/Sydney">Sydney (AEST)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold tracking-widest uppercase text-[#666] mb-2">Daily Alert Time</label>
                    <input type="time" className="input-dark" value={sendTime} onChange={e => setSendTime(e.target.value)} />
                  </div>
                </div>
                <button onClick={saveProfile} disabled={loading}
                        className="bg-[#ef4444] text-white font-bold px-6 py-3 rounded-xl disabled:opacity-50 hover:bg-[#dc2626] transition-all">
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>

            <div className="bg-[#161616] border border-[#2a2a2a] rounded-2xl p-6">
              <h2 className="font-black text-lg mb-4">Change Password</h2>
              <div className="space-y-4">
                <input type="password" className="input-dark" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password (min 8 chars)" />
                <input type="password" className="input-dark" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Confirm new password" />
                <button onClick={changePassword} disabled={loading}
                        className="bg-[#1a1a1a] border border-[#2a2a2a] text-white font-bold px-6 py-3 rounded-xl disabled:opacity-50 hover:border-[#444] transition-all">
                  Update Password
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="bg-[#161616] border border-[#2a2a2a] rounded-2xl p-6">
            <h2 className="font-black text-lg mb-4">Alert Preferences</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-[#2a2a2a]">
                <div>
                  <p className="font-bold text-sm">Daily Email Digest</p>
                  <p className="text-xs text-[#666]">Morning report at your set time</p>
                </div>
                <span className="text-[#22c55e] text-xs font-bold">Always On</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-[#2a2a2a]">
                <div>
                  <p className="font-bold text-sm">SMS for Critical Alerts</p>
                  <p className="text-xs text-[#666]">Requires phone number in profile</p>
                </div>
                <span className="text-[#888] text-xs">{agency.owner_phone ? '✅ Phone set' : '⚠ Add phone'}</span>
              </div>
              <p className="text-xs text-[#555] pt-2">More notification controls coming soon. Contact support for custom alert thresholds.</p>
            </div>
          </div>
        )}

        {/* Subscription Tab */}
        {activeTab === 'subscription' && (
          <div className="space-y-6">
            {/* Current plan */}
            <div className="bg-[#161616] border border-[#2a2a2a] rounded-2xl p-6">
              <h2 className="font-black text-lg mb-4">Current Plan</h2>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-black text-xl capitalize">{agency.plan_name || 'Trial'}</p>
                  <p className="text-[#666] text-sm mt-1">
                    {agency.status === 'trial'
                      ? `Trial ends ${new Date(agency.trial_ends_at).toLocaleDateString()}`
                      : agency.subscription_ends_at
                        ? `Renews ${new Date(agency.subscription_ends_at).toLocaleDateString()}`
                        : 'Active'}
                  </p>
                </div>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${agency.status === 'trial' ? 'bg-[#eab308]/20 text-[#eab308]' : 'bg-[#22c55e]/20 text-[#22c55e]'}`}>
                  {agency.status === 'trial' ? 'Trial' : 'Active'}
                </span>
              </div>
            </div>

            {/* Plan options */}
            <div className="grid gap-4">
              {PLANS.map(plan => (
                <div key={plan.name}
                     className={`bg-[#161616] border rounded-2xl p-6 transition-all ${selectedPlan === plan.name ? 'border-[#ef4444]' : 'border-[#2a2a2a] hover:border-[#333]'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-black text-lg">{plan.label}</h3>
                      <p className="text-[#666] text-sm">{plan.clients}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black">{plan.price}</p>
                      {agency.plan_name === plan.name && <span className="text-xs text-[#22c55e] font-bold">Current</span>}
                    </div>
                  </div>
                  <ul className="space-y-1 mb-4">
                    {plan.features.map(f => (
                      <li key={f} className="text-sm text-[#888] flex items-center gap-2">
                        <span className="text-[#22c55e]">✓</span> {f}
                      </li>
                    ))}
                  </ul>
                  {agency.plan_name !== plan.name && (
                    <button onClick={() => requestPlanChange(plan.name)}
                            className="w-full bg-[#ef4444] hover:bg-[#dc2626] text-white font-bold py-2.5 rounded-xl text-sm transition-all">
                      Switch to {plan.label} →
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Wise payment instructions */}
            <div className="bg-[#161616] border border-[#2a2a2a] rounded-2xl p-6">
              <h3 className="font-black text-base mb-3">💳 How Payment Works</h3>
              <ol className="text-sm text-[#888] space-y-2">
                <li><span className="text-white font-bold">1.</span> Click &quot;Switch to [Plan]&quot; above — it opens an email to us</li>
                <li><span className="text-white font-bold">2.</span> We reply with a Wise payment link (USD, GBP, EUR, INR supported)</li>
                <li><span className="text-white font-bold">3.</span> Complete payment via Wise (bank transfer or card)</li>
                <li><span className="text-white font-bold">4.</span> We activate your plan within 24 hours</li>
              </ol>
              <p className="text-xs text-[#555] mt-3">Monthly billing. Cancel anytime — see Danger Zone below.</p>
            </div>
          </div>
        )}

        {/* Danger Zone */}
        {activeTab === 'danger' && (
          <div className="space-y-4">
            <div className="bg-[#161616] border border-[#ef4444]/20 rounded-2xl p-6">
              <h2 className="font-black text-lg text-[#ef4444] mb-2">Cancel Subscription</h2>
              <p className="text-[#888] text-sm mb-4">Your account will revert to read-only mode at the end of your billing period. You won&apos;t lose your data.</p>
              <button onClick={cancelSubscription}
                      className="bg-transparent border border-[#ef4444]/40 text-[#ef4444] font-bold px-5 py-2.5 rounded-xl hover:bg-[#ef4444]/10 transition-all text-sm">
                Cancel Subscription
              </button>
            </div>
            <div className="bg-[#161616] border border-[#555]/20 rounded-2xl p-6">
              <h2 className="font-black text-lg text-[#888] mb-2">Sign Out</h2>
              <p className="text-[#555] text-sm mb-4">Signs you out from all sessions on this device.</p>
              <button onClick={logout} className="bg-[#1a1a1a] border border-[#2a2a2a] text-white font-bold px-5 py-2.5 rounded-xl hover:border-[#444] transition-all text-sm">
                Sign Out
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}