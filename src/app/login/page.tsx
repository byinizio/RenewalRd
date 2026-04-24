'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AgencyLogin() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Fetch their agency
    const { data: agency } = await supabase
      .from('agencies')
      .select('id, is_banned, ban_reason')
      .eq('auth_user_id', data.user.id)
      .single();

    if (!agency) {
      setError('No agency found for this account.');
      setLoading(false);
      return;
    }

    if (agency.is_banned) {
      await supabase.auth.signOut();
      setError(`Your account has been suspended. Reason: ${agency.ban_reason || 'Contact support.'}`);
      setLoading(false);
      return;
    }

    window.location.href = `/dashboard?agency=${agency.id}`;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6"
         style={{ fontFamily: 'Syne, sans-serif' }}>
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <span className="text-xs text-[#ef4444] font-bold tracking-widest uppercase">RENEWALRADAR</span>
          <h1 className="text-3xl font-black text-white mt-2">Sign in to your account</h1>
          <p className="text-[#666] mt-2 text-sm">Monitor your clients. Protect your revenue.</p>
        </div>

        <div className="bg-[#161616] border border-[#2a2a2a] rounded-2xl p-8">
          {error && (
            <div className="bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#ef4444] px-4 py-3 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-[#666] mb-2">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                     className="input-dark" placeholder="you@agency.com" />
            </div>
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-[#666] mb-2">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
                     className="input-dark" placeholder="••••••••" />
              <div className="text-right mt-1.5">
                <Link href="/forgot-password" className="text-xs text-[#555] hover:text-white">Forgot password?</Link>
              </div>
            </div>
            <button type="submit" disabled={loading}
                    className="w-full bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all">
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>

          <p className="text-center text-sm text-[#555] mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/#signup" className="text-[#ef4444] font-bold hover:underline">Start free trial</Link>
          </p>
        </div>
      </div>
    </div>
  );
}