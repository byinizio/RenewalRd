'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ResetPassword() {
  const [password, setPassword]           = useState('');
  const [confirmPassword, setConfirm]     = useState('');
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const [success, setSuccess]             = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!window.location.hash.includes('access_token')) setError('Invalid or expired link.');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) return setError('Passwords do not match');
    if (password.length < 8) return setError('Minimum 8 characters');
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); } else { setSuccess(true); setTimeout(() => router.push('/login'), 3000); }
    setLoading(false);
  };

  if (success) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-white text-center">
      <div><p className="text-4xl mb-4">✅</p><h1 className="text-xl font-black">Password updated! Redirecting...</h1></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-6"
         style={{ fontFamily: 'Syne, sans-serif' }}>
      <div className="max-w-md w-full bg-[#161616] border border-[#2a2a2a] rounded-2xl p-8">
        <h1 className="text-2xl font-black text-white mb-6">Create New Password</h1>
        {error && <p className="text-[#ef4444] text-sm mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                 required minLength={8} className="input-dark" placeholder="New password" />
          <input type="password" value={confirmPassword} onChange={e => setConfirm(e.target.value)}
                 required className="input-dark" placeholder="Confirm password" />
          <button type="submit" disabled={loading}
                  className="w-full bg-[#ef4444] text-white font-bold py-3 rounded-xl disabled:opacity-50">
            {loading ? 'Updating...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
}