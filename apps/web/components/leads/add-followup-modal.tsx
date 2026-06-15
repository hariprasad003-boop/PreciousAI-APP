'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, CalendarPlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const TYPES = ['call', 'whatsapp', 'visit', 'email', 'other']

interface Props {
  leadId?: string
  customerId?: string
}

export default function AddFollowUpModal({ leadId, customerId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    type: 'call',
    scheduled_at: '',
    message_content: '',
  })

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.scheduled_at) {
      toast.error('Please select a date and time')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/follow-ups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId ?? null,
          customer_id: customerId ?? null,
          type: form.type,
          scheduled_at: new Date(form.scheduled_at).toISOString(),
          message_content: form.message_content || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Follow-up scheduled')
      setOpen(false)
      setForm({ type: 'call', scheduled_at: '', message_content: '' })
      router.refresh()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to schedule')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="flex items-center gap-2 px-4 py-2 bg-charcoal-800 hover:bg-charcoal-700 border border-charcoal-700 text-charcoal-300 text-sm font-medium rounded-xl transition-colors">
          <CalendarPlus className="w-4 h-4" /> Schedule Follow-up
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm dark-glass rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="font-display text-lg font-bold text-white">Schedule Follow-up</Dialog.Title>
            <Dialog.Close className="text-charcoal-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-charcoal-400 text-xs mb-2">Type</label>
              <div className="flex gap-2 flex-wrap">
                {TYPES.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, type: t }))}
                    className={`capitalize text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      form.type === t
                        ? 'bg-gold-500 border-gold-500 text-charcoal-950 font-medium'
                        : 'border-charcoal-700 text-charcoal-300 hover:border-gold-500/50'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-charcoal-400 text-xs mb-1">Date & Time *</label>
              <input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
                required
                className="w-full bg-charcoal-800 border border-charcoal-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500"
              />
            </div>

            <div>
              <label className="block text-charcoal-400 text-xs mb-1">Note (optional)</label>
              <textarea
                value={form.message_content}
                onChange={e => setForm(f => ({ ...f, message_content: e.target.value }))}
                rows={3}
                placeholder="e.g. Follow up about the diamond ring quote..."
                className="w-full bg-charcoal-800 border border-charcoal-700 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-gold-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 gold-gradient text-charcoal-950 font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Scheduling...' : 'Schedule'}
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
