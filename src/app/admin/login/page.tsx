'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [step, setStep]           = useState<'credentials' | '2fa'>('credentials');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [totpCode, setTotpCode]   = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [useBackup, setUseBackup] = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const router = useRouter();

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const res = await fetch('/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (res.ok) { router.push('/admin'); return; }
    if (data.step === '2fa') { setStep('2fa'); setLoading(false); return; }
    setError(data.error || 'Login failed');
    setLoading(false);
  };

  const handle2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const res = await fetch('/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, totpCode: useBackup ? undefined : totpCode, backupCode: useBackup ? backupCode : undefined }),
    });
    const data = await res.json();
    if (res.ok) { router.push('/admin'); } else { setError(data.error || 'Invalid code'); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505]"
         style={{ fontFamily: 'Syne, sans-serif' }}>
      <div className="max-w-sm w-full p-8">
        <div className="text-center mb-8">
          <span className="text-xs text-[#ef4444] font-bold tracking-widest uppercase">RENEWALRADAR</span>
          <h1 className="text-2xl font-black text-white mt-2">
            {step === 'credentials' ? 'Admin Access' : 'Two-Factor Auth'}
          </h1>
          <p className="text-[#444] text-sm mt-1">
            {step === 'credentials' ? 'Restricted area' : 'Enter your authenticator code'}
          </p>
        </div>

        {error && <div className="bg-[#ef4444]/10 border border-[#ef4444]/30 text-[#ef4444] px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>}

        {step === 'credentials' ? (
          <form onSubmit={handleCredentials} className="space-y-4">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="off"
                   className="w-full p-3 bg-[#111] border border-[#1a1a1a] rounded-lg text-white text-sm placeholder-[#333] focus:border-[#333] outline-none"
                   placeholder="admin@email.com" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                   className="w-full p-3 bg-[#111] border border-[#1a1a1a] rounded-lg text-white text-sm placeholder-[#333] focus:border-[#333] outline-none"
                   placeholder="••••••••" />
            <button type="submit" disabled={loading}
                    className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 text-sm">
              {loading ? 'Verifying...' : 'Continue →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handle2FA} className="space-y-4">
            {!useBackup ? (
              <input type="text" value={totpCode} onChange={e => setTotpCode(e.target.value.replace(/\D/g,''))}
                     maxLength={6} required placeholder="000000"
                     className="w-full p-4 bg-[#111] border border-[#1a1a1a] rounded-lg text-white text-center text-2xl tracking-widest placeholder-[#333] focus:border-[#333] outline-none" />
            ) : (
              <input type="text" value={backupCode} onChange={e => setBackupCode(e.target.value.toUpperCase())}
                     required placeholder="BACKUP CODE"
                     className="w-full p-4 bg-[#111] border border-[#1a1a1a] rounded-lg text-white text-center text-lg font-mono placeholder-[#333] focus:border-[#333] outline-none" />
            )}
            <button type="submit" disabled={loading}
                    className="w-full bg-white text-black font-bold py-3 rounded-lg hover:bg-gray-200 transition disabled:opacity-50 text-sm">
              {loading ? 'Verifying...' : 'Verify'}
            </button>
            <div className="flex justify-between">
              <button type="button" onClick={() => setStep('credentials')} className="text-[#444] text-xs hover:text-white">← Back</button>
              <button type="button" onClick={() => setUseBackup(!useBackup)} className="text-[#444] text-xs hover:text-white">{useBackup ? 'Use authenticator' : 'Use backup code'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}