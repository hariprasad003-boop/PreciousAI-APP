'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle, SkipForward, Loader2, MessageCircle, X, Calendar, Phone, User } from 'lucide-react'

interface Suggestion {
  type: 'whatsapp' | 'call' | 'visit'
  message: string
  scheduled_for: string
  scheduled_at: string
  reason: string
}

interface FollowUpActionsProps {
  followUpId: string
  leadId?: string
  leadPhone?: string
  leadCountryCode?: string
  messageContent?: string
}

const TYPE_ICONS = {
  whatsapp: MessageCircle,
  call: Phone,
  visit: User,
}

const TYPE_COLORS = {
  whatsapp: 'text-emerald-400 bg-emerald-400/10',
  call: 'text-blue-400 bg-blue-400/10',
  visit: 'text-amber-400 bg-amber-400/10',
}

export default function FollowUpActions({
  followUpId,
  leadId,
  leadPhone,
  leadCountryCode,
  messageContent,
}: FollowUpActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [schedulingIdx, setSchedulingIdx] = useState<number | null>(null)

  async function update(status: 'done' | 'skipped') {
    setLoading(status)
    try {
      const res = await fetch(`/api/follow-ups/${followUpId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(status === 'done' ? 'Marked as done' : 'Skipped')

      // After marking done, auto-suggest next if lead_id is available
      if (status === 'done' && leadId) {
        router.refresh()
        await fetchSuggestions()
      } else {
        router.refresh()
      }
    } catch {
      toast.error('Failed to update')
    } finally {
      setLoading(null)
    }
  }

  async function fetchSuggestions() {
    if (!leadId) return
    setSuggestLoading(true)
    setShowSuggestions(true)
    try {
      const res = await fetch('/api/ai/suggest-followups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId }),
      })
      if (!res.ok) throw new Error('Failed to get suggestions')
      const json = await res.json()
      setSuggestions(json.suggestions ?? [])
    } catch {
      toast.error('Failed to get AI suggestions')
      setShowSuggestions(false)
    } finally {
      setSuggestLoading(false)
    }
  }

  async function scheduleSuggestion(suggestion: Suggestion, idx: number) {
    if (!leadId) return
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
      toast.success('Follow-up scheduled!')
      setSuggestions(prev => prev.filter((_, i) => i !== idx))
      if (suggestions.length <= 1) setShowSuggestions(false)
      router.refresh()
    } catch {
      toast.error('Failed to schedule')
    } finally {
      setSchedulingIdx(null)
    }
  }

  async function scheduleAll() {
    if (!leadId || suggestions.length === 0) return
    setLoading('all')
    try {
      await Promise.all(
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
      toast.success(`${suggestions.length} follow-ups scheduled!`)
      setSuggestions([])
      setShowSuggestions(false)
      router.refresh()
    } catch {
      toast.error('Failed to schedule all')
    } finally {
      setLoading(null)
    }
  }

  function openWhatsApp() {
    if (!leadPhone) {
      toast.error('No phone number available')
      return
    }
    const phone = `${leadCountryCode ?? ''}${leadPhone}`.replace(/[\s\-\(\)]/g, '')
    const text = messageContent ? encodeURIComponent(messageContent) : ''
    const url = `https://wa.me/${phone}${text ? `?text=${text}` : ''}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div>
      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => update('done')}
          disabled={!!loading}
          className="flex items-center gap-1 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50"
        >
          {loading === 'done' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
          Done
        </button>

        {leadPhone && (
          <button
            onClick={openWhatsApp}
            className="flex items-center gap-1 text-xs bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-300 px-2.5 py-1.5 rounded-lg transition-all"
          >
            <MessageCircle className="w-3 h-3" />
            WhatsApp
          </button>
        )}

        <button
          onClick={() => update('skipped')}
          disabled={!!loading}
          className="flex items-center gap-1 text-xs bg-charcoal-800 hover:bg-charcoal-700 text-charcoal-400 hover:text-white px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50"
        >
          {loading === 'skipped' ? <Loader2 className="w-3 h-3 animate-spin" /> : <SkipForward className="w-3 h-3" />}
          Skip
        </button>
      </div>

      {/* AI Suggestions Modal/Panel */}
      {showSuggestions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-charcoal-900 border border-charcoal-700 rounded-2xl w-full max-w-lg shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-charcoal-800">
              <div>
                <h3 className="text-white font-display font-semibold">AI Follow-up Suggestions</h3>
                <p className="text-charcoal-400 text-xs mt-0.5">Based on lead history and context</p>
              </div>
              <button
                onClick={() => setShowSuggestions(false)}
                className="text-charcoal-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5">
              {suggestLoading ? (
                <div className="flex items-center justify-center py-10 gap-3">
                  <Loader2 className="w-5 h-5 text-gold-400 animate-spin" />
                  <p className="text-charcoal-400 text-sm">Generating suggestions...</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {suggestions.map((s, i) => {
                      const Icon = TYPE_ICONS[s.type] ?? MessageCircle
                      const colors = TYPE_COLORS[s.type] ?? 'text-charcoal-400 bg-charcoal-800'
                      return (
                        <div key={i} className="bg-charcoal-800 rounded-xl p-4">
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colors}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-white text-sm font-medium capitalize">{s.type}</span>
                                <span className="text-charcoal-500 text-xs flex items-center gap-1">
                                  <Calendar className="w-3 h-3" /> {s.scheduled_for}
                                </span>
                              </div>
                              <p className="text-charcoal-200 text-xs leading-relaxed mb-1">"{s.message}"</p>
                              <p className="text-charcoal-500 text-xs italic">{s.reason}</p>
                            </div>
                            <button
                              onClick={() => scheduleSuggestion(s, i)}
                              disabled={schedulingIdx === i}
                              className="flex items-center gap-1 text-xs bg-gold-500/10 hover:bg-gold-500/20 text-gold-400 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50 flex-shrink-0"
                            >
                              {schedulingIdx === i ? <Loader2 className="w-3 h-3 animate-spin" /> : <Calendar className="w-3 h-3" />}
                              Schedule
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {suggestions.length > 1 && (
                    <button
                      onClick={scheduleAll}
                      disabled={loading === 'all'}
                      className="mt-4 w-full flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-400 text-charcoal-900 font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50"
                    >
                      {loading === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
                      Schedule All {suggestions.length} Follow-ups
                    </button>
                  )}

                  {suggestions.length === 0 && (
                    <p className="text-center text-charcoal-500 text-sm py-4">All suggestions scheduled!</p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
