'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Instagram, Wand2, User, Phone, Tag, ChevronRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function InstagramPage() {
  const router = useRouter()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [saving, setSaving] = useState(false)

  // Form state for saving
  const [form, setForm] = useState({ full_name: '', phone: '', stage_id: '' })

  async function parse() {
    if (!text.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/ai/parse-instagram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data.profile)
      setForm(f => ({
        ...f,
        full_name: data.profile?.name ?? '',
        phone: data.profile?.phone ?? '',
      }))
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to parse message')
    } finally {
      setLoading(false)
    }
  }

  async function saveLead() {
    if (!form.full_name || !form.phone) {
      toast.error('Name and phone are required')
      return
    }
    setSaving(true)
    try {
      const payload: any = {
        full_name: form.full_name,
        phone: form.phone,
        source: 'instagram',
        raw_message: text,
        ...(result && {
          intent_score: result.intent_score,
          budget_amount: result.budget_amount,
          budget_currency: result.budget_currency,
          occasion: result.occasion,
          category_interest: result.category_interest ?? [],
          tags: result.tags ?? [],
        }),
        ...(form.stage_id && { stage_id: form.stage_id }),
      }

      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success('Lead created from Instagram DM')
      router.push(`/leads/${data.lead.id}`)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save lead')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-fade-in max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
          <Instagram className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-white">Instagram DM Parser</h1>
          <p className="text-charcoal-400 text-sm">Paste a DM and let AI extract lead data</p>
        </div>
      </div>

      <div className="dark-glass rounded-2xl p-6 mb-4">
        <label className="block text-charcoal-400 text-xs uppercase tracking-wider mb-2">Paste Instagram DM here</label>
        <textarea
          className="w-full bg-charcoal-800 border border-charcoal-700 rounded-xl p-4 text-white text-sm leading-relaxed resize-none focus:outline-none focus:border-gold-500 placeholder-charcoal-600"
          rows={6}
          placeholder={`Hi, I saw your gold necklace post. Looking for something like that for my wife's birthday next month. Budget around 40k. She loves diamonds.`}
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <button
          onClick={parse}
          disabled={!text.trim() || loading}
          className="mt-3 flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-sm font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          {loading ? 'Analysing...' : 'Extract with AI'}
        </button>
      </div>

      {result && (
        <div className="dark-glass rounded-2xl p-6 space-y-5">
          <h2 className="font-display text-base font-semibold text-white flex items-center gap-2">
            <Tag className="w-4 h-4 text-gold-500" /> AI-Extracted Profile
          </h2>

          {/* AI data preview */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            {result.intent_score != null && (
              <Stat label="Intent Score" value={`${Math.round(result.intent_score * 100)}%`} />
            )}
            {result.budget_amount && (
              <Stat label="Budget" value={`${result.budget_currency ?? ''} ${result.budget_amount}`} />
            )}
            {result.occasion && <Stat label="Occasion" value={result.occasion} />}
            {result.category_interest?.length > 0 && (
              <Stat label="Category Interest" value={result.category_interest.join(', ')} />
            )}
          </div>

          {result.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {result.tags.map((t: string) => (
                <span key={t} className="text-xs bg-gold-500/10 text-gold-400 px-2.5 py-1 rounded-full">{t}</span>
              ))}
            </div>
          )}

          {/* Save form */}
          <div className="border-t border-charcoal-800 pt-5 space-y-3">
            <p className="text-charcoal-400 text-xs uppercase tracking-wider">Confirm & Save Lead</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-charcoal-400 text-xs mb-1">Full Name *</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  className="w-full bg-charcoal-800 border border-charcoal-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500"
                  placeholder="From DM or add manually"
                />
              </div>
              <div>
                <label className="block text-charcoal-400 text-xs mb-1">Phone *</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full bg-charcoal-800 border border-charcoal-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500"
                  placeholder="+91 99999 00000"
                />
              </div>
            </div>
            <button
              onClick={saveLead}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2.5 gold-gradient text-charcoal-950 font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save as Lead'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-charcoal-800 rounded-lg p-3">
      <p className="text-charcoal-500 text-xs mb-0.5">{label}</p>
      <p className="text-white text-sm font-medium">{value}</p>
    </div>
  )
}
