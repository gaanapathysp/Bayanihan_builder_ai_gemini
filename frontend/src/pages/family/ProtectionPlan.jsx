import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle2, Shield, Copy, Check, ChevronRight, ArrowUpToLine, Unplug, FolderLock, Home } from 'lucide-react'
import { useLang } from '../../context/LangContext'

const ACTION_ICONS = [ArrowUpToLine, Unplug, FolderLock, Shield, Home]

const MOCK = {
  baseline_id: 'demo-' + Date.now(),
  sha256: 'a3f1d2e9b8c7045612efab34cd90fe1278563412abcdef0987654321fedcba98',
  rooms_seen: ['living', 'kitchen', 'bed1', 'bed2'],
  coaching_actions: [
    'Lift the TV onto the table',
    'Move important documents to an upper shelf',
    'Unplug all appliances before flooding',
    'Switch off main breaker',
  ],
  items_found: 12,
}

const ROOM_LABELS = {
  living: 'Living Room', kitchen: 'Kitchen', bed1: 'Bedroom 1', bed2: 'Bedroom 2',
}

export default function ProtectionPlan() {
  const { tx } = useLang()
  const { state } = useLocation()
  const nav = useNavigate()
  const data = state || MOCK
  const [copied, setCopied] = useState(false)
  const now = new Date().toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })

  const share = () => {
    const text = `🏠 ${tx.homeRecorded}\n${tx.evidenceLocked} ${now}\n\nProtection Plan:\n${(data.coaching_actions || []).map((a, i) => `${i + 1}. ${a}`).join('\n')}`
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="min-h-dvh bg-navy font-body">

      {/* Success header */}
      <div className="bg-gradient-to-br from-[#15803D] to-[#16A34A] px-5 pt-[calc(env(safe-area-inset-top,0px)+20px)] pb-8 animate-fade-in">
        <div className="max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center mb-4">
            <CheckCircle2 size={34} className="text-white" />
          </div>
          <h1 className="text-2xl font-display font-700 text-white mb-1">{tx.homeRecorded}</h1>
          <p className="text-sm text-white/65 font-body">{tx.evidenceLocked} {now}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-4 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] space-y-4 animate-slide-up">

        {/* Hash seal */}
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <Shield size={14} className="text-safe-light" />
            <span className="text-[10px] text-white/40 uppercase tracking-[0.15em] font-display font-600">
              {tx.tamperProof}
            </span>
          </div>
          <p className="font-mono-dm text-[11px] text-safe-light break-all leading-relaxed">
            {data.sha256?.slice(0, 40)}…
          </p>
          <p className="text-[10px] text-white/30 font-body mt-1.5">SHA-256 · Blockchain-grade evidence seal</p>
        </div>

        {/* Rooms */}
        <div>
          <p className="text-[10px] text-white/35 uppercase tracking-[0.15em] font-display font-600 mb-2.5">Rooms Recorded</p>
          <div className="flex flex-wrap gap-2">
            {(data.rooms_seen || []).map(r => (
              <span key={r}
                className="flex items-center gap-1.5 bg-safe/15 border border-safe/20 text-safe-light text-xs font-body px-3 py-1.5 rounded-full">
                <CheckCircle2 size={11} />
                {ROOM_LABELS[r] || r}
              </span>
            ))}
          </div>
        </div>

        {/* Items count */}
        <div className="glass rounded-2xl px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-white/55 font-body">Items catalogued by AI</span>
          <span className="font-display font-700 text-white">{data.items_found || 0} items</span>
        </div>

        {/* Coaching actions */}
        <div>
          <p className="text-[10px] text-white/35 uppercase tracking-[0.15em] font-display font-600 mb-2.5">{tx.yourPlan}</p>
          <div className="space-y-2">
            {(data.coaching_actions || []).map((action, i) => {
              const Icon = ACTION_ICONS[i % ACTION_ICONS.length]
              return (
                <div key={i}
                  className="glass rounded-2xl p-3.5 flex items-center gap-3 animate-slide-up"
                  style={{ animationDelay: `${i * 0.07}s` }}>
                  <div className="w-9 h-9 rounded-xl bg-storm-amber/15 flex items-center justify-center shrink-0">
                    <Icon size={15} className="text-storm-amber" />
                  </div>
                  <p className="text-[13px] text-white/85 font-body leading-snug flex-1">{action}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3 pt-1">
          <button onClick={share}
            className="w-full flex items-center justify-center gap-2 glass active:bg-white/10 active:scale-[0.98] transition-all text-white font-display font-600 text-[15px] rounded-2xl py-4">
            {copied
              ? <><Check size={18} className="text-safe-light" /> Copied to clipboard!</>
              : <><Copy size={18} /> {tx.sharePlan}</>}
          </button>
          <button onClick={() => nav('/claim')}
            className="w-full flex items-center justify-center gap-2.5 bg-brand active:bg-brand-dark active:scale-[0.98] transition-all text-white font-display font-700 text-[17px] rounded-2xl py-[17px] shadow-xl shadow-brand/35">
            {tx.startClaim} <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}
