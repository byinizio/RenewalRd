'use client';
// src/app/dashboard/AddClientForm.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AddClientForm({ agencyId }: { agencyId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    industry: 'saas',
    contact_email: '',
    monthly_retainer: '',
    contract_end_date: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agency_id: agencyId,
          name: form.name,
          industry: form.industry,
          contact_email: form.contact_email || undefined,
          monthly_retainer: form.monthly_retainer
            ? parseFloat(form.monthly_retainer)
            : undefined,
          contract_end_date: form.contract_end_date || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add client');

      setSuccess(`${form.name} added successfully!`);
      setForm({ name: '', industry: 'saas', contact_email: '', monthly_retainer: '', contract_end_date: '' });
      setOpen(false);
      setTimeout(() => router.refresh(), 500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {success && (
        <div className="bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] text-sm px-4 py-3 rounded-xl mb-4">
          ✓ {success}
        </div>
      )}

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full bg-[#161616] border border-dashed border-[#2a2a2a] hover:border-[#ef4444]/50 rounded-xl py-4 text-sm text-[#666] hover:text-white transition-all font-bold"
        >
          + Add New Client
        </button>
      ) : (
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-base">New Client</h3>
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
                Client / Brand Name *
              </label>
              <input
                type="text"
                placeholder="Acme Corp"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-dark"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-[#666] mb-2">
                  Industry
                </label>
                <select
                  value={form.industry}
                  onChange={(e) => setForm({ ...form, industry: e.target.value })}
                  className="input-dark"
                >
                  <option value="saas">SaaS / Tech</option>
                  <option value="ecommerce">E-Commerce</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="real_estate">Real Estate</option>
                  <option value="restaurant">Restaurant / Food</option>
                  <option value="fitness">Fitness / Health</option>
                  <option value="finance">Finance</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-[#666] mb-2">
                  Monthly Retainer ($)
                </label>
                <input
                  type="number"
                  placeholder="2000"
                  min="0"
                  step="50"
                  value={form.monthly_retainer}
                  onChange={(e) => setForm({ ...form, monthly_retainer: e.target.value })}
                  className="input-dark"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-[#666] mb-2">
                  Contact Email
                </label>
                <input
                  type="email"
                  placeholder="client@company.com"
                  value={form.contact_email}
                  onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                  className="input-dark"
                />
              </div>

              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-[#666] mb-2">
                  Contract End Date
                </label>
                <input
                  type="date"
                  value={form.contract_end_date}
                  onChange={(e) => setForm({ ...form, contract_end_date: e.target.value })}
                  className="input-dark"
                />
              </div>
            </div>

            {error && (
              <p className="text-[#ef4444] text-sm bg-[#ef4444]/10 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all"
              >
                {loading ? 'Adding...' : 'Add Client'}
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
      )}
    </div>
  );
}
