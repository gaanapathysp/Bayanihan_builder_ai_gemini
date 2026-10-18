import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, FlipHorizontal, Loader2, X } from 'lucide-react'
import { useLang } from '../../context/LangContext'
import { uploadBaseline, uploadDamage } from '../../api'

const ROOMS = [
  { id: 'living',  label: 'Living Room', key: 'instruction_living' },
  { id: 'kitchen', label: 'Kitchen',     key: 'instruction_kitchen' },
  { id: 'bed1',    label: 'Bedroom 1',   key: 'instruction_bed1' },
  { id: 'bed2',    label: 'Bedroom 2',   key: 'instruction_bed2' },
]

export default function GuidedWalk() {
  const { tx } = useLang()
  const nav = useNavigate()
  const [searchParams] = useSearchParams()
  const isDamageMode = searchParams.get('mode') === 'damage'
  const damageClaimId = searchParams.get('claim_id')

  const videoRef     = useRef(null)
  const mediaRecRef  = useRef(null)
  const chunksRef    = useRef([])
  const streamRef    = useRef(null)

  const [elapsed,      setElapsed]      = useState(0)
  const [recording,    setRecording]    = useState(false)
  const [facingMode,   setFacingMode]   = useState('environment')
  const [roomIdx,      setRoomIdx]      = useState(0)
  const [completed,    setCompleted]    = useState([])
  const [showCoaching, setShowCoaching] = useState(false)
  const [uploading,    setUploading]    = useState(false)
  const [camError,     setCamError]     = useState(false)

  const startCamera = useCallback(async (mode) => {
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play().catch(() => {})
      }
      setCamError(false)
    } catch {
      setCamError(true)
    }
  }, [])

  useEffect(() => { startCamera(facingMode) }, [facingMode, startCamera])
  useEffect(() => () => { streamRef.current?.getTracks().forEach(t => t.stop()) }, [])

  useEffect(() => {
    if (!recording) return
    const id = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(id)
  }, [recording])

  useEffect(() => {
    if (elapsed === 18) setShowCoaching(true)
    if (elapsed > 24)   setShowCoaching(false)
    if (elapsed > 0 && elapsed % 25 === 0 && roomIdx < ROOMS.length - 1) {
      setCompleted(c => [...c, ROOMS[roomIdx].id])
      setRoomIdx(i => i + 1)
    }
  }, [elapsed, roomIdx])

  const startRec = () => {
    if (!streamRef.current) return
    chunksRef.current = []
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
      ? 'video/webm;codecs=vp8'
      : 'video/webm'
    const mr = new MediaRecorder(streamRef.current, { mimeType })
    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mr.start(200)
    mediaRecRef.current = mr
    setRecording(true)
  }

  const finish = async () => {
    if (!mediaRecRef.current) return
    mediaRecRef.current.stop()
    setUploading(true)
    await new Promise(r => setTimeout(r, 400))

    const blob = new Blob(chunksRef.current, { type: 'video/webm' })
    const fd   = new FormData()
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

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`
  const canFinish = elapsed >= 45
  const minLeft   = Math.max(0, 45 - elapsed)

  return (
    <div className="h-dvh bg-black flex flex-col overflow-hidden">
      {/* Camera layer */}
      {camError ? (
        <div className="absolute inset-0 bg-navy-mid flex items-center justify-center">
          <div className="text-center px-8">
            <AlertTriangle size={40} className="text-storm-amber mx-auto mb-3" />
            <p className="text-white font-display font-600 mb-1">Camera unavailable</p>
            <p className="text-white/50 text-sm font-body">Please allow camera access and reload</p>
          </div>
        </div>
      ) : (
        <video ref={videoRef} autoPlay playsInline muted
          className="absolute inset-0 w-full h-full object-cover" />
      )}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/80 pointer-events-none" />

      {/* Top bar */}
      <div className="relative flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-3">
        <div className="flex items-center gap-2.5">
          {recording && (
            <div className="flex items-center gap-1.5 glass rounded-full px-2.5 py-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-white font-mono-dm font-500">REC</span>
            </div>
          )}
          <span className="font-mono-dm text-white text-xl font-500 tabular-nums">{fmt(elapsed)}</span>
        </div>

        <div className="flex items-center gap-2">
          {isDamageMode && (
            <span className="text-[10px] font-display font-600 text-storm-amber uppercase tracking-widest glass px-2.5 py-1 rounded-full">
              Damage Walk
            </span>
          )}
          <button onClick={() => setFacingMode(m => m === 'environment' ? 'user' : 'environment')}
            className="glass w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform">
            <FlipHorizontal size={16} className="text-white" />
          </button>
          <button onClick={() => { streamRef.current?.getTracks().forEach(t => t.stop()); nav(-1) }}
            className="glass w-9 h-9 rounded-full flex items-center justify-center active:scale-90 transition-transform">
            <X size={16} className="text-white" />
          </button>
        </div>
      </div>

      {/* Room chips */}
      <div className="relative flex gap-2 px-4 mt-1 overflow-x-auto no-scrollbar pb-1">
        {ROOMS.map((r, i) => (
          <div key={r.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body shrink-0 transition-all ${
            completed.includes(r.id) ? 'bg-safe/90 text-white' :
            i === roomIdx && recording ? 'bg-brand text-white' :
            'glass text-white/40'
          }`}>
            {completed.includes(r.id) && <CheckCircle2 size={11} />}
            {r.label}
          </div>
        ))}
      </div>

      {/* Instruction card */}
      {recording && (
        <div className="relative mx-4 mt-2 glass rounded-2xl p-3.5 animate-slide-up">
          <p className="text-sm text-white font-body leading-snug">
            {tx[ROOMS[roomIdx]?.key] || 'Show each corner of the room clearly.'}
          </p>
        </div>
      )}

      {/* Coaching alert */}
      {showCoaching && (
        <div className="relative mx-4 mt-2 bg-storm-amber/90 backdrop-blur-sm rounded-2xl p-3.5 flex gap-2.5 items-start animate-slide-up">
          <AlertTriangle size={16} className="text-white mt-0.5 shrink-0" />
          <p className="text-sm text-white font-body leading-snug">{tx.coaching}</p>
        </div>
      )}

      {/* Uploading overlay */}
      {uploading && (
        <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center z-20 animate-fade-in">
          <Loader2 size={40} className="text-brand animate-spin mb-4" />
          <p className="text-white font-display font-600 text-lg mb-1">
            {isDamageMode ? 'Analysing damage…' : 'Locking evidence…'}
          </p>
          <p className="text-white/50 text-sm font-body">This takes 20–40 seconds</p>
        </div>
      )}

      {/* Bottom controls */}
      <div className="relative mt-auto px-4 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] space-y-3">
        {!recording ? (
          <button onClick={startRec}
            className="w-full bg-red-600 active:bg-red-700 active:scale-[0.98] transition-all text-white font-display font-700 text-lg rounded-2xl py-[18px] flex items-center justify-center gap-2.5 shadow-xl shadow-red-900/40">
            <span className="w-3 h-3 rounded-full bg-white animate-pulse" />
            {isDamageMode ? 'Start Damage Recording' : 'Start Recording'}
          </button>
        ) : (
          <button onClick={finish} disabled={!canFinish || uploading}
            className={`w-full font-display font-700 text-lg rounded-2xl py-[18px] flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] ${
              canFinish && !uploading
                ? 'bg-safe active:bg-green-700 text-white shadow-xl shadow-green-900/40'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            }`}>
            {uploading
              ? <><Loader2 size={20} className="animate-spin" />Processing…</>
              : canFinish
              ? (isDamageMode ? 'Submit Damage Video' : tx.finishWalk)
              : `Hold on… ${minLeft}s more`
            }
          </button>
        )}
      </div>
    </div>
  )
}
