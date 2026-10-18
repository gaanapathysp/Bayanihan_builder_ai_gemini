import { useNavigate } from 'react-router-dom'
import { Wind, AlertTriangle, Shield, ChevronRight } from 'lucide-react'
import { useLang } from '../../context/LangContext'

export default function StormAlert() {
  const { tx, lang, toggle } = useLang()
  const nav = useNavigate()

  return (
    <div className="min-h-screen bg-navy flex flex-col items-center justify-start font-body">
      {/* Language toggle */}
      <div className="w-full max-w-[430px] flex justify-end px-4 pt-4">
        <button
          onClick={toggle}
          className="text-xs font-mono-dm text-white/60 hover:text-white transition-colors px-3 py-1.5 glass rounded-full"
        >
          {lang === 'en' ? '🇵🇭 Filipino' : '🇺🇸 English'}
        </button>
      </div>

      {/* Storm banner */}
      <div className="w-full max-w-[430px] px-4 mt-2 animate-fade-in">
        <div className="relative overflow-hidden rounded-2xl">
          {/* Animated storm background */}
          <div className="absolute inset-0 bg-gradient-to-br from-storm via-storm-orange to-storm-amber opacity-90" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.15),transparent_60%)]" />
          {/* Spinning wind rings */}
          <div className="absolute -right-8 -top-8 w-40 h-40 border-2 border-white/10 rounded-full animate-spin" style={{ animationDuration: '12s' }} />
          <div className="absolute -right-4 -top-4 w-28 h-28 border-2 border-white/10 rounded-full animate-spin" style={{ animationDuration: '8s', animationDirection: 'reverse' }} />

          <div className="relative p-6 text-white">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle size={16} className="fill-white/80" />
              <span className="text-xs font-display font-600 tracking-widest uppercase opacity-80">
                {tx.stormAlert}
              </span>
            </div>
            <h1 className="text-4xl font-display font-800 leading-none mb-1">
              Typhoon<br />Kiko
            </h1>
            <div className="inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 mt-2 mb-4">
              <Wind size={13} />
              <span className="text-xs font-display font-600">{tx.signalLevel}</span>
            </div>
            <p className="text-sm opacity-80 font-body">{tx.landfall}</p>
          </div>
        </div>
      </div>

      {/* Protection gap stat */}
      <div className="w-full max-w-[430px] px-4 mt-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
        <div className="glass rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-storm/20 flex items-center justify-center shrink-0">
            <Shield size={18} className="text-storm-amber" />
          </div>
          <p className="text-xs text-white/70 font-body leading-snug">
            <span className="text-white font-600">{tx.statLabel}</span>
          </p>
        </div>
      </div>

      {/* What this does */}
      <div className="w-full max-w-[430px] px-4 mt-5 animate-fade-in" style={{ animationDelay: '0.15s' }}>
        <p className="text-sm text-white/60 text-center font-body mb-4 px-2">
          Record a 60-second walk of your home now.<br/>
          <span className="text-white/80">We guide you room by room.</span> Your claim will be faster and protected.
        </p>

        {/* Steps preview */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { icon: '📹', label: 'Record home' },
            { icon: '🔒', label: 'Lock evidence' },
            { icon: '💸', label: 'Fast payout' },
          ].map((s) => (
            <div key={s.label} className="glass rounded-xl p-3 text-center">
              <div className="text-xl mb-1">{s.icon}</div>
              <p className="text-[11px] text-white/70 font-body">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTAs */}
      <div className="w-full max-w-[430px] px-4 mt-auto pb-8 space-y-3 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <button
          onClick={() => nav('/walk')}
          className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark active:scale-95 transition-all text-white font-display font-700 text-lg rounded-2xl py-4 shadow-lg shadow-brand/30"
        >
          {tx.recordNow}
          <ChevronRight size={20} />
        </button>
        <button
          onClick={() => nav('/claim')}
          className="w-full text-white/50 hover:text-white/80 transition-colors font-body text-sm py-3"
        >
          {tx.doLater}
        </button>
      </div>
    </div>
  )
}
