import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Circle, Loader2, ChevronRight, Satellite, Banknote, Video, Gavel } from 'lucide-react'
import { useLang } from '../../context/LangContext'
import { startClaim } from '../../api'

const STEPS = [
  { key: 'confirmed', icon: Satellite, label: 'stepConfirmed', detail: 'Typhoon Kiko flooding confirmed at your address via satellite radar.' },
  { key: 'advance',   icon: Banknote,  label: 'stepAdvance',   detail: null },
  { key: 'assess',    icon: Video,     label: 'stepAssess',    detail: 'Submit your damage walk video for AI comparison with your baseline.' },
  { key: 'decision',  icon: Gavel,     label: 'stepDecision',  detail: 'Human adjuster reviews and approves your claim.' },
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

  const stepStatus = (i) => {
    if (i < activeStep) return 'done'
    if (i === activeStep) return 'active'
    return 'pending'
  }

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
    <div className="min-h-screen bg-navy font-body">
      {/* Header */}
      <div className="px-4 pt-14 pb-6 bg-gradient-to-br from-navy-mid to-navy">
        <div className="max-w-[430px] mx-auto">
          <p className="text-xs text-white/40 uppercase tracking-wider font-display mb-1">Bayanihan</p>
          <h1 className="text-2xl font-display font-700 text-white">{tx.claimTracker}</h1>
        </div>
      </div>

      <div className="max-w-[430px] mx-auto px-4 mt-2 animate-fade-in">
        {/* Start claim button if not started */}
        {activeStep === 0 && (
          <button onClick={handleStartClaim} disabled={loading}
            className="w-full mb-6 flex items-center justify-center gap-2 bg-brand hover:bg-brand-dark active:scale-95 transition-all text-white font-display font-700 text-lg rounded-2xl py-4">
            {loading ? <Loader2 size={20} className="animate-spin" /> : null}
            Confirm Event & Start Claim
          </button>
        )}

        {/* Stepper */}
        <div className="space-y-2">
          {STEPS.map((step, i) => {
            const status = stepStatus(i)
            const Icon = step.icon
            return (
              <div key={step.key} className={`glass rounded-2xl p-4 transition-all ${status === 'active' ? 'border border-brand/50' : ''}`}>
                <div className="flex items-start gap-3">
                  {/* Status indicator */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                    status === 'done'    ? 'bg-safe' :
                    status === 'active' ? 'bg-brand animate-ping-slow' : 'bg-white/10'
                  }`}>
                    {status === 'done'
                      ? <CheckCircle2 size={18} className="text-white" />
                      : status === 'active'
                      ? <Icon size={16} className="text-white" />
                      : <Circle size={18} className="text-white/30" />
                    }
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-display font-600 ${status === 'pending' ? 'text-white/30' : 'text-white'}`}>
                        {tx[step.label]}
                      </p>
                      {status === 'done' && (
                        <span className="text-[10px] text-white/40 font-mono-dm shrink-0">Done</span>
                      )}
                    </div>

                    {/* Emergency advance special display */}
                    {step.key === 'advance' && status !== 'pending' && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="bg-[#00B14F] text-white text-xs font-display font-700 px-3 py-1 rounded-full">
                          GCash
                        </span>
                        <span className="text-sm text-white font-body">
                          PHP {claim?.advance_paid_php?.toLocaleString()} sent
                        </span>
                      </div>
                    )}

                    {/* Description */}
                    {status === 'active' && step.detail && (
                      <p className="text-xs text-white/50 mt-1 leading-snug font-body">{step.detail}</p>
                    )}

                    {/* Action button on active assess step */}
                    {step.key === 'assess' && status === 'active' && (
                      <button onClick={() => {
                        const claimId = claim?.claim_id || localStorage.getItem('bayanihan_claim_id')
                        nav(`/walk?mode=damage&claim_id=${claimId}`)
                      }}
                        className="mt-3 flex items-center gap-1.5 bg-brand text-white text-sm font-display font-600 px-4 py-2 rounded-xl active:scale-95 transition-all">
                        {tx.recordDamage} <ChevronRight size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Claim ID */}
        <div className="mt-6 text-center">
          <p className="text-[10px] text-white/30 font-mono-dm uppercase tracking-wider">{tx.claimId}</p>
          <p className="text-xs text-white/50 font-mono-dm mt-0.5">{claim?.claim_id}</p>
        </div>
      </div>
    </div>
  )
}
