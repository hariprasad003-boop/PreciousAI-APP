'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { generateSubdomain } from '@/lib/utils'

const schema = z.object({
  store_name: z.string().min(2, 'Store name must be at least 2 characters'),
  full_name: z.string().min(2, 'Your name is required'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  country: z.enum(['UAE', 'India'], { required_error: 'Select your country' }),
  plan: z.enum(['starter', 'pro', 'enterprise']).default('starter'),
})

type FormData = z.infer<typeof schema>

export default function SignupPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { plan: 'starter', country: 'UAE' },
  })

  const storeName = watch('store_name')
  const subdomain = storeName ? generateSubdomain(storeName) : ''

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error ?? 'Signup failed')

      toast.success('Account created! Check your email to verify.')
      router.push('/login?registered=true')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="dark-glass rounded-2xl p-8">
        <h1 className="font-display text-2xl font-bold text-white mb-1">Create your store</h1>
        <p className="text-charcoal-400 text-sm mb-8">Start your 14-day free trial. No credit card needed.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm text-charcoal-300 mb-1.5">Store name</label>
            <input
              {...register('store_name')}
              placeholder="Gold Palace Dubai"
              className="w-full bg-charcoal-800 border border-charcoal-700 focus:border-gold-500 rounded-lg px-4 py-2.5 text-white placeholder:text-charcoal-500 outline-none transition-colors text-sm"
            />
            {subdomain && (
              <p className="text-charcoal-500 text-xs mt-1">
                Your URL: <span className="text-gold-500">{subdomain}.preciousai.app</span>
              </p>
            )}
            {errors.store_name && <p className="text-red-400 text-xs mt-1">{errors.store_name.message}</p>}
          </div>

          <div>
            <label className="block text-sm text-charcoal-300 mb-1.5">Your name</label>
            <input
              {...register('full_name')}
              placeholder="Khalid Al Mansoori"
              className="w-full bg-charcoal-800 border border-charcoal-700 focus:border-gold-500 rounded-lg px-4 py-2.5 text-white placeholder:text-charcoal-500 outline-none transition-colors text-sm"
            />
            {errors.full_name && <p className="text-red-400 text-xs mt-1">{errors.full_name.message}</p>}
          </div>

          <div>
            <label className="block text-sm text-charcoal-300 mb-1.5">Work email</label>
            <input
              {...register('email')}
              type="email"
              placeholder="you@goldpalace.com"
              className="w-full bg-charcoal-800 border border-charcoal-700 focus:border-gold-500 rounded-lg px-4 py-2.5 text-white placeholder:text-charcoal-500 outline-none transition-colors text-sm"
            />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block text-sm text-charcoal-300 mb-1.5">Password</label>
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                className="w-full bg-charcoal-800 border border-charcoal-700 focus:border-gold-500 rounded-lg px-4 py-2.5 text-white placeholder:text-charcoal-500 outline-none transition-colors text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-sm text-charcoal-300 mb-1.5">Country</label>
            <select
              {...register('country')}
              className="w-full bg-charcoal-800 border border-charcoal-700 focus:border-gold-500 rounded-lg px-4 py-2.5 text-white outline-none transition-colors text-sm"
            >
              <option value="UAE">UAE (+971)</option>
              <option value="India">India (+91)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-charcoal-300 mb-1.5">Plan</label>
            <div className="grid grid-cols-3 gap-2">
              {(['starter', 'pro', 'enterprise'] as const).map((p) => (
                <label
                  key={p}
                  className="relative cursor-pointer"
                >
                  <input {...register('plan')} type="radio" value={p} className="sr-only peer" />
                  <div className="text-center py-2 px-3 rounded-lg border border-charcoal-700 peer-checked:border-gold-500 peer-checked:bg-gold-500/10 transition-all">
                    <p className="text-white text-xs font-medium capitalize">{p}</p>
                    <p className="text-charcoal-400 text-xs">{p === 'starter' ? '$49' : p === 'pro' ? '$149' : 'Custom'}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold-500 hover:bg-gold-400 disabled:opacity-60 text-charcoal-900 font-semibold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Create my store
          </button>
        </form>

        <p className="text-center text-charcoal-400 text-sm mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-gold-400 hover:text-gold-300">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
