'use client';

import { useState } from 'react';

export default function AdminClientRow({ agency, plans }: { agency: any; plans: any[] }) {
  const [loading, setLoading] = useState(false);
  const [note, setNote]       = useState('');

  const doAction = async (action: string, extra?: any) => {
    setLoading(true);
    await fetch('/api/admin/agency-action', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agency_id: agency.id, action, ...extra }),
    });
    window.location.reload();
  };

  const statusColor: Record<string, string> = {
    trial: '#eab308', active: '#22c55e', paused: '#888', cancelled: '#ef4444',
  };

  return (
    <tr className={`hover:bg-[#111] ${agency.is_banned ? 'opacity-50' : ''}`}>
      <td className="px-4 py-3">
        <div className="font-bold">{agency.name}</div>
        {agency.is_banned && <span className="text-xs text-[#ef4444] font-bold">BANNED</span>}
      </td>
      <td className="px-4 py-3 text-[#888] text-xs">
        <div>{agency.owner_email}</div>
        {agency.owner_phone && <div>{agency.owner_phone}</div>}
      </td>
      <td className="px-4 py-3">
        <span className="text-xs font-bold capitalize">
          {agency.subscription_plans?.display_name || agency.plan_name || 'Trial'}
        </span>
        {agency.subscription_ends_at && (
          <div className="text-xs text-[#555]">Until {new Date(agency.subscription_ends_at).toLocaleDateString()}</div>
        )}
      </td>
      <td className="px-4 py-3">
        <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: (statusColor[agency.status] || '#888') + '20', color: statusColor[agency.status] || '#888' }}>
          {agency.status}
        </span>
      </td>
      <td className="px-4 py-3 text-[#888]">{agency.clients?.[0]?.count || 0}</td>
      <td className="px-4 py-3 text-[#555] text-xs">{new Date(agency.created_at).toLocaleDateString()}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {/* Plan change */}
          <select onChange={e => e.target.value && doAction('change_plan', { plan_name: e.target.value })}
                  className="text-xs bg-[#1a1a1a] border border-[#2a2a2a] text-[#888] rounded px-2 py-1 cursor-pointer">
            <option value="">Change Plan</option>
            <option value="starter">Starter</option>
            <option value="growth">Growth</option>
            <option value="agency_pro">Agency Pro</option>
          </select>

          {/* Extend trial */}
          <button onClick={() => doAction('extend_trial', { days: 7 })} disabled={loading}
                  className="text-xs bg-[#eab308]/20 text-[#eab308] px-2 py-1 rounded hover:bg-[#eab308]/30">
            +7d Trial
          </button>

          {/* Ban/Unban */}
          <button onClick={() => {
            const reason = agency.is_banned ? '' : (prompt('Ban reason:') || '');
            if (agency.is_banned || reason) doAction(agency.is_banned ? 'unban' : 'ban', { reason });
          }} disabled={loading}
                  className={`text-xs px-2 py-1 rounded ${agency.is_banned ? 'bg-[#22c55e]/20 text-[#22c55e]' : 'bg-[#ef4444]/20 text-[#ef4444]'}`}>
            {agency.is_banned ? 'Unban' : 'Ban'}
          </button>

          {/* Cancel subscription */}
          {agency.status === 'active' && (
            <button onClick={() => confirm('Cancel subscription?') && doAction('cancel_subscription')} disabled={loading}
                    className="text-xs bg-[#333] text-[#888] px-2 py-1 rounded hover:bg-[#444]">
              Cancel Sub
            </button>
          )}

          {/* View dashboard (impersonate view) */}
          <a href={`/dashboard?agency=${agency.id}`} target="_blank"
             className="text-xs bg-[#1a1a1a] text-[#555] px-2 py-1 rounded hover:text-white">
            View →
          </a>
        </div>
      </td>
    </tr>
  );
}