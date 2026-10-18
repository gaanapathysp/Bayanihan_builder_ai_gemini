import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { CheckCircle2, XCircle, AlertTriangle, Satellite, CloudRain, Wind, Gavel, FileText, Shield } from 'lucide-react'
import { submitDecision } from '../../api'

const DEMO = {
  claim_id: 'CLM-2024-48291',
  policy_holder: 'Maria Santos',
  fraud_route: 'review',
  fraud_score: 38,
  fraud_flags: [
    { check: 'low_confidence', detail: '2 damage findings have confidence below 0.6 — adjuster review recommended.' },
  ],
  net_payable_php: 43500,
  coverage_items: [
    { item: 'Television (42")',  damage_description: 'Water damage, screen cracked',  covered: true,  clause: 'Sec 3.1', replacement_cost_php: 25000, payable_php: 17500 },
    { item: 'Sofa (3-seater)',   damage_description: 'Waterlogged, mold forming',     covered: true,  clause: 'Sec 3.1', replacement_cost_php: 18000, payable_php: 12600 },
    { item: 'Refrigerator',      damage_description: 'Motor failure from flooding',   covered: true,  clause: 'Sec 3.1', replacement_cost_php: 30000, payable_php: 21000 },
    { item: 'Jewellery set',     damage_description: 'Missing after flood',           covered: false, clause: 'Sec 4.3', replacement_cost_php: 15000, payable_php: 0 },
    { item: 'Dining Table',      damage_description: 'Warped, legs damaged',          covered: true,  clause: 'Sec 3.1', replacement_cost_php: 12000, payable_php: 9400 },
  ],
  weather: { rainfall_mm: 182, wind_kph: 134 },
  deductible_php: 5000,
  advance_paid_php: 10000,
}

const BADGE = {
  clear:  { label: 'CLEAR',  cls: 'bg-safe text-white' },
  review: { label: 'REVIEW', cls: 'bg-storm-amber text-white' },
  hold:   { label: 'HOLD',   cls: 'bg-storm text-white' },
}

const TABS = [
  { id: 'evidence', label: 'Evidence',  icon: Satellite },
  { id: 'coverage', label: 'Coverage',  icon: FileText },
  { id: 'decision', label: 'Decision',  icon: Gavel },
]

export default function Dossier() {
  const { state } = useLocation()
  const [data] = useState(() => ({ ...DEMO, ...(state || {}) }))
  const [decided, setDecided] = useState(null)
  const [adjReason, setAdjReason] = useState('')
  const [tab, setTab] = useState('evidence')
  const badge = BADGE[data.fraud_route] || BADGE.review

  const decide = async (outcome) => {
    try {
      await submitDecision(data.claim_id, { adjuster_id: 'ADJ-001', outcome, amount_php: data.net_payable_php, reason: adjReason })
    } catch {}
    setDecided(outcome)
  }

  if (decided) return (
    <div className="min-h-dvh bg-navy flex items-center justify-center font-body px-6">
      <div className="text-center animate-fade-in">
        {decided === 'approved'
          ? <CheckCircle2 size={64} className="text-safe mx-auto mb-5" />
          : <XCircle size={64} className="text-storm mx-auto mb-5" />}
        <h2 className="text-3xl font-display font-700 text-white mb-3">
          Claim {decided === 'approved' ? 'Approved' : decided === 'adjusted' ? 'Adjusted' : 'Declined'}
        </h2>
        {decided !== 'declined' && (
          <p className="text-safe-light text-xl font-display font-600">
            PHP {data.net_payable_php.toLocaleString()} authorized
          </p>
        )}
      </div>
    </div>
  )

  /* ── Evidence panel ── */
  const EvidencePanel = () => (
    <div className="space-y-4">
      {/* Before / After */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'BEFORE', time: '10:14 AM', emoji: '🏠', sub: 'Pre-storm baseline', color: 'bg-white/5 text-white/50' },
          { label: 'AFTER',  time: '3:42 PM',  emoji: '🏚️', sub: 'Damage walk',       color: 'bg-storm/20 text-storm-amber' },
        ].map(v => (
          <div key={v.label} className="glass rounded-2xl overflow-hidden">
            <div className={`${v.color} px-3 py-1.5 text-[10px] font-mono-dm flex justify-between`}>
              <span>{v.label}</span><span>{v.time}</span>
            </div>
            <div className="aspect-video bg-navy-mid flex items-center justify-center relative">
              <div className="text-center">
                <div className="text-3xl mb-1">{v.emoji}</div>
                <p className="text-[10px] text-white/30 font-body">{v.sub}</p>
              </div>
              {v.label === 'AFTER' && (
                <div className="absolute left-0 right-0 border-t border-dashed border-brand/50" style={{ top:'62%' }}>
                  <span className="absolute right-1.5 -top-4 text-[9px] text-brand font-mono-dm">~40cm</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Weather */}
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <CloudRain size={14} className="text-brand-light" />
          <p className="text-xs text-white/60 font-display font-600">Weather at Address</p>
        </div>
        {[
          { label: 'Rainfall', value: data.weather.rainfall_mm, unit: 'mm', max: 220, color: 'bg-brand', ok: data.weather.rainfall_mm >= 150 },
          { label: 'Max Wind', value: data.weather.wind_kph,    unit: 'km/h', max: 200, color: 'bg-storm-amber', ok: data.weather.wind_kph >= 118 },
        ].map(w => (
          <div key={w.label} className="mb-3 last:mb-0">
            <div className="flex justify-between text-[11px] text-white/50 mb-1.5">
              <span className="flex items-center gap-1"><Wind size={10}/>{w.label}</span>
              <span className="font-mono-dm text-white font-500">{w.value}{w.unit}</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className={`h-full ${w.color} rounded-full`} style={{ width:`${Math.min(w.value/w.max*100,100)}%` }} />
            </div>
            {w.ok && <p className="text-[10px] text-safe-light mt-1">✓ Meets confirmation threshold</p>}
          </div>
        ))}
      </div>

      {/* Satellite */}
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Satellite size={14} className="text-brand-light" />
          <p className="text-xs text-white/60 font-display font-600">Sentinel-1 Flood Map</p>
        </div>
        <div className="aspect-video rounded-xl bg-navy-mid relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-navy to-navy-light" />
          <div className="absolute w-20 h-20 rounded-full bg-brand/25 blur-2xl top-1/3 left-1/3" />
          <div className="absolute w-12 h-12 rounded-full bg-brand/20 blur-xl top-1/2 left-1/2" />
          <div className="absolute w-3 h-3 rounded-full bg-storm-amber border-2 border-white shadow-lg" style={{ top:'48%', left:'46%' }} />
          <p className="absolute bottom-2 left-3 text-[10px] text-white/35 font-mono-dm">Flooded area: 34%</p>
        </div>
        <p className="text-[11px] text-safe-light mt-2">✓ Flood confirmed at insured address</p>
      </div>

      {/* Integrity flags */}
      {data.fraud_flags.length > 0 && (
        <div>
          <p className="text-[10px] text-white/35 uppercase tracking-widest font-display font-600 mb-2">Integrity Flags</p>
          {data.fraud_flags.map((f, i) => (
            <div key={i} className="bg-storm-amber/10 border border-storm-amber/25 rounded-xl p-3 flex gap-2.5 mb-2">
              <AlertTriangle size={14} className="text-storm-amber shrink-0 mt-0.5" />
              <p className="text-xs text-white/80 font-body leading-snug">{f.detail}</p>
            </div>
          ))}
        </div>
      )}

      {/* Data sources */}
      <div className="glass rounded-xl p-3">
        <p className="text-[10px] text-white/35 font-mono-dm uppercase tracking-wider mb-2">Data Sources</p>
        <div className="space-y-1 text-[11px] text-white/50 font-body">
          <p>📡 Sentinel-1 SAR · 5 days post-landfall</p>
          <p>🌦 Open-Meteo Historical API</p>
          <p>📋 PAGASA TCWS Bulletin</p>
        </div>
      </div>
    </div>
  )

  /* ── Coverage panel ── */
  const CoveragePanel = () => (
    <div className="space-y-4">
      <div className="glass rounded-2xl overflow-hidden">
        <table className="w-full text-xs font-body">
          <thead>
            <tr className="bg-white/5 text-white/40 text-left">
              <th className="px-3 py-2.5">Item</th>
              <th className="px-3 py-2.5 hidden sm:table-cell">Clause</th>
              <th className="px-3 py-2.5 text-right">PHP</th>
            </tr>
          </thead>
          <tbody>
            {data.coverage_items.map((item, i) => (
              <tr key={i} className={`border-t border-white/5 ${!item.covered ? 'opacity-40' : ''}`}>
                <td className="px-3 py-3">
                  <div className="flex items-start gap-2">
                    {item.covered
                      ? <CheckCircle2 size={13} className="text-safe shrink-0 mt-0.5" />
                      : <XCircle size={13} className="text-storm shrink-0 mt-0.5" />}
                    <div>
                      <p className="text-white/90 font-500 leading-tight">{item.item}</p>
                      <p className="text-white/35 text-[10px] leading-tight mt-0.5">{item.damage_description}</p>
                      <span className="sm:hidden font-mono-dm text-[10px] text-brand-light bg-brand/10 px-1.5 py-0.5 rounded mt-1 inline-block">{item.clause}</span>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 hidden sm:table-cell">
                  <span className="font-mono-dm text-[10px] text-brand-light bg-brand/10 px-1.5 py-0.5 rounded">{item.clause}</span>
                </td>
                <td className="px-3 py-3 text-right font-mono-dm whitespace-nowrap">
                  {item.covered
                    ? <span className="text-safe-light">{item.payable_php.toLocaleString()}</span>
                    : <span className="text-white/25 line-through">{item.replacement_cost_php.toLocaleString()}</span>}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-white/10 bg-white/5">
              <td colSpan={2} className="px-3 py-2.5 text-white/55 font-display font-600">Subtotal</td>
              <td className="px-3 py-2.5 text-right font-mono-dm text-white font-500">
                {data.coverage_items.reduce((s, i) => s + i.payable_php, 0).toLocaleString()}
              </td>
            </tr>
            <tr className="border-t border-white/5">
              <td colSpan={2} className="px-3 py-2 text-white/35 text-[11px]">Deductible</td>
              <td className="px-3 py-2 text-right font-mono-dm text-storm text-[11px]">−{data.deductible_php.toLocaleString()}</td>
            </tr>
            <tr>
              <td colSpan={2} className="px-3 py-2 text-white/35 text-[11px]">Emergency advance (paid)</td>
              <td className="px-3 py-2 text-right font-mono-dm text-storm text-[11px]">−{data.advance_paid_php.toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Net payable highlight */}
      <div className="glass-strong rounded-2xl px-4 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-white/40 font-body mb-0.5">Net Payable</p>
          <p className="text-2xl font-display font-800 text-white">PHP {data.net_payable_php.toLocaleString()}</p>
        </div>
        <Shield size={24} className="text-white/15" />
      </div>
    </div>
  )

  /* ── Decision panel ── */
  const DecisionPanel = () => (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-4">
        <p className="text-xs text-white/40 font-display font-600 mb-3">Adjuster Notes</p>
        <textarea
          placeholder="Reason for adjustment or decline (required if not approving)…"
          value={adjReason}
          onChange={e => setAdjReason(e.target.value)}
          className="w-full glass rounded-xl px-3 py-3 text-[13px] text-white/80 font-body resize-none h-24 focus:outline-none placeholder-white/20 bg-transparent"
        />
      </div>

      <div className="grid grid-cols-1 gap-3">
        <button onClick={() => decide('approved')}
          className="w-full flex items-center justify-center gap-2.5 bg-safe active:bg-green-700 active:scale-[0.98] transition-all text-white font-display font-700 text-[16px] rounded-2xl py-[16px] shadow-xl shadow-green-900/30">
          <CheckCircle2 size={18} />
          Approve · PHP {data.net_payable_php.toLocaleString()}
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => decide('adjusted')}
            className="flex items-center justify-center gap-2 glass active:bg-white/10 active:scale-[0.98] transition-all text-white font-display font-600 text-[14px] rounded-xl py-3.5">
            Adjust
          </button>
          <button onClick={() => decide('declined')}
            className="flex items-center justify-center gap-2 border border-storm/40 active:bg-storm/10 active:scale-[0.98] transition-all text-storm font-display font-600 text-[14px] rounded-xl py-3.5">
            Decline
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-dvh bg-navy font-body flex flex-col">

      {/* Top bar */}
      <div className="bg-navy-mid border-b border-white/5 px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-3">
        <div className="max-w-4xl mx-auto flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] text-white/35 font-mono-dm uppercase tracking-widest mb-0.5">{data.claim_id}</p>
            <h1 className="text-lg font-display font-700 text-white leading-tight">{data.policy_holder}</h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`${badge.cls} text-xs font-display font-700 px-3 py-1 rounded-full`}>
              {badge.label} · {data.fraud_score}
            </span>
            <span className="text-[10px] text-white/30 font-body hidden sm:block">Adjuster Console</span>
          </div>
        </div>
      </div>

      {/* Desktop 3-col / Mobile tabs */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-4">

        {/* Mobile tab bar */}
        <div className="flex gap-1 mb-4 glass rounded-2xl p-1 lg:hidden">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[12px] font-display font-600 transition-all ${
                  tab === t.id ? 'bg-brand text-white shadow' : 'text-white/40 active:text-white/70'
                }`}>
                <Icon size={13} />
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Mobile: single panel */}
        <div className="lg:hidden pb-[calc(env(safe-area-inset-bottom,0px)+16px)]">
          {tab === 'evidence' && <EvidencePanel />}
          {tab === 'coverage' && <CoveragePanel />}
          {tab === 'decision' && <DecisionPanel />}
        </div>

        {/* Desktop: 3-col grid */}
        <div className="hidden lg:grid grid-cols-3 gap-4 pb-6">
          <div className="overflow-y-auto max-h-[calc(100dvh-160px)] space-y-4 pr-1">
            <p className="text-[10px] text-white/35 uppercase tracking-widest font-display font-600 mb-2">Video Evidence</p>
            <EvidencePanel />
          </div>
          <div className="overflow-y-auto max-h-[calc(100dvh-160px)] space-y-4 pr-1">
            <p className="text-[10px] text-white/35 uppercase tracking-widest font-display font-600 mb-2">Coverage Assessment</p>
            <CoveragePanel />
          </div>
          <div className="overflow-y-auto max-h-[calc(100dvh-160px)] space-y-4 pr-1">
            <p className="text-[10px] text-white/35 uppercase tracking-widest font-display font-600 mb-2">Decision</p>
            <DecisionPanel />
          </div>
        </div>
      </div>
    </div>
  )
}
