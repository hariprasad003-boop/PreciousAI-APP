'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Sparkles, X, Calendar, MessageCircle, Phone, User, Loader2 } from 'lucide-react'

interface Suggestion {
  type: 'whatsapp' | 'call' | 'visit'
  message: string
  scheduled_for: string
  scheduled_at: string
  reason: string
}

const TYPE_ICONS = {
  whatsapp: MessageCircle,
  call: Phone,
  visit: User,
}

const TYPE_COLORS = {
  whatsapp: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  call: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  visit: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
}

export default function AIFollowUpModal({ leadId }: { leadId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [schedulingIdx, setSchedulingIdx] = useState<number | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])

  async function fetchSuggestions() {
    setLoading(true)
    setOpen(true)
    setSuggestions([])
    try {
      const res = await fetch('/api/ai/suggest-followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Failed')
      }
      const json = await res.json()
      setSuggestions(json.suggestions ?? [])
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to get AI suggestions')
      setOpen(false)
    } finally {
      setLoading(false)
    }
  }

  async function scheduleSuggestion(suggestion: Suggestion, idx: number) {
    setSchedulingIdx(idx)
    try {
      const res = await fetch('/api/follow-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId,
          type: suggestion.type,
          message_content: suggestion.message,
          scheduled_at: suggestion.scheduled_at,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(`${suggestion.type} follow-up scheduled for ${suggestion.scheduled_for}`)
      setSuggestions(prev => prev.filter((_, i) => i !== idx))
      router.refresh()
    } catch {
      toast.error('Failed to schedule')
    } finally {
      setSchedulingIdx(null)
    }
  }

  async function scheduleAll() {
    if (suggestions.length === 0) return
    setScheduling(true)
    try {
      const results = await Promise.allSettled(
        suggestions.map(s =>
          fetch('/api/follow-ups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lead_id: leadId,
              type: s.type,
              message_content: s.message,
              scheduled_at: s.scheduled_at,
            }),
          })
        )
      )
      const succeeded = results.filter(r => r.status === 'fulfilled').length
      toast.success(`${succeeded} follow-up${succeeded !== 1 ? 's' : ''} scheduled!`)
      setSuggestions([])
      setOpen(false)
      router.refresh()
    } catch {
      toast.error('Failed to schedule all')
    } finally {
      setScheduling(false)
    }
  }

  return (
    <>
      <button
        onClick={fetchSuggestions}
        className="w-full flex items-center justify-center gap-2 bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/20 text-gold-400 font-medium text-sm py-2.5 rounded-xl transition-all"
      >
        <Sparkles className="w-4 h-4" />
        AI Schedule Follow-ups
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-charcoal-900 border border-charcoal-700 rounded-2xl w-full max-w-lg shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-charcoal-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gold-500/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-gold-400" />
                </div>
                <div>
                  <h3 className="text-white font-display font-semibold">AI Follow-up Suggestions</h3>
                  <p className="text-charcoal-400 text-xs mt-0.5">Generated based on lead history and context</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-charcoal-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="relative">
                    <Sparkles className="w-8 h-8 text-gold-500 animate-pulse" />
                  </div>
                  <p className="text-charcoal-400 text-sm">Analysing lead and generating suggestions...</p>
                </div>
              ) : suggestions.length === 0 ? (
                <p className="text-center text-charcoal-500 text-sm py-8">All suggestions have been scheduled!</p>
              ) : (
                <>
                  <div className="space-y-3 mb-4">
                    {suggestions.map((s, i) => {
                      const Icon = TYPE_ICONS[s.type] ?? MessageCircle
                      const colors = TYPE_COLORS[s.type] ?? 'text-charcoal-400 bg-charcoal-800 border-charcoal-700'
                      return (
                        <div key={i} className={`rounded-xl p-4 border ${colors.split(' ').slice(2).join(' ')} bg-charcoal-800`}>
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colors.split(' ').slice(0, 2).join(' ')}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="text-white text-sm font-semibold capitalize">{s.type}</span>
                                <span className="text-charcoal-500 text-xs flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  in {s.scheduled_for}
                                </span>
                              </div>
                              <p className="text-charcoal-200 text-xs leading-relaxed mb-2 italic">
                                "{s.message}"
                              </p>
                              <p className="text-charcoal-500 text-xs border-t border-charcoal-700 pt-2">
                                {s.reason}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 flex justify-end">
                            <button
                              onClick={() => scheduleSuggestion(s, i)}
                              disabled={schedulingIdx === i}
                              className="flex items-center gap-1.5 text-xs bg-charcoal-700 hover:bg-charcoal-600 text-white px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                            >
                              {schedulingIdx === i ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Calendar className="w-3 h-3" />
                              )}
                              Schedule this
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {suggestions.length > 1 && (
                    <button
                      onClick={scheduleAll}
                      disabled={scheduling}
                      className="w-full flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-400 text-charcoal-900 font-bold py-3 rounded-xl transition-all disabled:opacity-50 text-sm"
                    >
                      {scheduling ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Calendar className="w-4 h-4" />
                      )}
                      Schedule All {suggestions.length} Follow-ups
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
