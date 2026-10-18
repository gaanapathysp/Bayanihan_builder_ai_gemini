import { useNavigate } from 'react-router-dom'
import { Wind, AlertTriangle, Shield, ChevronRight, Home } from 'lucide-react'
import { useLang } from '../../context/LangContext'

export default function StormAlert() {
  const { tx, lang, toggle } = useLang()
  const nav = useNavigate()

  return (
    <div className="min-h-dvh bg-navy flex flex-col font-body select-none">

      {/* Top bar */}
      <div className="flex justify-between items-center px-5 pt-[calc(env(safe-area-inset-top,0px)+14px)] pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
            <Shield size={14} className="text-white" />
          </div>
          <span className="font-display font-700 text-white text-sm tracking-tight">Bayanihan</span>
        </div>
        <button onClick={toggle}
          className="text-[11px] font-mono-dm text-white/50 hover:text-white/80 transition-colors px-3 py-1.5 glass rounded-full active:scale-95">
          {lang === 'en' ? '🇵🇭 Filipino' : '🇺🇸 English'}
        </button>
      </div>

      {/* Storm card */}
      <div className="px-4 mt-1 animate-fade-in">
        <div className="relative overflow-hidden rounded-3xl">
          <div className="absolute inset-0 bg-gradient-to-br from-[#B91C1C] via-[#DC2626] to-[#EA580C]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_110%_-20%,rgba(255,255,255,0.18),transparent)]" />
          {/* Rotating rings */}
          <div className="absolute -right-10 -top-10 w-48 h-48 border border-white/10 rounded-full animate-spin" style={{ animationDuration:'14s' }} />
          <div className="absolute -right-6 -top-6 w-36 h-36 border border-white/10 rounded-full animate-spin" style={{ animationDuration:'9s', animationDirection:'reverse' }} />
          <div className="absolute -right-2 -top-2 w-24 h-24 border border-white/10 rounded-full animate-spin" style={{ animationDuration:'6s' }} />

          <div className="relative px-6 pt-6 pb-5">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={13} className="text-white/80 fill-white/20" />
              <span className="text-[10px] font-display font-600 tracking-[0.18em] uppercase text-white/80">
                {tx.stormAlert}
              </span>
            </div>
            <h1 className="text-[42px] leading-none font-display font-800 text-white mb-2">
              Typhoon<br/>Kiko
            </h1>
            <div className="flex items-center gap-2 mb-4">
              <span className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 text-xs font-display font-600 text-white">
                <Wind size={12} /> {tx.signalLevel}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[13px] text-white/75 font-body">{tx.landfall}</p>
              <div className="text-right">
                <div className="text-[10px] text-white/50 font-mono-dm">TRACKING</div>
                <div className="text-xs text-white font-display font-600">Manila Bay</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Protection gap */}
      <div className="px-4 mt-3 animate-fade-in" style={{ animationDelay:'0.08s' }}>
        <div className="glass rounded-2xl px-4 py-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-storm-amber/20 flex items-center justify-center shrink-0">
            <AlertTriangle size={16} className="text-storm-amber" />
          </div>
          <p className="text-[13px] text-white/70 font-body leading-snug">
            <span className="text-white font-600">{tx.statLabel}</span>
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="px-4 mt-4 animate-fade-in" style={{ animationDelay:'0.14s' }}>
        <p className="text-[13px] text-white/50 text-center mb-3 px-4 leading-relaxed font-body">
          Record your home <span className="text-white/80 font-600">before the storm.</span><br/>
          AI locks the evidence. Claims process in hours.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { emoji: '📹', label: 'Record home', sub: '60 seconds' },
            { emoji: '🔒', label: 'Lock evidence', sub: 'SHA-256 sealed' },
            { emoji: '💸', label: 'Fast payout', sub: 'PHP 10,000' },
          ].map(s => (
            <div key={s.label} className="glass rounded-2xl p-3 text-center">
              <div className="text-2xl mb-1">{s.emoji}</div>
              <p className="text-[11px] text-white/80 font-display font-600 leading-tight">{s.label}</p>
              <p className="text-[10px] text-white/35 font-body mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* CTAs */}
      <div className="px-4 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] space-y-3 animate-slide-up" style={{ animationDelay:'0.18s' }}>
        <button onClick={() => nav('/walk')}
          className="w-full flex items-center justify-center gap-2.5 bg-brand active:bg-brand-dark active:scale-[0.98] transition-all text-white font-display font-700 text-[17px] rounded-2xl py-[17px] shadow-xl shadow-brand/40">
          <Home size={19} />
          {tx.recordNow}
          <ChevronRight size={19} />
        </button>
        <button onClick={() => nav('/claim')}
          className="w-full text-white/40 active:text-white/70 transition-colors font-body text-[13px] py-3">
          {tx.doLater}
        </button>
      </div>
    </div>
  )
}
