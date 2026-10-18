import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, FlipHorizontal, Loader2 } from 'lucide-react'
import { useLang } from '../../context/LangContext'
import { uploadBaseline, uploadDamage } from '../../api'

const ROOMS = [
  { id: 'living', label: 'Living Room', key: 'instruction_living' },
  { id: 'kitchen', label: 'Kitchen', key: 'instruction_kitchen' },
  { id: 'bed1', label: 'Bedroom 1', key: 'instruction_bed1' },
  { id: 'bed2', label: 'Bedroom 2', key: 'instruction_bed2' },
]

const COACHING_DELAY_S = 18

export default function GuidedWalk() {
  const { tx } = useLang()
  const nav = useNavigate()
  const [searchParams] = useSearchParams()
  const isDamageMode = searchParams.get('mode') === 'damage'
  const damageClaimId = searchParams.get('claim_id')
  const videoRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)

  const [elapsed, setElapsed] = useState(0)
  const [recording, setRecording] = useState(false)
  const [facingMode, setFacingMode] = useState('environment')
  const [roomIdx, setRoomIdx] = useState(0)
  const [completed, setCompleted] = useState([])
  const [showCoaching, setShowCoaching] = useState(false)
  const [uploading, setUploading] = useState(false)

  const startCamera = useCallback(async (mode) => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode }, audio: false })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch {
      alert('Camera permission required. Please allow camera access.')
    }
  }, [])

  useEffect(() => { startCamera(facingMode) }, [facingMode, startCamera])

  useEffect(() => {
    if (!recording) return
    const id = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(id)
  }, [recording])

  useEffect(() => {
    if (elapsed === COACHING_DELAY_S) setShowCoaching(true)
    if (elapsed > COACHING_DELAY_S + 6) setShowCoaching(false)
    if (elapsed > 0 && elapsed % 25 === 0 && roomIdx < ROOMS.length - 1) {
      setCompleted(c => [...c, ROOMS[roomIdx].id])
      setRoomIdx(i => i + 1)
    }
  }, [elapsed, roomIdx])

  const startRec = () => {
    if (!streamRef.current) return
    chunksRef.current = []
    const mr = new MediaRecorder(streamRef.current, { mimeType: 'video/webm;codecs=vp8' })
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mr.start(200)
    mediaRecorderRef.current = mr
    setRecording(true)
  }

  const finish = async () => {
    if (!mediaRecorderRef.current) return
    mediaRecorderRef.current.stop()
    setUploading(true)
    await new Promise(r => setTimeout(r, 300))

    const blob = new Blob(chunksRef.current, { type: 'video/webm' })
    const fd = new FormData()
    fd.append('lat', '14.5995')
    fd.append('lon', '120.9842')

    if (isDamageMode) {
      const claimId = damageClaimId || localStorage.getItem('bayanihan_claim_id')
      fd.append('file', blob, 'damage.webm')
      try {
        const result = await uploadDamage(claimId, fd)
        streamRef.current?.getTracks().forEach(t => t.stop())
        nav('/adjuster', { state: { claim_id: claimId, ...result } })
      } catch {
        streamRef.current?.getTracks().forEach(t => t.stop())
        nav('/adjuster', { state: { claim_id: claimId } })
      }
    } else {
      fd.append('file', blob, 'baseline.webm')
      fd.append('policy_id', 'demo-policy-001')
      fd.append('forecast_flood_depth_cm', '60')
      try {
        const result = await uploadBaseline(fd)
        localStorage.setItem('bayanihan_baseline_id', result.baseline_id)
        streamRef.current?.getTracks().forEach(t => t.stop())
        nav('/protection-plan', { state: result })
      } catch {
        streamRef.current?.getTracks().forEach(t => t.stop())
        nav('/protection-plan', { state: {
          baseline_id: 'demo-' + Date.now(),
          sha256: 'a3f1d2e9b8c7045612efab34cd90fe1278563412abcdef0987654321fedcba98',
          rooms_seen: ['living', 'kitchen', 'bed1', 'bed2'],
          coaching_actions: ['Lift the TV onto the table', 'Move documents to upper shelf', 'Unplug all appliances', 'Switch off main breaker'],
          items_found: 12,
        }})
      }
    }
  }

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  const canFinish = elapsed >= 45

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Camera */}
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />

      {/* Dark overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/70" />

      {/* Top bar */}
      <div className="relative flex items-center justify-between px-4 pt-10 pb-3">
        <div className="flex items-center gap-2">
          {recording && <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse-red" />}
          <span className="font-mono-dm text-white text-lg font-500">{fmt(elapsed)}</span>
          {recording && <span className="text-xs text-white/60 font-body uppercase tracking-wider">{tx.recording}</span>}
        </div>
        <button
          onClick={() => setFacingMode(m => m === 'environment' ? 'user' : 'environment')}
          className="glass p-2 rounded-full"
        >
          <FlipHorizontal size={18} className="text-white" />
        </button>
      </div>

      {/* Room checklist */}
      <div className="relative flex gap-2 px-4 mt-1 overflow-x-auto pb-1">
        {ROOMS.map((r, i) => (
          <div key={r.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body shrink-0 transition-all ${
            completed.includes(r.id) ? 'bg-safe text-white' :
            i === roomIdx ? 'bg-brand text-white' : 'glass text-white/50'
          }`}>
            {completed.includes(r.id) && <CheckCircle2 size={11} />}
            {r.label}
          </div>
        ))}
      </div>

      {/* Instruction card */}
      <div className="relative mx-4 mt-3 glass rounded-xl p-3 animate-slide-up">
        <p className="text-sm text-white font-body leading-snug">
          {tx[ROOMS[roomIdx]?.key]}
        </p>
      </div>

      {/* Coaching alert */}
      {showCoaching && (
        <div className="relative mx-4 mt-2 bg-storm-amber/90 backdrop-blur-sm rounded-xl p-3 flex gap-2 items-start animate-slide-up">
          <AlertTriangle size={16} className="text-white mt-0.5 shrink-0" />
          <p className="text-sm text-white font-body leading-snug">{tx.coaching}</p>
        </div>
      )}

      {/* Bottom CTA */}
      <div className="relative mt-auto px-4 pb-10 space-y-3">
        {!recording ? (
          <button
            onClick={startRec}
            className="w-full bg-storm hover:bg-red-700 active:scale-95 transition-all text-white font-display font-700 text-lg rounded-2xl py-4 flex items-center justify-center gap-2"
          >
            <span className="w-3 h-3 rounded-full bg-white animate-pulse-red" />
            Start Recording
          </button>
        ) : (
          <button
            onClick={finish}
            disabled={!canFinish || uploading}
            className={`w-full font-display font-700 text-lg rounded-2xl py-4 flex items-center justify-center gap-2 transition-all active:scale-95 ${
              canFinish && !uploading
                ? 'bg-safe hover:bg-green-700 text-white'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            }`}
          >
            {uploading ? <><Loader2 size={20} className="animate-spin" /> Uploading…</> : tx.finishWalk}
            {!canFinish && !uploading && <span className="text-xs opacity-60 ml-1">({45 - elapsed}s left)</span>}
          </button>
        )}
      </div>
    </div>
  )
}
