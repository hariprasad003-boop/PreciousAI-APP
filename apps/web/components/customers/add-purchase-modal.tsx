'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, PlusCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const CATEGORIES = ['Rings', 'Necklaces', 'Earrings', 'Bangles', 'Bracelets', 'Pendants', 'Chains', 'Other']
const OCCASIONS = ['Birthday', 'Anniversary', 'Wedding', 'Engagement', 'Festival', 'Gift', 'Self', 'Other']

interface Props {
  customerId: string
  currency: string
}

export default function AddPurchaseModal({ customerId, currency }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    purchase_date: new Date().toISOString().slice(0, 10),
    amount: '',
    category: '',
    item_description: '',
    occasion: '',
  })

  function set(field: string, value: string) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/customers/${customerId}/purchases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchase_date: form.purchase_date,
          amount: parseFloat(form.amount),
          category: form.category || undefined,
          item_description: form.item_description || undefined,
          occasion: form.occasion || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Purchase recorded')
      setOpen(false)
      setForm({ purchase_date: new Date().toISOString().slice(0, 10), amount: '', category: '', item_description: '', occasion: '' })
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
        <button className="flex items-center gap-2 px-4 py-2 bg-gold-500/10 hover:bg-gold-500/20 border border-gold-500/30 text-gold-400 text-sm font-medium rounded-xl transition-colors">
          <PlusCircle className="w-4 h-4" /> Add Purchase
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md dark-glass rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-5">
            <Dialog.Title className="font-display text-lg font-bold text-white">Record Purchase</Dialog.Title>
            <Dialog.Close className="text-charcoal-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-charcoal-400 text-xs mb-1">Date *</label>
                <input
                  type="date"
                  value={form.purchase_date}
                  onChange={e => set('purchase_date', e.target.value)}
                  required
                  className="w-full bg-charcoal-800 border border-charcoal-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500"
                />
              </div>
              <div>
                <label className="block text-charcoal-400 text-xs mb-1">Amount ({currency}) *</label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={e => set('amount', e.target.value)}
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full bg-charcoal-800 border border-charcoal-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-charcoal-400 text-xs mb-1">Description</label>
              <input
                type="text"
                value={form.item_description}
                onChange={e => set('item_description', e.target.value)}
                placeholder="22K gold necklace with pendant..."
                className="w-full bg-charcoal-800 border border-charcoal-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-charcoal-400 text-xs mb-2">Category</label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => set('category', form.category === cat ? '' : cat)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        form.category === cat
                          ? 'bg-gold-500 border-gold-500 text-charcoal-950 font-medium'
                          : 'border-charcoal-700 text-charcoal-300 hover:border-gold-500/50'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-charcoal-400 text-xs mb-2">Occasion</label>
                <div className="flex flex-wrap gap-1.5">
                  {OCCASIONS.map(occ => (
                    <button
                      key={occ}
                      type="button"
                      onClick={() => set('occasion', form.occasion === occ ? '' : occ)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        form.occasion === occ
                          ? 'bg-gold-500 border-gold-500 text-charcoal-950 font-medium'
                          : 'border-charcoal-700 text-charcoal-300 hover:border-gold-500/50'
                      }`}
                    >
                      {occ}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 gold-gradient text-charcoal-950 font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Saving...' : 'Save Purchase'}
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
