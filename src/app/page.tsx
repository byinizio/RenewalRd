// src/app/page.tsx
import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white grain-overlay" style={{ fontFamily: 'Syne, sans-serif' }}>

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5 border-b border-white/5 backdrop-blur-sm bg-[#0a0a0a]/80">
        <div className="flex items-center gap-3">
          <RadarIcon />
          <span className="font-black text-lg tracking-tight">RenewalRadar</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#how-it-works" className="text-sm text-[#888] hover:text-white transition-colors">How it works</a>
          <a href="#pricing" className="text-sm text-[#888] hover:text-white transition-colors">Pricing</a>
          <a
            href="#signup"
            className="bg-[#ef4444] hover:bg-[#dc2626] text-white text-sm font-bold px-5 py-2.5 rounded-lg transition-all hover:-translate-y-px"
          >
            Start Free Trial
          </a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="pt-40 pb-28 px-8 max-w-6xl mx-auto">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#ef4444] px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase mb-10 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ef4444] animate-blink"></span>
            Live churn monitoring for agencies
          </div>

          <h1 className="text-6xl md:text-8xl font-black tracking-tighter leading-none mb-8 animate-slide-in-up" style={{ fontFamily: 'Syne, sans-serif' }}>
            Know who's
            <br />
            <span className="text-[#ef4444]">quitting</span>
            <br />
            before they do.
          </h1>

          <p className="text-xl text-[#888] max-w-xl leading-relaxed mb-12 animate-slide-in-up delay-200">
            RenewalRadar monitors your clients' social performance and emails you
            churn risk scores + intervention scripts every morning at 8am.
            Stop losing $2,000/mo retainers to surprise churn.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-start animate-slide-in-up delay-300">
            <a
              href="#signup"
              className="bg-[#ef4444] hover:bg-[#dc2626] text-white font-black text-lg px-8 py-4 rounded-xl transition-all hover:-translate-y-0.5 inline-flex items-center gap-2"
            >
              Start 7-Day Free Trial
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
            <p className="text-sm text-[#555] self-center">No credit card · Cancels anytime</p>
          </div>
        </div>

        {/* Hero visual: email preview */}
        <div className="mt-20 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0a0a] z-10 pointer-events-none h-full" style={{top: '60%'}}></div>
          <EmailPreviewMockup />
        </div>
      </section>

      {/* ── PAIN POINT ── */}
      <section className="py-24 px-8 border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-[#ef4444] text-xs font-bold tracking-widest uppercase mb-4">The Problem</p>
              <h2 className="text-4xl font-black tracking-tight mb-6">
                Clients don't quit suddenly.
                <br />
                <span className="text-[#555]">They ghost slowly.</span>
              </h2>
              <p className="text-[#888] leading-relaxed mb-6">
                Engagement drops 30%. Posts get less frequent. Impressions crater.
                And you're the last to know — because you're busy with everything else.
              </p>
              <p className="text-[#888] leading-relaxed">
                By the time they send the cancellation email, the decision was made
                3 weeks ago. RenewalRadar watches for those signals so you can
                intervene while it still matters.
              </p>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Engagement dropped 34%', days: '21 days before churn', level: 'critical' },
                { label: 'No posts in 8 days', days: '18 days before churn', level: 'high' },
                { label: 'Impressions fell 41%', days: '14 days before churn', level: 'high' },
                { label: 'Cancellation email received', days: 'Too late', level: 'churned' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 bg-[#161616] border border-[#2a2a2a] rounded-xl p-4">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    item.level === 'critical' ? 'bg-[#ef4444]' :
                    item.level === 'high' ? 'bg-[#f97316]' :
                    'bg-[#666]'
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{item.label}</p>
                  </div>
                  <p className={`text-xs font-mono ${
                    item.level === 'churned' ? 'text-[#ef4444]' : 'text-[#555]'
                  }`}>{item.days}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-28 px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[#ef4444] text-xs font-bold tracking-widest uppercase mb-4">How It Works</p>
            <h2 className="text-5xl font-black tracking-tight">From setup to saved client<br />in under 24 hours.</h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                step: '01',
                title: 'Add Clients',
                desc: 'Enter each brand you manage and their monthly retainer value.',
                icon: '🏢',
              },
              {
                step: '02',
                title: 'Connect Accounts',
                desc: 'Link their Twitter/X, LinkedIn, and Instagram in one click.',
                icon: '🔗',
              },
              {
                step: '03',
                title: 'Morning Briefing',
                desc: 'Get churn risk scores, intervention scripts, and revenue-at-risk in your inbox.',
                icon: '📬',
              },
              {
                step: '04',
                title: 'Save Revenue',
                desc: 'Call at-risk clients with the exact script. Mark saved. Radar learns.',
                icon: '💰',
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="bg-[#161616] border border-[#2a2a2a] rounded-2xl p-6 h-full hover:border-[#ef4444]/30 transition-colors">
                  <p className="text-4xl mb-4">{item.icon}</p>
                  <p className="text-[#ef4444] text-xs font-mono font-bold mb-2">{item.step}</p>
                  <h3 className="font-black text-xl mb-3">{item.title}</h3>
                  <p className="text-[#888] text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT YOU GET ── */}
      <section className="py-24 px-8 bg-[#0d0d0d] border-y border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-black tracking-tight">What lands in your inbox<br />every morning at 8am.</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              emoji="🎯"
              title="Risk Scores"
              desc="Each client scored 0–100. Critical clients sorted to the top. Revenue at stake calculated to the dollar."
              color="#ef4444"
            />
            <FeatureCard
              emoji="📞"
              title="Intervention Scripts"
              desc='Exact words to say on the call. "Hey [Client], I was reviewing your metrics and noticed..." — data-backed, not salesy.'
              color="#f97316"
            />
            <FeatureCard
              emoji="✅"
              title="Keep / Stop Doing"
              desc="What's working (with evidence) and what's wasting budget. Walk into every client call already knowing the answers."
              color="#22c55e"
            />
            <FeatureCard
              emoji="💰"
              title="Upsell Signals"
              desc="When a client's metrics are trending up, RenewalRadar spots the opening and suggests exactly what to pitch."
              color="#eab308"
            />
            <FeatureCard
              emoji="📈"
              title="Trend History"
              desc="30-day performance graph per client. Show clients their growth arc, not just this week's numbers."
              color="#8b5cf6"
            />
            <FeatureCard
              emoji="🔁"
              title="Feedback Loop"
              desc='Mark clients "Saved" or "Lost." The algorithm learns what signals actually predict churn at your agency.'
              color="#06b6d4"
            />
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-28 px-8">
        <div className="max-w-md mx-auto text-center">
          <p className="text-[#ef4444] text-xs font-bold tracking-widest uppercase mb-4">Pricing</p>
          <h2 className="text-5xl font-black tracking-tight mb-4">One price.<br />Unlimited clients.</h2>
          <p className="text-[#888] mb-12">Save one $2,000/mo retainer and you've paid for the tool for 2 years.</p>

          <div className="bg-[#161616] border border-[#2a2a2a] rounded-2xl overflow-hidden">
            <div className="p-8 border-b border-[#2a2a2a]">
              <p className="text-6xl font-black mb-1">$79<span className="text-2xl font-normal text-[#666]">/mo</span></p>
              <p className="text-[#666] text-sm">Per agency · Unlimited clients · Cancel anytime</p>
            </div>
            <div className="p-8">
              <ul className="space-y-4 text-left mb-8">
                {[
                  'Daily churn risk scores for every client',
                  'AI-written intervention scripts',
                  'Revenue-at-risk calculation',
                  'Keep doing / stop doing analysis',
                  'Upsell opportunity detection',
                  'Feedback loop (AI learns from your wins)',
                  '7-day free trial included',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm">
                    <span className="text-[#ef4444] mt-0.5 flex-shrink-0">✓</span>
                    <span className="text-[#ccc]">{item}</span>
                  </li>
                ))}
              </ul>
              <a
                href="#signup"
                className="block w-full bg-[#ef4444] hover:bg-[#dc2626] text-white text-center font-black text-lg py-4 rounded-xl transition-all hover:-translate-y-px"
              >
                Start Free Trial →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── SIGNUP FORM ── */}
      <section id="signup" className="py-28 px-8 bg-[#0d0d0d] border-t border-white/5">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-12">
            <RadarIcon size={48} className="mx-auto mb-6" />
            <h2 className="text-4xl font-black tracking-tight mb-3">Get Started in 2 Minutes</h2>
            <p className="text-[#666]">7-day free trial. No credit card required.</p>
          </div>

          <form action="/api/signup" method="POST" className="space-y-4">
            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-[#666] mb-2">
                Agency Name
              </label>
              <input
                name="name"
                type="text"
                placeholder="Acme Social Agency"
                required
                className="input-dark"
              />
            </div>

            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-[#666] mb-2">
                Your Email
              </label>
              <input
                name="email"
                type="email"
                placeholder="you@agency.com"
                required
                className="input-dark"
              />
            </div>

            <div>
              <label className="block text-xs font-bold tracking-widest uppercase text-[#666] mb-2">
                Phone for SMS Alerts <span className="text-[#444] normal-case font-normal">(optional)</span>
              </label>
              <input
                name="phone"
                type="tel"
                placeholder="5551234567"
                className="input-dark"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-[#666] mb-2">
                  Timezone
                </label>
                <select name="timezone" className="input-dark">
                  <option value="America/New_York">Eastern (ET)</option>
                  <option value="America/Chicago">Central (CT)</option>
                  <option value="America/Denver">Mountain (MT)</option>
                  <option value="America/Los_Angeles">Pacific (PT)</option>
                  <option value="Europe/London">London (GMT)</option>
                  <option value="Europe/Paris">Paris (CET)</option>
                  <option value="Asia/Kolkata">India (IST)</option>
                  <option value="Australia/Sydney">Sydney (AEST)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-[#666] mb-2">
                  Alert Time
                </label>
                <input
                  name="send_time"
                  type="time"
                  defaultValue="08:00"
                  className="input-dark"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#ef4444] hover:bg-[#dc2626] text-white font-black text-lg py-4 rounded-xl transition-all hover:-translate-y-px mt-2"
            >
              Create Free Account →
            </button>
          </form>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-12 px-8 border-t border-white/5">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <RadarIcon size={20} />
            <span className="font-black text-sm">RenewalRadar</span>
          </div>
          <p className="text-xs text-[#444]">
            Built for social media agencies that protect their revenue.
          </p>
        </div>
      </footer>

    </div>
  );
}

// ── Sub-components ──

function RadarIcon({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="16" cy="16" r="14" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.4" />
      <circle cx="16" cy="16" r="9" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 2" opacity="0.6" />
      <circle cx="16" cy="16" r="4" fill="#ef4444" opacity="0.9" />
      <line x1="16" y1="16" x2="16" y2="2" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

function FeatureCard({
  emoji,
  title,
  desc,
  color,
}: {
  emoji: string;
  title: string;
  desc: string;
  color: string;
}) {
  return (
    <div className="bg-[#161616] border border-[#2a2a2a] rounded-2xl p-6 hover:border-white/10 transition-colors">
      <p className="text-3xl mb-4">{emoji}</p>
      <h3 className="font-black text-lg mb-2" style={{ color }}>
        {title}
      </h3>
      <p className="text-[#888] text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

function EmailPreviewMockup() {
  return (
    <div className="bg-[#161616] border border-[#2a2a2a] rounded-2xl overflow-hidden max-w-2xl mx-auto shadow-2xl">
      {/* Email client chrome */}
      <div className="bg-[#111] border-b border-[#2a2a2a] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#ef4444]"></div>
          <div className="w-3 h-3 rounded-full bg-[#f97316]"></div>
          <div className="w-3 h-3 rounded-full bg-[#22c55e]"></div>
        </div>
        <p className="text-xs text-[#555] font-mono">🚨 2 clients at CRITICAL churn risk — act today</p>
        <div className="w-16"></div>
      </div>

      {/* Email header */}
      <div className="bg-[#0a0a0a] px-8 py-6 border-b border-[#2a2a2a]">
        <p className="text-xs text-[#ef4444] font-bold tracking-widest uppercase mb-1">RENEWALRADAR</p>
        <p className="text-xl font-black text-white">Good morning, Acme Agency</p>
        <p className="text-xs text-[#555] mt-1">Wednesday, March 19</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 divide-x divide-[#2a2a2a] border-b border-[#2a2a2a]">
        {[
          { label: 'Monitored', value: '8', color: '#fff' },
          { label: 'At Risk', value: '3', color: '#ef4444' },
          { label: 'Revenue Exposed', value: '$6,200', color: '#ef4444' },
        ].map((stat) => (
          <div key={stat.label} className="py-4 text-center bg-[#0d0d0d]">
            <p className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</p>
            <p className="text-xs text-[#555] uppercase tracking-widest mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Client rows */}
      <div className="divide-y divide-[#1a1a1a]">
        {[
          { name: 'TechFlow SaaS', score: 89, level: 'CRITICAL', retainer: '$2,400', color: '#ef4444', signal: 'Engagement crashed 38% vs last week' },
          { name: 'Urban Eats Co', score: 67, level: 'HIGH', retainer: '$1,800', color: '#f97316', signal: 'No posts in 9 days' },
          { name: 'FitPro Studios', score: 31, level: 'MEDIUM', retainer: '$2,000', color: '#eab308', signal: 'Impressions down 22%' },
          { name: 'CloudBase Inc', score: 8, level: 'STABLE', retainer: '$3,500', color: '#22c55e', signal: 'All metrics healthy' },
        ].map((client) => (
          <div key={client.name} className="px-8 py-4 flex items-center gap-4 bg-[#0d0d0d]">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: client.color }}></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{client.name}</p>
              <p className="text-xs text-[#555] truncate">{client.signal}</p>
            </div>
            <span
              className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0"
              style={{ background: client.color + '20', color: client.color }}
            >
              {client.level}
            </span>
            <p className="text-sm font-mono text-[#555] flex-shrink-0">{client.score}/100</p>
            <p className="text-xs text-[#444] flex-shrink-0 hidden sm:block">{client.retainer}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="px-8 py-6 text-center bg-[#0a0a0a] border-t border-[#2a2a2a]">
        <div className="inline-block bg-[#ef4444] text-white font-black text-sm px-8 py-3 rounded-lg">
          📖 Read Full Analysis + Scripts →
        </div>
      </div>
    </div>
  );
}
