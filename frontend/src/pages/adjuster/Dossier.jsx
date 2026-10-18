import { useState } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Satellite, CloudRain, Wind, ChevronDown, Gavel } from 'lucide-react'
import { submitDecision } from '../../api'

const DEMO = {
  claim_id: 'CLM-2024-48291',
  policy_holder: 'Maria Santos',
  fraud_route: 'review',
  fraud_score: 38,
  fraud_flags: [
    { check: 'low_confidence', detail: '2 damage findings have confidence below 0.6 — adjuster review needed.' },
  ],
  net_payable_php: 43500,
  coverage_items: [
    { item: 'Television (42")', damage_description: 'Water damage, screen cracked', covered: true, clause: 'Sec 3.1', replacement_cost_php: 25000, depreciation_php: 7500, payable_php: 17500 },
    { item: 'Sofa (3-seater)', damage_description: 'Waterlogged, mold forming', covered: true, clause: 'Sec 3.1', replacement_cost_php: 18000, depreciation_php: 5400, payable_php: 12600 },
    { item: 'Refrigerator', damage_description: 'Motor failure from flooding', covered: true, clause: 'Sec 3.1', replacement_cost_php: 30000, depreciation_php: 9000, payable_php: 21000 },
    { item: 'Jewellery set', damage_description: 'Missing after flood', covered: false, clause: 'Sec 4.3 excl.', replacement_cost_php: 15000, depreciation_php: 0, payable_php: 0 },
    { item: 'Dining Table', damage_description: 'Warped, legs damaged', covered: true, clause: 'Sec 3.1', replacement_cost_php: 12000, depreciation_php: 2600, payable_php: 9400 },
  ],
  weather: { rainfall_mm: 182, wind_kph: 134 },
  deductible_php: 5000,
  advance_paid_php: 10000,
}

const FRAUD_BADGE = {
  clear:  { label: 'CLEAR',  bg: 'bg-safe',         text: 'text-white' },
  review: { label: 'REVIEW', bg: 'bg-storm-amber',   text: 'text-white' },
  hold:   { label: 'HOLD',   bg: 'bg-storm',         text: 'text-white' },
}

export default function Dossier() {
  const [data] = useState(DEMO)
  const [decided, setDecided] = useState(null)
  const [adjReason, setAdjReason] = useState('')
  const badge = FRAUD_BADGE[data.fraud_route] || FRAUD_BADGE.review

  const decide = async (outcome) => {
    try {
      await submitDecision(data.claim_id, { adjuster_id: 'ADJ-001', outcome, amount_php: data.net_payable_php, reason: adjReason })
    } catch {}
    setDecided(outcome)
  }

  if (decided) return (
    <div className="min-h-screen bg-navy flex items-center justify-center font-body">
      <div className="text-center animate-fade-in">
        {decided === 'approved'
          ? <CheckCircle2 size={56} className="text-safe mx-auto mb-4" />
          : <XCircle size={56} className="text-storm mx-auto mb-4" />}
        <h2 className="text-2xl font-display font-700 text-white mb-2">
          Claim {decided === 'approved' ? 'Approved' : decided === 'adjusted' ? 'Adjusted' : 'Declined'}
        </h2>
        {decided === 'approved' && (
          <p className="text-safe-light text-lg font-display">PHP {data.net_payable_php.toLocaleString()} authorized</p>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-navy font-body">
      {/* Top bar */}
      <div className="bg-navy-mid border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs text-white/40 font-mono-dm uppercase">{data.claim_id}</p>
            <h1 className="text-lg font-display font-700 text-white">{data.policy_holder}</h1>
          </div>
          <span className={`${badge.bg} ${badge.text} text-xs font-display font-700 px-3 py-1 rounded-full`}>
            {badge.label} · Score {data.fraud_score}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Gavel size={16} className="text-white/40" />
          <span className="text-xs text-white/40 font-body">Adjuster Console</span>
        </div>
      </div>

      {/* 3-column grid */}
      <div className="grid grid-cols-3 gap-4 p-6 h-[calc(100vh-140px)] overflow-hidden">

        {/* LEFT — Before / After */}
        <div className="flex flex-col gap-4 overflow-y-auto">
          <p className="text-xs text-white/40 uppercase tracking-wider font-display">Video Evidence</p>
          <div className="glass rounded-xl overflow-hidden">
            <div className="bg-navy-light px-3 py-2 text-xs text-white/50 font-mono-dm flex justify-between">
              <span>BEFORE</span><span>10:14 AM</span>
            </div>
            <div className="aspect-video bg-navy-mid flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl mb-2">🏠</div>
                <p className="text-xs text-white/30 font-body">Baseline — pre-storm</p>
              </div>
            </div>
          </div>
          <div className="glass rounded-xl overflow-hidden">
            <div className="bg-storm/20 px-3 py-2 text-xs text-storm-amber font-mono-dm flex justify-between">
              <span>AFTER</span><span>3:42 PM</span>
            </div>
            <div className="aspect-video bg-navy-mid flex items-center justify-center relative">
              <div className="text-center">
                <div className="text-3xl mb-2">🏚️</div>
                <p className="text-xs text-white/30 font-body">Damage walk</p>
              </div>
              {/* Water line marker */}
              <div className="absolute left-0 right-0 border-t-2 border-dashed border-brand/60" style={{ top: '65%' }}>
                <span className="absolute right-2 -top-4 text-[10px] text-brand font-mono-dm">~40cm waterline</span>
              </div>
            </div>
          </div>

          {/* Fraud flags */}
          {data.fraud_flags.length > 0 && (
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider font-display mb-2">Integrity Flags</p>
              {data.fraud_flags.map((f, i) => (
                <div key={i} className="bg-storm-amber/10 border border-storm-amber/30 rounded-xl p-3 flex gap-2 mb-2">
                  <AlertTriangle size={14} className="text-storm-amber shrink-0 mt-0.5" />
                  <p className="text-xs text-white/80 font-body leading-snug">{f.detail}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CENTER — Coverage table */}
        <div className="flex flex-col gap-4 overflow-y-auto">
          <p className="text-xs text-white/40 uppercase tracking-wider font-display">Coverage Assessment</p>
          <div className="glass rounded-xl overflow-hidden">
            <table className="w-full text-xs font-body">
              <thead>
                <tr className="bg-white/5 text-white/40 text-left">
                  <th className="px-3 py-2">Item</th>
                  <th className="px-3 py-2">Clause</th>
                  <th className="px-3 py-2 text-right">PHP</th>
                </tr>
              </thead>
              <tbody>
                {data.coverage_items.map((item, i) => (
                  <tr key={i} className={`border-t border-white/5 ${!item.covered ? 'opacity-40' : ''}`}>
                    <td className="px-3 py-2.5">
                      <div className="flex items-start gap-1.5">
                        {item.covered
                          ? <CheckCircle2 size={12} className="text-safe shrink-0 mt-0.5" />
                          : <XCircle size={12} className="text-storm shrink-0 mt-0.5" />
                        }
                        <div>
                          <p className="text-white/90 font-500">{item.item}</p>
                          <p className="text-white/40 text-[11px] leading-tight mt-0.5">{item.damage_description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-mono-dm text-[10px] text-brand-light bg-brand/10 px-1.5 py-0.5 rounded">{item.clause}</span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono-dm">
                      {item.covered
                        ? <span className="text-safe-light">{item.payable_php.toLocaleString()}</span>
                        : <span className="text-white/30 line-through">{item.replacement_cost_php.toLocaleString()}</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-white/10 bg-white/5">
                  <td colSpan={2} className="px-3 py-2.5 text-white/60 font-display font-600">Subtotal</td>
                  <td className="px-3 py-2.5 text-right font-mono-dm text-white font-500">
                    {data.coverage_items.reduce((s, i) => s + i.payable_php, 0).toLocaleString()}
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td colSpan={2} className="px-3 py-1.5 text-white/40 text-[11px]">Deductible</td>
                  <td className="px-3 py-1.5 text-right font-mono-dm text-storm text-[11px]">−{data.deductible_php.toLocaleString()}</td>
                </tr>
                <tr>
                  <td colSpan={2} className="px-3 py-1.5 text-white/40 text-[11px]">Emergency advance</td>
                  <td className="px-3 py-1.5 text-right font-mono-dm text-storm text-[11px]">−{data.advance_paid_php.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Adjuster notes */}
          <textarea
            placeholder="Reason for adjustment or decline (required if not approving)…"
            value={adjReason}
            onChange={e => setAdjReason(e.target.value)}
            className="glass rounded-xl px-3 py-2.5 text-xs text-white/80 font-body resize-none h-20 focus:outline-none focus:border-brand/50 placeholder-white/20"
          />
        </div>

        {/* RIGHT — Evidence panel */}
        <div className="flex flex-col gap-4 overflow-y-auto">
          <p className="text-xs text-white/40 uppercase tracking-wider font-display">Independent Evidence</p>

          {/* Weather */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <CloudRain size={14} className="text-brand-light" />
              <p className="text-xs text-white/60 font-display font-600">Weather at Address</p>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Rainfall', value: data.weather.rainfall_mm, unit: 'mm', max: 200, color: 'bg-brand', threshold: 150 },
                { label: 'Max Wind', value: data.weather.wind_kph, unit: 'km/h', max: 200, color: 'bg-storm-amber', threshold: 118 },
              ].map(w => (
                <div key={w.label}>
                  <div className="flex justify-between text-[11px] text-white/50 mb-1">
                    <span className="flex items-center gap-1">
                      <Wind size={10} />{w.label}
                    </span>
                    <span className="font-mono-dm text-white">{w.value}{w.unit}</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className={`h-full ${w.color} rounded-full transition-all`} style={{ width: `${Math.min(w.value / w.max * 100, 100)}%` }} />
                  </div>
                  {w.value >= w.threshold && (
                    <p className="text-[10px] text-safe-light mt-0.5">✓ Meets confirmation threshold</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Satellite */}
          <div className="glass rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Satellite size={14} className="text-brand-light" />
              <p className="text-xs text-white/60 font-display font-600">Sentinel-1 Flood Map</p>
            </div>
            <div className="aspect-square rounded-lg bg-navy-mid flex items-center justify-center relative overflow-hidden">
              {/* Simulated flood map */}
              <div className="absolute inset-0 bg-gradient-to-br from-navy to-navy-light" />
              <div className="absolute w-16 h-16 rounded-full bg-brand/30 blur-xl top-1/3 left-1/3" />
              <div className="absolute w-12 h-12 rounded-full bg-brand/20 blur-lg top-1/2 left-1/2" />
              <div className="absolute w-3 h-3 rounded-full bg-storm-amber border-2 border-white shadow-lg" style={{ top: '48%', left: '46%' }} />
              <p className="absolute bottom-2 left-2 text-[10px] text-white/30 font-mono-dm">Flooded area: 34%</p>
            </div>
            <p className="text-[11px] text-safe-light mt-2">✓ Flood confirmed at insured address</p>
          </div>

          {/* Source credibility */}
          <div className="glass rounded-xl p-3">
            <p className="text-[10px] text-white/40 font-mono-dm uppercase tracking-wider mb-2">Data Sources</p>
            <div className="space-y-1.5 text-[11px] text-white/50 font-body">
              <p>📡 Sentinel-1 SAR · 5 days post-landfall</p>
              <p>🌦 Open-Meteo Historical API</p>
              <p>📋 PAGASA TCWS Bulletin</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-navy-mid border-t border-white/5 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-white/40 font-body">Net Payable</p>
          <p className="text-2xl font-display font-800 text-white">
            PHP {data.net_payable_php.toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => decide('declined')}
            className="px-5 py-2.5 rounded-xl border border-storm/40 text-storm hover:bg-storm/10 active:scale-95 transition-all font-display font-600 text-sm">
            Decline
          </button>
          <button onClick={() => decide('adjusted')}
            className="px-5 py-2.5 rounded-xl glass text-white hover:bg-white/10 active:scale-95 transition-all font-display font-600 text-sm">
            Adjust
          </button>
          <button onClick={() => decide('approved')}
            className="px-6 py-2.5 rounded-xl bg-safe hover:bg-green-700 active:scale-95 transition-all text-white font-display font-700 text-sm shadow-lg shadow-safe/30 flex items-center gap-2">
            <CheckCircle2 size={16} />
            Approve PHP {data.net_payable_php.toLocaleString()}
          </button>
        </div>
      </div>
    </div>
  )
}
