'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, MessageSquarePlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const TYPES = ['note', 'call', 'visit', 'whatsapp', 'email']

export default function AddNoteModal({ leadId }: { leadId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState('note')
  const [content, setContent] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) {
      toast.error('Note content is required')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/leads/${leadId}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, content, direction: 'outbound' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Note added')
      setOpen(false)
      setContent('')
      setType('note')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="flex items-center gap-2 px-4 py-2 bg-charcoal-800 hover:bg-charcoal-700 border border-charcoal-700 text-charcoal-300 text-sm font-medium rounded-xl transition-colors">
          <MessageSquarePlus className="w-4 h-4" /> Add Note
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm dark-glass rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="font-display text-lg font-bold text-white">Add Interaction</Dialog.Title>
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
                    onClick={() => setType(t)}
                    className={`capitalize text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      type === t
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
              <label className="block text-charcoal-400 text-xs mb-1">Note *</label>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value)}
                required
                rows={4}
                placeholder="Spoke to customer about budget, they want 22K gold with ruby setting..."
                className="w-full bg-charcoal-800 border border-charcoal-700 rounded-lg px-3 py-2 text-white text-sm resize-none focus:outline-none focus:border-gold-500 placeholder-charcoal-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 gold-gradient text-charcoal-950 font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Saving...' : 'Save Note'}
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
