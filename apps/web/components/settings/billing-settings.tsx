'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  CreditCard,
  Loader2,
  Check,
  AlertTriangle,
  Clock,
  Zap,
  Building2,
  ExternalLink,
} from 'lucide-react'
import { PLANS } from '@preciousai/shared'
import type { PlanId } from '@preciousai/shared'

interface BillingSettingsProps {
  plan: PlanId
  subscriptionStatus: string | null
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  hasStripeCustomer: boolean
}

const PLAN_FEATURES: Array<{ label: string; starter: boolean; pro: boolean; enterprise: boolean }> = [
  { label: 'CRM',              starter: true,  pro: true,  enterprise: true  },
  { label: 'AI Lead Tagging',  starter: false, pro: true,  enterprise: true  },
  { label: 'Voice to CRM',     starter: false, pro: true,  enterprise: true  },
  { label: 'WhatsApp',         starter: false, pro: true,  enterprise: true  },
  { label: 'Instagram Parser', starter: false, pro: true,  enterprise: true  },
  { label: 'AI Follow-up',     starter: false, pro: true,  enterprise: true  },
  { label: 'AI Scoring',       starter: false, pro: true,  enterprise: true  },
  { label: 'Custom Domain',    starter: false, pro: false, enterprise: true  },
]

const STATUS_LABELS: Record<string, string> = {
  active:    'Active',
  trial:     'Trial',
  cancelled: 'Cancelled',
  past_due:  'Past Due',
}

function daysLeft(dateStr: string): number {
  const end = new Date(dateStr).getTime()
  const now = Date.now()
  return Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)))
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function BillingSettings({
  plan,
  subscriptionStatus,
  trialEndsAt,
  currentPeriodEnd,
  hasStripeCustomer,
}: BillingSettingsProps) {
  const router = useRouter()
  const [loadingPortal, setLoadingPortal] = useState(false)
  const [loadingCheckout, setLoadingCheckout] = useState<'starter' | 'pro' | null>(null)

  const status = subscriptionStatus ?? 'trial'
  const currentPlan = PLANS[plan] ?? PLANS.starter

  const trialDaysLeft = trialEndsAt ? daysLeft(trialEndsAt) : null
  const isTrialExpiringSoon = trialDaysLeft !== null && trialDaysLeft < 7 && status === 'trial'

  async function openPortal() {
    setLoadingPortal(true)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to open portal')
      window.location.href = data.url
    } catch (err: any) {
      toast.error(err.message)
      setLoadingPortal(false)
    }
  }

  async function startCheckout(targetPlan: 'starter' | 'pro') {
    setLoadingCheckout(targetPlan)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: targetPlan }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to start checkout')
      window.location.href = data.url
    } catch (err: any) {
      toast.error(err.message)
      setLoadingCheckout(null)
    }
  }

  return (
    <div className="dark-glass rounded-2xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gold-500/10 rounded-lg flex items-center justify-center">
          <CreditCard className="w-4 h-4 text-gold-500" />
        </div>
        <h2 className="font-display text-base font-semibold text-white">Billing & Plan</h2>
      </div>

      {/* Trial expiry warning */}
      {isTrialExpiringSoon && (
        <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-amber-300 text-sm">
            <span className="font-semibold">
              {trialDaysLeft === 0 ? 'Your trial ends today' : `${trialDaysLeft} day${trialDaysLeft === 1 ? '' : 's'} left in trial`}
            </span>
            {' — '} upgrade now to keep access to all features.
          </p>
        </div>
      )}

      {/* Current plan card */}
      <div className="bg-charcoal-800 rounded-xl p-4 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-charcoal-400 text-xs">Current plan</p>
          <div className="flex items-center gap-2">
            <p className="text-white font-semibold font-display text-lg">{currentPlan.name}</p>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                status === 'active'
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : status === 'past_due'
                  ? 'bg-red-500/15 text-red-400'
                  : status === 'cancelled'
                  ? 'bg-charcoal-600 text-charcoal-300'
                  : 'bg-blue-500/15 text-blue-400'
              }`}
            >
              {STATUS_LABELS[status] ?? status}
            </span>
          </div>
          {status === 'trial' && trialEndsAt && (
            <p className="text-charcoal-400 text-xs flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Trial ends {formatDate(trialEndsAt)}
            </p>
          )}
          {status === 'active' && currentPeriodEnd && (
            <p className="text-charcoal-400 text-xs">
              Renews {formatDate(currentPeriodEnd)}
            </p>
          )}
          {status === 'cancelled' && currentPeriodEnd && (
            <p className="text-charcoal-400 text-xs">
              Access until {formatDate(currentPeriodEnd)}
            </p>
          )}
        </div>

        {hasStripeCustomer && (
          <button
            onClick={openPortal}
            disabled={loadingPortal}
            className="flex items-center gap-2 text-sm bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
          >
            {loadingPortal ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ExternalLink className="w-3.5 h-3.5" />
            )}
            Manage
          </button>
        )}
      </div>

      {/* Plan comparison */}
      <div className="grid grid-cols-3 gap-3">
        {/* Starter */}
        <div
          className={`rounded-xl border p-4 flex flex-col gap-3 transition-all ${
            plan === 'starter' && status !== 'trial'
              ? 'border-gold-500/60 bg-gold-500/5'
              : 'border-charcoal-700 bg-charcoal-800/50'
          }`}
        >
          <div>
            <p className="text-white font-semibold font-display">Starter</p>
            <p className="text-charcoal-400 text-xs mt-0.5">$49 / mo</p>
          </div>
          <ul className="space-y-1 flex-1">
            <li className="text-charcoal-400 text-xs">1 seat · 500 customers · 1 location</li>
            <li className="text-charcoal-400 text-xs">CRM included</li>
          </ul>
          {plan === 'starter' && status === 'active' ? (
            <span className="text-center text-xs text-gold-400 font-medium py-2">
              Current plan
            </span>
          ) : plan !== 'starter' ? (
            <span className="text-center text-xs text-charcoal-500 py-2">
              Downgrade via portal
            </span>
          ) : (
            <button
              onClick={() => startCheckout('starter')}
              disabled={loadingCheckout !== null}
              className="w-full flex items-center justify-center gap-2 text-xs bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 text-white py-2 rounded-lg transition-colors disabled:opacity-60"
            >
              {loadingCheckout === 'starter' ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : null}
              Subscribe
            </button>
          )}
        </div>

        {/* Pro */}
        <div
          className={`rounded-xl border p-4 flex flex-col gap-3 transition-all ${
            plan === 'pro'
              ? 'border-gold-500/60 bg-gold-500/5'
              : 'border-charcoal-700 bg-charcoal-800/50'
          }`}
        >
          <div className="flex items-center gap-2">
            <div>
              <p className="text-white font-semibold font-display">Pro</p>
              <p className="text-charcoal-400 text-xs mt-0.5">$149 / mo</p>
            </div>
            <span className="text-[10px] bg-gold-500 text-charcoal-900 font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide">
              Popular
            </span>
          </div>
          <ul className="space-y-1 flex-1">
            <li className="text-charcoal-400 text-xs">5 seats · 5,000 customers · 3 locations</li>
            <li className="text-charcoal-400 text-xs">All AI features</li>
          </ul>
          {plan === 'pro' && status === 'active' ? (
            <span className="text-center text-xs text-gold-400 font-medium py-2">
              Current plan
            </span>
          ) : (
            <button
              onClick={() => startCheckout('pro')}
              disabled={loadingCheckout !== null}
              className="w-full flex items-center justify-center gap-2 text-xs bg-gold-500 hover:bg-gold-400 text-charcoal-900 font-semibold py-2 rounded-lg transition-colors disabled:opacity-60"
            >
              {loadingCheckout === 'pro' ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Zap className="w-3 h-3" />
              )}
              {plan === 'pro' ? 'Renew' : 'Upgrade'}
            </button>
          )}
        </div>

        {/* Enterprise */}
        <div className="rounded-xl border border-charcoal-700 bg-charcoal-800/50 p-4 flex flex-col gap-3">
          <div>
            <p className="text-white font-semibold font-display">Enterprise</p>
            <p className="text-charcoal-400 text-xs mt-0.5">Custom pricing</p>
          </div>
          <ul className="space-y-1 flex-1">
            <li className="text-charcoal-400 text-xs">Unlimited everything</li>
            <li className="text-charcoal-400 text-xs">Custom domain + SLA</li>
          </ul>
          <a
            href="mailto:sales@preciousai.app?subject=Enterprise%20Enquiry"
            className="w-full flex items-center justify-center gap-1.5 text-xs bg-charcoal-700 hover:bg-charcoal-600 border border-charcoal-600 text-white py-2 rounded-lg transition-colors"
          >
            <Building2 className="w-3 h-3" />
            Contact sales
          </a>
        </div>
      </div>

      {/* Feature comparison table */}
      <div className="rounded-xl border border-charcoal-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-charcoal-800 border-b border-charcoal-700">
              <th className="text-left text-charcoal-400 text-xs font-medium px-4 py-3 w-1/2">
                Feature
              </th>
              <th className="text-center text-charcoal-400 text-xs font-medium px-2 py-3">Starter</th>
              <th className="text-center text-charcoal-400 text-xs font-medium px-2 py-3">Pro</th>
              <th className="text-center text-charcoal-400 text-xs font-medium px-2 py-3">Enterprise</th>
            </tr>
          </thead>
          <tbody>
            {PLAN_FEATURES.map((feature, idx) => (
              <tr
                key={feature.label}
                className={`border-b border-charcoal-800 last:border-0 ${
                  idx % 2 === 0 ? 'bg-charcoal-900/30' : ''
                }`}
              >
                <td className="text-charcoal-300 text-xs px-4 py-2.5">{feature.label}</td>
                <td className="text-center px-2 py-2.5">
                  {feature.starter ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400 mx-auto" />
                  ) : (
                    <span className="text-charcoal-600 text-xs">—</span>
                  )}
                </td>
                <td className="text-center px-2 py-2.5">
                  {feature.pro ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400 mx-auto" />
                  ) : (
                    <span className="text-charcoal-600 text-xs">—</span>
                  )}
                </td>
                <td className="text-center px-2 py-2.5">
                  {feature.enterprise ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400 mx-auto" />
                  ) : (
                    <span className="text-charcoal-600 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
