'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, X, UserPlus } from 'lucide-react'
import { METAL_PREFERENCES, STONE_PREFERENCES } from '@preciousai/shared'

const schema = z.object({
  full_name: z.string().min(2, 'Name required'),
  phone: z.string().min(7, 'Valid phone required'),
  country_code: z.string().default('+971'),
  email: z.string().email().optional().or(z.literal('')),
  dob: z.string().optional(),
  anniversary_date: z.string().optional(),
  city: z.string().optional(),
  notes: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface AddCustomerModalProps {
  countryCode: string
  currency: string
  onCreated: (customer: unknown) => void
}

const inputCls = 'w-full bg-charcoal-800 border border-charcoal-700 focus:border-gold-500 rounded-lg px-3 py-2 text-white placeholder:text-charcoal-500 outline-none transition-colors text-sm'
const labelCls = 'block text-xs text-charcoal-400 mb-1.5'

export default function AddCustomerModal({ countryCode, currency, onCreated }: AddCustomerModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [metalPrefs, setMetalPrefs] = useState<string[]>([])
  const [stonePrefs, setStonePrefs] = useState<string[]>([])

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { country_code: countryCode },
  })

  function togglePref(arr: string[], setArr: (v: string[]) => void, val: string) {
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])
  }

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          email: data.email || undefined,
          metal_pref: metalPrefs,
          stone_pref: stonePrefs,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error ?? 'Failed to create customer')
      toast.success('Customer added')
      onCreated(result.customer)
      reset()
      setMetalPrefs([])
      setStonePrefs([])
      setOpen(false)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-charcoal-900 font-semibold px-4 py-2 rounded-lg text-sm transition-all">
          <UserPlus className="w-4 h-4" /> Add Customer
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg bg-charcoal-900 border border-charcoal-700 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="font-display text-lg font-semibold text-white">Add Customer</Dialog.Title>
            <Dialog.Close className="text-charcoal-400 hover:text-white">
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelCls}>Full name *</label>
                <input {...register('full_name')} placeholder="Priya Menon" className={inputCls} />
                {errors.full_name && <p className="text-red-400 text-xs mt-1">{errors.full_name.message}</p>}
              </div>
              <div>
                <label className={labelCls}>Country code</label>
                <select {...register('country_code')} className={inputCls}>
                  <option value="+971">+971 UAE</option>
                  <option value="+91">+91 India</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Phone *</label>
                <input {...register('phone')} placeholder="55 123 4567" className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Email</label>
                <input {...register('email')} type="email" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Date of birth</label>
                <input {...register('dob')} type="date" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Anniversary date</label>
                <input {...register('anniversary_date')} type="date" className={inputCls} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>City</label>
                <input {...register('city')} placeholder="Dubai" className={inputCls} />
              </div>
            </div>

            {/* Metal preferences */}
            <div>
              <label className={labelCls}>Metal preferences</label>
              <div className="flex flex-wrap gap-2">
                {METAL_PREFERENCES.map(m => (
                  <button key={m} type="button"
                    onClick={() => togglePref(metalPrefs, setMetalPrefs, m)}
                    className={`text-xs px-3 py-1.5 rounded-full transition-all capitalize ${metalPrefs.includes(m) ? 'bg-gold-500 text-charcoal-900 font-medium' : 'bg-charcoal-800 text-charcoal-400 hover:text-white'}`}
                  >
                    {m.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Stone preferences */}
            <div>
              <label className={labelCls}>Stone preferences</label>
              <div className="flex flex-wrap gap-2">
                {STONE_PREFERENCES.map(s => (
                  <button key={s} type="button"
                    onClick={() => togglePref(stonePrefs, setStonePrefs, s)}
                    className={`text-xs px-3 py-1.5 rounded-full transition-all capitalize ${stonePrefs.includes(s) ? 'bg-gold-500 text-charcoal-900 font-medium' : 'bg-charcoal-800 text-charcoal-400 hover:text-white'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={labelCls}>Notes</label>
              <textarea {...register('notes')} rows={2} className={`${inputCls} resize-none`} />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-400 disabled:opacity-60 text-charcoal-900 font-semibold py-2.5 rounded-xl text-sm transition-all"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Add customer
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
