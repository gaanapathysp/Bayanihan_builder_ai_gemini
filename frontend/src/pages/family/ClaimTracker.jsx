import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Circle, Loader2, ChevronRight, Satellite, Banknote, Video, Gavel, Shield } from 'lucide-react'
import { useLang } from '../../context/LangContext'
import { startClaim } from '../../api'

const STEPS = [
  { key: 'confirmed', icon: Satellite, label: 'stepConfirmed', detail: 'Typhoon Kiko flooding confirmed at your address via Sentinel-1 satellite radar.' },
  { key: 'advance',   icon: Banknote,  label: 'stepAdvance',   detail: null },
  { key: 'assess',    icon: Video,     label: 'stepAssess',    detail: 'Submit your damage walk video for AI comparison with your baseline.' },
  { key: 'decision',  icon: Gavel,     label: 'stepDecision',  detail: 'Human adjuster reviews the AI-generated dossier and approves your claim.' },
]

const DEMO_CLAIM = {
  claim_id: 'CLM-2024-' + Math.floor(Math.random() * 90000 + 10000),
  event_classification: 'confirmed',
  advance_paid_php: 10000,
}

export default function ClaimTracker() {
  const { tx } = useLang()
  const nav = useNavigate()
  const [activeStep, setActiveStep] = useState(0)
  const [claim, setClaim] = useState(DEMO_CLAIM)
  const [loading, setLoading] = useState(false)

  const status = (i) => i < activeStep ? 'done' : i === activeStep ? 'active' : 'pending'

  const handleStartClaim = async () => {
    setLoading(true)
    const baselineId = localStorage.getItem('bayanihan_baseline_id') || 'demo-baseline-001'
    try {
      const result = await startClaim({
        policy_id: 'demo-policy-001',
        event_id: 'EVT-KIKO-2024',
        baseline_id: baselineId,
        address_lat: 14.5995,
        address_lon: 120.9842,
        event_start_date: '2024-10-10',
        event_end_date: '2024-10-12',
      })
      localStorage.setItem('bayanihan_claim_id', result.claim_id)
      setClaim(result)
      setActiveStep(2)
    } catch {
      setActiveStep(2)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-dvh bg-navy font-body">

      {/* Header */}
      <div className="px-5 pt-[calc(env(safe-area-inset-top,0px)+16px)] pb-6 bg-gradient-to-b from-navy-mid to-transparent">
        <div className="flex items-center gap-2 mb-1">
          <Shield size={14} className="text-brand-light" />
          <span className="text-[10px] text-white/40 uppercase tracking-[0.15em] font-display font-600">Bayanihan</span>
        </div>
        <h1 className="text-2xl font-display font-700 text-white">{tx.claimTracker}</h1>
        {activeStep >= 1 && (
          <p className="text-xs text-safe-light font-body mt-1">
            Event confirmed · Advance issued
          </p>
        )}
      </div>

      <div className="max-w-lg mx-auto px-4 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] space-y-3 animate-fade-in">

        {/* Start claim CTA */}
        {activeStep === 0 && (
          <button onClick={handleStartClaim} disabled={loading}
            className="w-full mb-2 flex items-center justify-center gap-2.5 bg-brand active:bg-brand-dark active:scale-[0.98] transition-all text-white font-display font-700 text-[17px] rounded-2xl py-[17px] shadow-xl shadow-brand/35 disabled:opacity-60">
            {loading && <Loader2 size={20} className="animate-spin" />}
            {loading ? 'Confirming event…' : 'Confirm Event & Start Claim'}
          </button>
        )}

        {/* Stepper */}
        {STEPS.map((step, i) => {
          const s = status(i)
          const Icon = step.icon
          return (
            <div key={step.key}
              className={`rounded-2xl p-4 transition-all ${
                s === 'active' ? 'glass-strong border border-brand/40' :
                s === 'done'   ? 'glass border border-safe/20' :
                'glass opacity-50'
              }`}>
              <div className="flex items-start gap-3">

                {/* Circle indicator */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                  s === 'done'   ? 'bg-safe' :
                  s === 'active' ? 'bg-brand' :
                  'bg-white/10'
                }`}>
                  {s === 'done'
                    ? <CheckCircle2 size={18} className="text-white" />
                    : s === 'active'
                    ? <Icon size={17} className="text-white" />
                    : <Circle size={18} className="text-white/25" />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-[14px] font-display font-600 ${s === 'pending' ? 'text-white/30' : 'text-white'}`}>
                      {tx[step.label]}
                    </p>
                    {s === 'done' && (
                      <span className="text-[10px] text-safe-light font-mono-dm shrink-0">✓ Done</span>
                    )}
                  </div>

                  {/* Emergency advance */}
                  {step.key === 'advance' && s !== 'pending' && (
                    <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                      <span className="bg-[#00B14F] text-white text-xs font-display font-700 px-3 py-1 rounded-full">
                        GCash
                      </span>
                      <span className="text-[13px] text-white/80 font-body">
                        PHP {(claim?.advance_paid_php || 10000).toLocaleString()} sent
                      </span>
                      <span className="text-[11px] text-white/35 font-body">(emergency advance)</span>
                    </div>
                  )}

                  {/* Step detail */}
                  {s === 'active' && step.detail && (
                    <p className="text-[12px] text-white/45 mt-1.5 leading-snug font-body">{step.detail}</p>
                  )}

                  {/* Damage action button */}
                  {step.key === 'assess' && s === 'active' && (
                    <button
                      onClick={() => {
                        const claimId = claim?.claim_id || localStorage.getItem('bayanihan_claim_id')
                        nav(`/walk?mode=damage&claim_id=${claimId}`)
                      }}
                      className="mt-3 flex items-center gap-1.5 bg-brand text-white text-[13px] font-display font-600 px-4 py-2.5 rounded-xl active:scale-95 transition-all shadow-lg shadow-brand/30">
                      <Video size={14} />
                      {tx.recordDamage}
                      <ChevronRight size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* Claim ID footer */}
        <div className="pt-2 pb-1 text-center">
          <p className="text-[10px] text-white/25 font-mono-dm uppercase tracking-widest mb-0.5">{tx.claimId}</p>
          <p className="text-xs text-white/40 font-mono-dm">{claim?.claim_id}</p>
        </div>
      </div>
    </div>
  )
}
