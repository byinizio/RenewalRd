'use client';
// src/app/dashboard/AddAccountForm.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AddAccountForm({
  clientId,
  agencyId,
}: {
  clientId: string;
  agencyId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    platform: 'twitter',
    account_handle: '',
    access_token: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          platform: form.platform,
          account_handle: form.account_handle.replace('@', ''),
          access_token: form.access_token || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add account');

      setOpen(false);
      setForm({ platform: 'twitter', account_handle: '', access_token: '' });
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-[#555] hover:text-white border border-[#2a2a2a] hover:border-[#444] px-3 py-1.5 rounded-lg transition-all font-bold"
      >
        + Account
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="bg-[#161616] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-sm animate-scale-in"
            style={{ fontFamily: 'Syne, sans-serif' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-black text-lg">Connect Social Account</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-[#555] hover:text-white text-xl leading-none"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-[#666] mb-2">
                  Platform
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'twitter', label: '𝕏 Twitter' },
                    { value: 'linkedin', label: 'in LinkedIn' },
                    { value: 'instagram', label: '📸 Instagram' },
                  ].map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setForm({ ...form, platform: p.value })}
                      className={`text-xs py-2.5 px-2 rounded-lg border font-bold transition-all ${
                        form.platform === p.value
                          ? 'border-[#ef4444] bg-[#ef4444]/10 text-white'
                          : 'border-[#2a2a2a] text-[#666] hover:border-[#444]'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-[#666] mb-2">
                  {form.platform === 'twitter' ? '@Handle' : 
                   form.platform === 'linkedin' ? 'Company Vanity URL' : 
                   'Instagram User ID'}
                </label>
                <input
                  type="text"
                  placeholder={
                    form.platform === 'twitter' ? '@username' :
                    form.platform === 'linkedin' ? 'company-name' :
                    '17841400000000000'
                  }
                  required
                  value={form.account_handle}
                  onChange={(e) => setForm({ ...form, account_handle: e.target.value })}
                  className="input-dark"
                />
                {form.platform === 'twitter' && (
                  <p className="text-xs text-[#555] mt-1.5">
                    Public accounts work without a token. For private metrics, add an access token.
                  </p>
                )}
              </div>

              {(form.platform === 'linkedin' || form.platform === 'instagram') && (
                <div>
                  <label className="block text-xs font-bold tracking-widest uppercase text-[#666] mb-2">
                    Access Token
                  </label>
                  <input
                    type="password"
                    placeholder="Bearer token..."
                    value={form.access_token}
                    onChange={(e) => setForm({ ...form, access_token: e.target.value })}
                    className="input-dark"
                  />
                  <p className="text-xs text-[#555] mt-1.5">
                    Required for {form.platform === 'linkedin' ? 'LinkedIn' : 'Instagram'} analytics access.
                  </p>
                </div>
              )}

              {error && (
                <p className="text-[#ef4444] text-sm bg-[#ef4444]/10 px-3 py-2 rounded-lg">
                  {error}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all"
                >
                  {loading ? 'Connecting...' : 'Connect Account'}
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="btn-ghost"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
