// src/app/thank-you/page.tsx
'use client';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function ThankYouContent() {
  const searchParams = useSearchParams();
  const agencyId = searchParams.get('agency');

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-6" style={{ fontFamily: 'Syne, sans-serif' }}>
      <div className="max-w-lg w-full text-center animate-fade-in">

        {/* Animated radar icon */}
        <div className="relative w-24 h-24 mx-auto mb-10">
          <svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <circle cx="48" cy="48" r="44" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.3" className="animate-[spin_12s_linear_infinite]" style={{ transformOrigin: 'center' }} />
            <circle cx="48" cy="48" r="30" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5" className="animate-[spin_8s_linear_infinite_reverse]" style={{ transformOrigin: 'center' }} />
            <circle cx="48" cy="48" r="14" stroke="#ef4444" strokeWidth="1.5" opacity="0.7" />
            <circle cx="48" cy="48" r="5" fill="#ef4444" />
            {/* Sweep line */}
            <line x1="48" y1="48" x2="48" y2="4" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" opacity="0.8" className="animate-radar-sweep" style={{ transformOrigin: '48px 48px' }} />
          </svg>
        </div>

        <div className="inline-flex items-center gap-2 bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]"></span>
          Account Created
        </div>

        <h1 className="text-5xl font-black tracking-tight mb-4">
          You're on the radar.
        </h1>
        <p className="text-[#888] text-lg mb-12 leading-relaxed">
          Check your email for your welcome message.
          Your first risk report lands tomorrow morning at 8am.
        </p>

        {/* Steps */}
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-2xl p-8 mb-10 text-left">
          <p className="text-xs font-bold tracking-widest uppercase text-[#666] mb-6">
            3 steps to your first report
          </p>
          <div className="space-y-6">
            {[
              {
                step: '01',
                title: 'Open your dashboard',
                desc: 'Click the link below to get to your agency dashboard.',
              },
              {
                step: '02',
                title: 'Add your first client',
                desc: 'Enter a brand you manage, their retainer value, and contact info.',
              },
              {
                step: '03',
                title: 'Connect their Twitter account',
                desc: "Add their @handle — no OAuth needed for public accounts. That's it.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-4">
                <span className="text-[#ef4444] font-mono text-xs font-bold pt-0.5 flex-shrink-0">
                  {item.step}
                </span>
                <div>
                  <p className="font-bold text-sm mb-1">{item.title}</p>
                  <p className="text-[#888] text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {agencyId ? (
          <Link
            href={`/dashboard?agency=${agencyId}`}
            className="block w-full bg-[#ef4444] hover:bg-[#dc2626] text-white font-black text-lg py-4 rounded-xl transition-all hover:-translate-y-px text-center mb-4"
          >
            Go to Dashboard →
          </Link>
        ) : (
          <Link
            href="/"
            className="block w-full bg-[#ef4444] hover:bg-[#dc2626] text-white font-black text-lg py-4 rounded-xl transition-all hover:-translate-y-px text-center mb-4"
          >
            Go to Dashboard →
          </Link>
        )}

        <p className="text-xs text-[#444]">
          Questions? Reply to the welcome email.
        </p>
      </div>
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#ef4444] border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <ThankYouContent />
    </Suspense>
  );
}
