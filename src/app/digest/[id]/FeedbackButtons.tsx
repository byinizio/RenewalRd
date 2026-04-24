'use client';
// src/app/digest/[id]/FeedbackButtons.tsx
import { useState } from 'react';

export default function FeedbackButtons({
  clientId,
  digestId,
  clientName,
}: {
  clientId: string;
  digestId: string;
  clientName: string;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const submit = async (outcome: string) => {
    if (loading || submitted) return;
    setLoading(outcome);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, digest_id: digestId, outcome }),
      });

      if (res.ok) {
        setSelected(outcome);
        setSubmitted(true);
      }
    } catch (err) {
      console.error('Feedback submit error:', err);
    } finally {
      setLoading(null);
    }
  };

  if (submitted) {
    const messages: Record<string, { icon: string; text: string; color: string }> = {
      saved: { icon: '✅', text: `${clientName} marked as saved. Radar is learning.`, color: 'text-[#22c55e]' },
      lost: { icon: '📉', text: `${clientName} marked as lost. Radar will improve.`, color: 'text-[#ef4444]' },
      no_action: { icon: '⏳', text: 'Noted. Will continue monitoring.', color: 'text-[#888]' },
      false_alarm: { icon: '✓', text: 'False alarm recorded. Risk score reset.', color: 'text-[#eab308]' },
    };
    const msg = messages[selected!] || messages.no_action;

    return (
      <div className={`flex items-center gap-2 text-sm font-bold ${msg.color}`}>
        <span>{msg.icon}</span>
        <span>{msg.text}</span>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-bold tracking-widest uppercase text-[#555] mb-3">
        What happened with this client?
      </p>
      <div className="flex flex-wrap gap-2">
        <FeedbackBtn
          outcome="saved"
          label="✅ Saved the Client"
          activeColor="bg-[#22c55e] text-white border-[#22c55e]"
          loading={loading === 'saved'}
          onClick={() => submit('saved')}
        />
        <FeedbackBtn
          outcome="lost"
          label="❌ Client Churned"
          activeColor="bg-[#ef4444] text-white border-[#ef4444]"
          loading={loading === 'lost'}
          onClick={() => submit('lost')}
        />
        <FeedbackBtn
          outcome="false_alarm"
          label="🔕 False Alarm"
          activeColor="bg-[#eab308] text-black border-[#eab308]"
          loading={loading === 'false_alarm'}
          onClick={() => submit('false_alarm')}
        />
        <FeedbackBtn
          outcome="no_action"
          label="⏸ No Action Yet"
          activeColor="bg-[#333] text-white border-[#555]"
          loading={loading === 'no_action'}
          onClick={() => submit('no_action')}
        />
      </div>
    </div>
  );
}

function FeedbackBtn({
  label,
  activeColor,
  loading,
  onClick,
}: {
  outcome: string;
  label: string;
  activeColor: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`text-xs font-bold px-4 py-2 rounded-lg border transition-all hover:scale-[1.02] active:scale-[0.98] ${
        loading
          ? 'opacity-50 cursor-not-allowed border-[#333] text-[#555]'
          : `border-[#2a2a2a] text-[#666] hover:${activeColor}`
      }`}
    >
      {loading ? '...' : label}
    </button>
  );
}
