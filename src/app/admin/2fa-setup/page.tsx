'use client';

import { useState, useEffect } from 'react';

export default function TwoFactorSetup() {
  const [qrCode, setQrCode]   = useState('');
  const [secret, setSecret]   = useState('');
  const [code, setCode]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [enabled, setEnabled] = useState(false);
  const [backupCodes, setBackups] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/admin/2fa/setup', { method: 'POST' }).then(r => r.json()).then(d => { setQrCode(d.qrCode); setSecret(d.secret); });
  }, []);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    const res = await fetch('/api/admin/2fa/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, secret }) });
    const data = await res.json();
    if (res.ok) { setEnabled(true); setBackups(data.backupCodes); } else { setError(data.error); }
    setLoading(false);
  };

  if (enabled) return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center">
        <p className="text-4xl mb-4">✅</p>
        <h1 className="text-2xl font-black mb-2">2FA Enabled</h1>
        <p className="text-[#888] mb-6 text-sm">Save these backup codes — you can only see them once:</p>
        <div className="bg-[#111] rounded-xl p-4 mb-6 font-mono text-sm text-[#eab308] text-left grid grid-cols-2 gap-1">
          {backupCodes.map((c, i) => <div key={i}>{c}</div>)}
        </div>
        <a href="/admin" className="block bg-white text-black font-bold py-3 rounded-xl">Go to Dashboard</a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-8">
      <div className="max-w-md w-full">
        <a href="/admin" className="text-[#555] text-sm hover:text-white mb-6 block">← Admin</a>
        <h1 className="text-2xl font-black mb-2">Set Up 2FA</h1>
        <p className="text-[#555] mb-6 text-sm">Scan with Google Authenticator, Authy, or 1Password.</p>
        {qrCode && <div className="bg-white p-4 rounded-xl mb-4 flex justify-center"><img src={qrCode} alt="2FA QR" className="w-48 h-48" /></div>}
        <div className="bg-[#111] p-3 rounded-lg mb-6">
          <p className="text-xs text-[#444] mb-1">Manual entry:</p>
          <code className="text-xs text-[#eab308] break-all">{secret}</code>
        </div>
        {error && <p className="text-[#ef4444] text-sm mb-3">{error}</p>}
        <form onSubmit={verify} className="space-y-4">
          <input type="text" value={code} onChange={e => setCode(e.target.value.replace(/\D/g,''))} maxLength={6} required placeholder="000000"
                 className="w-full p-4 bg-[#111] border border-[#1a1a1a] rounded-lg text-white text-center text-2xl tracking-widest placeholder-[#333] outline-none" />
          <button type="submit" disabled={loading} className="w-full bg-white text-black font-bold py-3 rounded-lg disabled:opacity-50">
            {loading ? 'Verifying...' : 'Enable 2FA'}
          </button>
        </form>
      </div>
    </div>
  );
}