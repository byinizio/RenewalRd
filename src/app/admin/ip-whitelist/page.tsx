'use client';

import { useState, useEffect } from 'react';

export default function IpWhitelistPage() {
  const [ips, setIps]         = useState<any[]>([]);
  const [myIp, setMyIp]       = useState('');
  const [newIp, setNewIp]     = useState('');
  const [label, setLabel]     = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('https://api.ipify.org?format=json').then(r => r.json()).then(d => setMyIp(d.ip));
    loadIps();
  }, []);

  const loadIps = async () => {
    const r = await fetch('/api/admin/ips'); const d = await r.json(); setIps(d.ips || []);
  };

  const addIp = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    await fetch('/api/admin/ips', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ip_address: newIp, label }) });
    setNewIp(''); setLabel(''); await loadIps(); setLoading(false);
  };

  const toggle = async (id: string, enabled: boolean) => {
    await fetch(`/api/admin/ips/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: !enabled }) });
    loadIps();
  };

  const deleteIp = async (id: string) => {
    if (!confirm('Delete? You could lock yourself out.')) return;
    await fetch(`/api/admin/ips/${id}`, { method: 'DELETE' }); loadIps();
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8" style={{ fontFamily: 'Syne, sans-serif' }}>
      <div className="max-w-2xl mx-auto">
        <a href="/admin" className="text-[#555] text-sm hover:text-white mb-6 block">← Admin Dashboard</a>
        <h1 className="text-3xl font-black mb-2">IP Whitelist</h1>
        <p className="text-[#555] mb-8 text-sm">Only IPs on this list can access <code>/admin</code>. Your current IP: <span className="text-[#eab308] font-mono">{myIp}</span>
          <button onClick={() => { setNewIp(myIp); setLabel('Current'); }} className="ml-2 text-[#ef4444] text-xs underline">Add this</button>
        </p>

        <form onSubmit={addIp} className="flex gap-3 mb-6">
          <input value={newIp} onChange={e => setNewIp(e.target.value)} placeholder="xxx.xxx.xxx.xxx" required
                 className="flex-1 p-2.5 bg-[#111] border border-[#1a1a1a] rounded-lg text-white text-sm placeholder-[#333] outline-none" />
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Label (e.g. Home)"
                 className="flex-1 p-2.5 bg-[#111] border border-[#1a1a1a] rounded-lg text-white text-sm placeholder-[#333] outline-none" />
          <button type="submit" disabled={loading} className="bg-[#ef4444] text-white font-bold px-4 py-2.5 rounded-lg text-sm disabled:opacity-50">Add</button>
        </form>

        <div className="space-y-2">
          {ips.map(ip => (
            <div key={ip.id} className={`flex items-center justify-between bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl px-4 py-3 ${!ip.enabled ? 'opacity-40' : ''}`}>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${ip.enabled ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`} />
                <div>
                  <p className="font-mono text-sm">{ip.ip_address}</p>
                  <p className="text-xs text-[#555]">{ip.label || 'No label'} {ip.last_used_at && `· Last used ${new Date(ip.last_used_at).toLocaleDateString()}`}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggle(ip.id, ip.enabled)} className={`text-xs px-3 py-1 rounded-lg ${ip.enabled ? 'bg-[#ef4444]/20 text-[#ef4444]' : 'bg-[#22c55e]/20 text-[#22c55e]'}`}>
                  {ip.enabled ? 'Disable' : 'Enable'}
                </button>
                <button onClick={() => deleteIp(ip.id)} className="text-xs px-3 py-1 rounded-lg bg-[#1a1a1a] text-[#555] hover:text-[#ef4444]">Delete</button>
              </div>
            </div>
          ))}
          {ips.length === 0 && <p className="text-center text-[#444] py-8">No IPs whitelisted — you&apos;re locked out!</p>}
        </div>

        <div className="mt-6 p-4 bg-[#eab308]/10 border border-[#eab308]/20 rounded-xl">
          <p className="text-[#eab308] text-xs">⚠ Keep at least one IP enabled at all times. Emergency bypass: set <code>x-emergency-bypass</code> header to your <code>ADMIN_EMERGENCY_CODE</code> env var.</p>
        </div>
      </div>
    </div>
  );
}