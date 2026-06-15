'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

type FormData = z.infer<typeof schema>

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      // Step 1: get tenant subdomain via server (bypasses RLS)
      const tenantRes = await fetch('/api/auth/get-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      })
      const tenantData = await tenantRes.json()
      if (!tenantRes.ok) throw new Error(tenantData.error ?? 'No store found for this account')

      // Step 2: sign in with Supabase auth
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })
      if (error) throw error

      // Step 3: redirect to tenant dashboard
      const { subdomain } = tenantData
      const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'preciousai.app'
      const isLocalhost = window.location.hostname === 'localhost'
      const port = window.location.port ? `:${window.location.port}` : ''

      if (isLocalhost) {
        // Set cookie so proxy can identify tenant without subdomain DNS
        document.cookie = `x-dev-tenant=${subdomain}; path=/; max-age=86400`
        window.location.href = `http://localhost${port}/home`
      } else {
        window.location.href = `https://${subdomain}.${appDomain}/home`
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      {params.get('registered') && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 mb-6 text-emerald-400 text-sm text-center">
          Account created! Please verify your email then sign in.
        </div>
      )}
      <div className="dark-glass rounded-2xl p-8">
        <h1 className="font-display text-2xl font-bold text-white mb-1">Welcome back</h1>
        <p className="text-charcoal-400 text-sm mb-8">Sign in to your store dashboard</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm text-charcoal-300 mb-1.5">Email</label>
            <input
              {...register('email')}
              type="email"
              placeholder="you@yourstore.com"
              className="w-full bg-charcoal-800 border border-charcoal-700 focus:border-gold-500 rounded-lg px-4 py-2.5 text-white placeholder:text-charcoal-500 outline-none transition-colors text-sm"
            />
            {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-sm text-charcoal-300">Password</label>
              <Link href="/forgot-password" className="text-xs text-gold-400 hover:text-gold-300">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder="Your password"
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold-500 hover:bg-gold-400 disabled:opacity-60 text-charcoal-900 font-semibold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Sign in
          </button>
        </form>

        <p className="text-center text-charcoal-400 text-sm mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-gold-400 hover:text-gold-300">Start free trial</Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="w-full max-w-md h-64 dark-glass rounded-2xl animate-pulse" />}>
      <LoginForm />
    </Suspense>
  )
}
