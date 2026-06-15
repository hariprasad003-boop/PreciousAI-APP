'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, X, Zap } from 'lucide-react'
import { LEAD_SOURCES } from '@preciousai/shared'

const schema = z.object({
  full_name: z.string().min(2, 'Name is required'),
  phone: z.string().min(7, 'Enter a valid phone number'),
  country_code: z.string().default('+971'),
  source: z.enum(LEAD_SOURCES),
  stage_id: z.string().min(1, 'Select a stage'),
  raw_message: z.string().optional(),
  budget_amount: z.preprocess(
    v => (v === '' || v == null ? undefined : Number(v)),
    z.number().positive().optional()
  ),
  occasion: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
})

type FormData = z.infer<typeof schema>

interface Stage {
  id: string
  name: string
  color: string
  order_index: number
}

interface AddLeadModalProps {
  stages: Stage[]
  currency: string
  countryCode: string
  aiTagging: boolean
  onCreated: (lead: unknown) => void
}

export default function AddLeadModal({ stages, currency, countryCode, aiTagging, onCreated }: AddLeadModalProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  const defaultStage = stages.find(s => s.order_index === 0) ?? stages[0]

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      country_code: countryCode,
      source: 'manual',
      stage_id: defaultStage?.id ?? '',
    },
  })

  const source = watch('source')
  const showRawMessage = source === 'whatsapp' || source === 'instagram'

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          email: data.email || undefined,
          raw_message: data.raw_message || undefined,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error ?? 'Failed to create lead')

      toast.success(`Lead added${aiTagging && data.raw_message ? ' — AI tags applied' : ''}`)
      onCreated(result.lead)
      reset()
      setOpen(false)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full bg-charcoal-800 border border-charcoal-700 focus:border-gold-500 rounded-lg px-3 py-2 text-white placeholder:text-charcoal-500 outline-none transition-colors text-sm'
  const labelCls = 'block text-xs text-charcoal-400 mb-1'
  const errorCls = 'text-red-400 text-xs mt-1'

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="bg-gold-500 hover:bg-gold-400 text-charcoal-900 font-semibold px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2">
          + Add Lead
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-charcoal-900 border border-charcoal-700 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="font-display text-lg font-semibold text-white">Add New Lead</Dialog.Title>
            <Dialog.Close className="text-charcoal-400 hover:text-white">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelCls}>Full name *</label>
                <input {...register('full_name')} placeholder="Khalid Al Rashid" className={inputCls} />
                {errors.full_name && <p className={errorCls}>{errors.full_name.message}</p>}
              </div>

              <div>
                <label className={labelCls}>Country code</label>
                <select {...register('country_code')} className={inputCls}>
                  <option value="+971">+971 UAE</option>
                  <option value="+91">+91 India</option>
                  <option value="+1">+1 US</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>Phone *</label>
                <input {...register('phone')} placeholder="50 123 4567" className={inputCls} />
                {errors.phone && <p className={errorCls}>{errors.phone.message}</p>}
              </div>

              <div>
                <label className={labelCls}>Source</label>
                <select {...register('source')} className={inputCls}>
                  <option value="manual">Manual</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="instagram">Instagram</option>
                  <option value="walk_in">Walk-in</option>
                  <option value="phone">Phone call</option>
                </select>
              </div>

              <div>
                <label className={labelCls}>Stage *</label>
                <select {...register('stage_id')} className={inputCls}>
                  {stages.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {errors.stage_id && <p className={errorCls}>{errors.stage_id.message}</p>}
              </div>

              <div>
                <label className={labelCls}>Budget ({currency})</label>
                <input
                  {...register('budget_amount')}
                  type="number"
                  placeholder="e.g. 20000"
                  className={inputCls}
                />
              </div>

              <div>
                <label className={labelCls}>Occasion</label>
                <input {...register('occasion')} placeholder="Wedding, Anniversary…" className={inputCls} />
              </div>

              <div className="col-span-2">
                <label className={labelCls}>Email (optional)</label>
                <input {...register('email')} type="email" placeholder="customer@email.com" className={inputCls} />
              </div>
            </div>

            {showRawMessage && (
              <div>
                <label className={cn(labelCls, 'flex items-center gap-1.5')}>
                  Paste message
                  {aiTagging && (
                    <span className="flex items-center gap-1 text-gold-400 text-xs">
                      <Zap className="w-3 h-3" /> AI will auto-tag
                    </span>
                  )}
                </label>
                <textarea
                  {...register('raw_message')}
                  rows={3}
                  placeholder={`Paste the ${source === 'whatsapp' ? 'WhatsApp' : 'Instagram'} message here…`}
                  className={cn(inputCls, 'resize-none')}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold-500 hover:bg-gold-400 disabled:opacity-60 text-charcoal-900 font-semibold py-2.5 rounded-xl transition-all text-sm flex items-center justify-center gap-2 mt-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Creating…' : 'Create lead'}
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ')
}
