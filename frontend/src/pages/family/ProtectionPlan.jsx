import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CheckCircle2, Shield, Copy, Check, ChevronRight, ArrowUpToLine, Unplug, FolderLock } from 'lucide-react'
import { useLang } from '../../context/LangContext'

const ACTION_ICONS = [ArrowUpToLine, Unplug, FolderLock, Shield]

const MOCK = {
  baseline_id: 'demo-' + Date.now(),
  sha256: 'a3f1d2e9b8c7045612efab34cd90fe1278563412abcdef0987654321fedcba98',
  rooms_seen: ['living', 'kitchen', 'bed1', 'bed2'],
  coaching_actions: ['Lift the TV onto the table', 'Move important documents to an upper shelf', 'Unplug all appliances before flooding', 'Switch off main breaker'],
  items_found: 12,
}

export default function ProtectionPlan() {
  const { tx } = useLang()
  const { state } = useLocation()
  const nav = useNavigate()
  const data = state || MOCK
  const [copied, setCopied] = useState(false)
  const now = new Date().toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })

  const share = () => {
    const text = `🏠 ${tx.homeRecorded}\n${tx.evidenceLocked} ${now}\n\n${tx.yourPlan}:\n${data.coaching_actions?.map((a, i) => `${i + 1}. ${a}`).join('\n')}`
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
  }

  return (
    <div className="min-h-screen bg-navy font-body pb-10">
      {/* Success header */}
      <div className="bg-gradient-to-br from-safe to-green-700 px-4 pt-14 pb-8 animate-fade-in">
        <div className="max-w-[430px] mx-auto">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center mb-4">
            <CheckCircle2 size={32} className="text-white fill-white/20" />
          </div>
          <h1 className="text-2xl font-display font-700 text-white mb-1">{tx.homeRecorded}</h1>
          <p className="text-sm text-white/70">{tx.evidenceLocked} {now}</p>
        </div>
      </div>

      <div className="max-w-[430px] mx-auto px-4 mt-5 space-y-4 animate-slide-up">
        {/* Hash seal */}
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={14} className="text-safe-light" />
            <span className="text-xs text-white/50 uppercase tracking-wider font-display">{tx.tamperProof}</span>
          </div>
          <p className="font-mono-dm text-xs text-safe-light break-all leading-relaxed">
            {data.sha256?.slice(0, 32)}…
          </p>
        </div>

        {/* Rooms recorded */}
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wider font-display mb-2">Rooms Recorded</p>
          <div className="flex flex-wrap gap-2">
            {(data.rooms_seen || []).map(r => (
              <span key={r} className="flex items-center gap-1 bg-safe/20 text-safe-light text-xs font-body px-3 py-1.5 rounded-full">
                <CheckCircle2 size={11} /> {r.replace('bed', 'Bedroom ').replace('living', 'Living Room').replace('kitchen', 'Kitchen')}
              </span>
            ))}
          </div>
        </div>

        {/* Protection actions */}
        <div>
          <p className="text-xs text-white/40 uppercase tracking-wider font-display mb-3">{tx.yourPlan}</p>
          <div className="space-y-2">
            {(data.coaching_actions || []).map((action, i) => {
              const Icon = ACTION_ICONS[i % ACTION_ICONS.length]
              return (
                <div key={i} className="glass rounded-xl p-3 flex items-start gap-3 animate-slide-up"
                  style={{ animationDelay: `${i * 0.06}s` }}>
                  <div className="w-8 h-8 rounded-lg bg-storm-amber/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Icon size={15} className="text-storm-amber" />
                  </div>
                  <p className="text-sm text-white/90 font-body leading-snug pt-1">{action}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Items count */}
        <div className="glass rounded-xl p-3 flex items-center justify-between">
          <span className="text-sm text-white/60">Items catalogued</span>
          <span className="font-display font-700 text-white">{data.items_found || 0} items</span>
        </div>

        {/* Buttons */}
        <div className="space-y-3 pt-2">
          <button onClick={share}
            className="w-full flex items-center justify-center gap-2 glass hover:bg-white/10 active:scale-95 transition-all text-white font-display font-600 rounded-2xl py-3.5">
            {copied ? <Check size={18} className="text-safe-light" /> : <Copy size={18} />}
            {copied ? 'Copied!' : tx.sharePlan}
          </button>
          <button onClick={() => nav('/claim')}
            className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark active:scale-95 transition-all text-white font-display font-700 text-lg rounded-2xl py-4 shadow-lg shadow-brand/30">
            {tx.startClaim} <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}
