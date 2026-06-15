'use client'

import { useState } from 'react'
import { Loader2, Lock, Zap, Building2 } from 'lucide-react'
import { toast } from 'sonner'

export default function TrialExpiredGate() {
  const [loadingPlan, setLoadingPlan] = useState<'starter' | 'pro' | null>(null)

  async function startCheckout(plan: 'starter' | 'pro') {
    setLoadingPlan(plan)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to start checkout')
      window.location.href = data.url
    } catch (err: any) {
      toast.error(err.message)
      setLoadingPlan(null)
    }
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-charcoal-950/95 backdrop-blur-sm z-50">
      <div className="dark-glass rounded-2xl p-8 max-w-lg w-full mx-4 text-center space-y-6">
        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-gold-500/10 border border-gold-500/20 flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7 text-gold-400" />
        </div>

        {/* Copy */}
        <div className="space-y-2">
          <h2 className="font-display text-xl font-bold text-white">Your trial has ended</h2>
          <p className="text-charcoal-400 text-sm leading-relaxed">
            Choose a plan to continue using PreciousAI and keep all your data, leads, and customer history.
          </p>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-2 gap-3">
          {/* Starter */}
          <div className="bg-charcoal-800 rounded-xl border border-charcoal-700 p-4 flex flex-col gap-3 text-left">
            <div>
              <p className="text-white font-semibold font-display">Starter</p>
              <p className="text-gold-400 text-sm font-bold mt-0.5">$49 / mo</p>
            </div>
            <ul className="space-y-1 text-xs text-charcoal-400 flex-1">
              <li>1 seat · 500 customers</li>
              <li>CRM access</li>
            </ul>
            <button
              onClick={() => startCheckout('starter')}
              disabled={loadingPlan !== null}
              className="w-full flex items-center justify-center gap-2 bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-60"
            >
              {loadingPlan === 'starter' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : null}
              Subscribe
            </button>
          </div>

          {/* Pro */}
          <div className="bg-gold-500/5 rounded-xl border border-gold-500/40 p-4 flex flex-col gap-3 text-left">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-white font-semibold font-display">Pro</p>
                <span className="text-[10px] bg-gold-500 text-charcoal-900 font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                  Popular
                </span>
              </div>
              <p className="text-gold-400 text-sm font-bold mt-0.5">$149 / mo</p>
            </div>
            <ul className="space-y-1 text-xs text-charcoal-400 flex-1">
              <li>5 seats · 5,000 customers</li>
              <li>All AI features</li>
            </ul>
            <button
              onClick={() => startCheckout('pro')}
              disabled={loadingPlan !== null}
              className="w-full flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-400 text-charcoal-900 text-sm font-semibold py-2 rounded-lg transition-colors disabled:opacity-60"
            >
              {loadingPlan === 'pro' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
              Upgrade
            </button>
          </div>
        </div>

        {/* Enterprise link */}
        <a
          href="mailto:sales@preciousai.app?subject=Enterprise%20Enquiry"
          className="inline-flex items-center gap-1.5 text-xs text-charcoal-400 hover:text-charcoal-300 transition-colors"
        >
          <Building2 className="w-3.5 h-3.5" />
          Need unlimited scale? Contact sales for Enterprise pricing
        </a>
      </div>
    </div>
  )
}
