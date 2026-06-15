'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { toast } from 'sonner'
import { Mic, Square, Loader2, X, CheckCircle2, RotateCcw, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VoiceLeadDraft {
  transcript: string
  voice_note_url: string
  ai_profile: {
    customer_type?: string
    budget?: { amount: number; currency: string }
    intent_score: number
    occasion?: string
    category_interest?: string[]
    tags: string[]
    recommended_next_action?: string
  } | null
}

interface VoiceRecorderProps {
  stages: { id: string; name: string; order_index: number }[]
  countryCode: string
}

export default function VoiceRecorder({ stages, countryCode }: VoiceRecorderProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'recording' | 'processing' | 'review' | 'saving'>('idle')
  const [draft, setDraft] = useState<VoiceLeadDraft | null>(null)
  const [seconds, setSeconds] = useState(0)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [stageId, setStageId] = useState(stages.find(s => s.order_index === 0)?.id ?? stages[0]?.id ?? '')

  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunks.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunks.current.push(e.data) }
      mr.start(250)
      mediaRecorder.current = mr
      setPhase('recording')
      setSeconds(0)
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
    } catch {
      toast.error('Microphone access denied')
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (!mediaRecorder.current) return
    mediaRecorder.current.stop()
    mediaRecorder.current.stream.getTracks().forEach(t => t.stop())
    if (timerRef.current) clearInterval(timerRef.current)
    setPhase('processing')

    mediaRecorder.current.onstop = async () => {
      const blob = new Blob(chunks.current, { type: 'audio/webm' })
      const formData = new FormData()
      formData.append('audio', blob, 'voice-note.webm')

      try {
        const res = await fetch('/api/voice', { method: 'POST', body: formData })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? 'Processing failed')
        setDraft(data)
        setPhase('review')
      } catch (err: any) {
        toast.error(err.message)
        setPhase('idle')
      }
    }
  }, [])

  async function saveLead() {
    if (!fullName || !phone || !stageId) {
      toast.error('Name, phone, and stage are required')
      return
    }
    setPhase('saving')
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          phone,
          country_code: countryCode,
          source: 'manual',
          stage_id: stageId,
          raw_message: draft?.transcript,
          voice_note_url: draft?.voice_note_url,
          intent_score: draft?.ai_profile?.intent_score,
          budget_amount: draft?.ai_profile?.budget?.amount,
          tags: draft?.ai_profile?.tags ?? [],
          occasion: draft?.ai_profile?.occasion,
          category_interest: draft?.ai_profile?.category_interest ?? [],
        }),
      })
      if (!res.ok) throw new Error('Failed to save lead')
      toast.success('Lead created from voice note')
      setOpen(false)
      reset()
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
      setPhase('review')
    }
  }

  function reset() {
    setPhase('idle')
    setDraft(null)
    setSeconds(0)
    setFullName('')
    setPhone('')
  }

  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <Dialog.Root open={open} onOpenChange={v => { setOpen(v); if (!v) reset() }}>
      <Dialog.Trigger asChild>
        <button className="flex items-center gap-1.5 text-xs bg-charcoal-800 hover:bg-charcoal-700 border border-charcoal-700 text-white px-3 py-1.5 rounded-lg transition-colors">
          <Mic className="w-3.5 h-3.5 text-gold-400" /> Voice note
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-charcoal-900 border border-charcoal-700 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="font-display text-lg font-semibold text-white">Voice-to-Lead</Dialog.Title>
            <Dialog.Close className="text-charcoal-400 hover:text-white"><X className="w-5 h-5" /></Dialog.Close>
          </div>

          {/* IDLE */}
          {phase === 'idle' && (
            <div className="text-center py-4">
              <p className="text-charcoal-400 text-sm mb-6">
                Speak a customer note — AI will transcribe and extract lead details automatically.
              </p>
              <button
                onClick={startRecording}
                className="w-20 h-20 rounded-full bg-gold-500 hover:bg-gold-400 flex items-center justify-center mx-auto transition-all hover:scale-105 shadow-lg"
              >
                <Mic className="w-8 h-8 text-charcoal-900" />
              </button>
              <p className="text-charcoal-500 text-xs mt-4">Tap to start recording</p>
            </div>
          )}

          {/* RECORDING */}
          {phase === 'recording' && (
            <div className="text-center py-4">
              <div className="relative w-20 h-20 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                <div className="relative w-20 h-20 rounded-full bg-red-500 flex items-center justify-center">
                  <Mic className="w-8 h-8 text-white" />
                </div>
              </div>
              <p className="text-white font-display text-2xl font-bold mb-1">{formatTime(seconds)}</p>
              <p className="text-charcoal-400 text-sm mb-6">Recording… speak clearly</p>
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 bg-charcoal-800 hover:bg-charcoal-700 border border-charcoal-700 text-white px-6 py-3 rounded-xl mx-auto transition-all"
              >
                <Square className="w-4 h-4 text-red-400" /> Stop recording
              </button>
            </div>
          )}

          {/* PROCESSING */}
          {phase === 'processing' && (
            <div className="text-center py-8">
              <Loader2 className="w-10 h-10 text-gold-500 animate-spin mx-auto mb-4" />
              <p className="text-white font-medium mb-1">Processing…</p>
              <p className="text-charcoal-400 text-sm">Transcribing and parsing with AI</p>
            </div>
          )}

          {/* REVIEW */}
          {phase === 'review' && draft && (
            <div className="space-y-4">
              {/* Transcript */}
              <div className="bg-charcoal-800 rounded-xl p-4">
                <p className="text-charcoal-400 text-xs mb-2 flex items-center gap-1">
                  <Mic className="w-3 h-3" /> Transcript
                </p>
                <p className="text-charcoal-200 text-sm leading-relaxed italic">"{draft.transcript}"</p>
              </div>

              {/* AI tags */}
              {draft.ai_profile && (
                <div className="bg-charcoal-800 rounded-xl p-4">
                  <p className="text-charcoal-400 text-xs mb-2 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-gold-400" /> AI extracted
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {draft.ai_profile.tags?.map(t => (
                      <span key={t} className="text-xs bg-gold-500/20 text-gold-400 px-2 py-0.5 rounded-full">{t}</span>
                    ))}
                    {draft.ai_profile.occasion && (
                      <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">{draft.ai_profile.occasion}</span>
                    )}
                    {draft.ai_profile.budget && (
                      <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                        {draft.ai_profile.budget.currency} {draft.ai_profile.budget.amount.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Confirm fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs text-charcoal-400 mb-1.5">Full name *</label>
                  <input
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Customer name"
                    className="w-full bg-charcoal-800 border border-charcoal-700 focus:border-gold-500 rounded-lg px-3 py-2 text-white text-sm outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-charcoal-400 mb-1.5">Phone *</label>
                  <input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="Phone number"
                    className="w-full bg-charcoal-800 border border-charcoal-700 focus:border-gold-500 rounded-lg px-3 py-2 text-white text-sm outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs text-charcoal-400 mb-1.5">Stage</label>
                  <select
                    value={stageId}
                    onChange={e => setStageId(e.target.value)}
                    className="w-full bg-charcoal-800 border border-charcoal-700 focus:border-gold-500 rounded-lg px-3 py-2 text-white text-sm outline-none transition-colors"
                  >
                    {stages.sort((a, b) => a.order_index - b.order_index).map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={reset} className="flex items-center gap-1.5 text-charcoal-400 hover:text-white text-sm px-4 py-2 rounded-lg border border-charcoal-700 transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" /> Redo
                </button>
                <button
                  onClick={saveLead}
                  disabled={!fullName || !phone}
                  className="flex-1 flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-400 disabled:opacity-60 text-charcoal-900 font-semibold py-2 rounded-xl text-sm transition-all"
                >
                  <CheckCircle2 className="w-4 h-4" /> Save lead
                </button>
              </div>
            </div>
          )}

          {/* SAVING */}
          {phase === 'saving' && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 text-gold-500 animate-spin mx-auto mb-3" />
              <p className="text-white text-sm">Saving lead…</p>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
