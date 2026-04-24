'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ForgotPassword() {
  const [email, setEmail]   = useState('');
  const [sent, setSent]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) { setError(error.message); } else { setSent(true); }
    setLoading(false);
  };

  if (sent) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white text-center">
      <div>
        <p className="text-4xl mb-4">📬</p>
        <h1 className="text-2xl font-black mb-2">Check your email</h1>
        <p className="text-[#888]">Reset link sent to {email}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6"
         style={{ fontFamily: 'Syne, sans-serif' }}>
      <div className="max-w-md w-full bg-[#161616] border border-[#2a2a2a] rounded-2xl p-8">
        <h1 className="text-2xl font-black text-white mb-2">Reset Password</h1>
        <p className="text-[#666] text-sm mb-6">Enter your email and we&apos;ll send a reset link.</p>
        {error && <p className="text-[#ef4444] text-sm mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                 className="input-dark" placeholder="you@agency.com" />
          <button type="submit" disabled={loading}
                  className="w-full bg-[#ef4444] text-white font-bold py-3 rounded-xl disabled:opacity-50">
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
      </div>
    </div>
  );
}