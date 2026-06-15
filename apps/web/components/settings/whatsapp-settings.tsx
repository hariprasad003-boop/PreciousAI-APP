'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { MessageCircle, CheckCircle2, ExternalLink, Loader2, Lock } from 'lucide-react'
import type { PlanId } from '@preciousai/shared'

interface WhatsAppConfig {
  id: string
  phone_number_id: string
  is_active: boolean
  webhook_configured_at: string | null
}

interface WhatsAppSettingsProps {
  config: WhatsAppConfig | null
  plan: PlanId
  tenantId: string
}

const SETUP_STEPS = [
  { step: 1, title: 'Create Meta Developer App', desc: 'Go to developers.facebook.com and create a new app with WhatsApp product.' },
  { step: 2, title: 'Add WhatsApp to your app', desc: 'In the app dashboard, add the WhatsApp product and complete Business Verification.' },
  { step: 3, title: 'Get your Phone Number ID', desc: 'In WhatsApp → Getting Started, copy your Phone Number ID.' },
  { step: 4, title: 'Generate access token', desc: 'Create a permanent System User token with whatsapp_business_management permission.' },
  { step: 5, title: 'Configure webhook', desc: 'Set webhook URL to your store\'s webhook endpoint and paste the verify token below.' },
]

export default function WhatsAppSettings({ config, plan, tenantId }: WhatsAppSettingsProps) {
  const router = useRouter()
  const [phoneNumberId, setPhoneNumberId] = useState(config?.phone_number_id ?? '')
  const [accessToken, setAccessToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSetup, setShowSetup] = useState(!config?.is_active)

  const isLocked = plan === 'starter'

  if (isLocked) {
    return (
      <div className="dark-glass rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-charcoal-800 rounded-lg flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-charcoal-500" />
          </div>
          <h2 className="font-display text-base font-semibold text-charcoal-400">WhatsApp Integration</h2>
          <span className="ml-auto flex items-center gap-1 text-xs bg-charcoal-800 text-charcoal-500 px-2 py-0.5 rounded-full">
            <Lock className="w-3 h-3" /> Pro+
          </span>
        </div>
        <p className="text-charcoal-500 text-sm mb-4">
          Connect your WhatsApp Business number to automatically capture inbound messages as leads.
        </p>
        <a
          href="/settings/billing"
          className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-charcoal-900 font-semibold px-4 py-2 rounded-lg text-sm transition-all"
        >
          Upgrade to Pro
        </a>
      </div>
    )
  }

  async function saveConfig() {
    if (!phoneNumberId || !accessToken) {
      toast.error('Phone Number ID and access token are required')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/integrations/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number_id: phoneNumberId, access_token: accessToken }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save')
      toast.success('WhatsApp configured successfully')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const webhookUrl = `https://preciousai.app/api/webhooks/whatsapp`

  return (
    <div className="dark-glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-white">WhatsApp Integration</h2>
            {config?.is_active && (
              <div className="flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 text-xs">Connected</span>
              </div>
            )}
          </div>
        </div>
        {config?.is_active && (
          <button
            onClick={() => setShowSetup(!showSetup)}
            className="text-xs text-charcoal-400 hover:text-white"
          >
            {showSetup ? 'Hide setup' : 'Reconfigure'}
          </button>
        )}
      </div>

      {config?.is_active && !showSetup ? (
        <div className="space-y-3">
          <div className="bg-charcoal-800 rounded-lg p-3">
            <p className="text-charcoal-500 text-xs mb-1">Phone Number ID</p>
            <p className="text-white text-sm font-mono">{config.phone_number_id}</p>
          </div>
          <div className="bg-charcoal-800 rounded-lg p-3">
            <p className="text-charcoal-500 text-xs mb-1">Webhook URL</p>
            <p className="text-white text-sm font-mono break-all">{webhookUrl}</p>
          </div>
          {config.webhook_configured_at && (
            <p className="text-charcoal-500 text-xs">
              Configured {new Date(config.webhook_configured_at).toLocaleDateString()}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {/* Step guide */}
          <div className="space-y-3">
            {SETUP_STEPS.map(s => (
              <div key={s.step} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-charcoal-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-charcoal-400 text-xs font-medium">{s.step}</span>
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{s.title}</p>
                  <p className="text-charcoal-400 text-xs mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <a
            href="https://developers.facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-gold-400 hover:text-gold-300"
          >
            Open Meta Developer Portal <ExternalLink className="w-3 h-3" />
          </a>

          {/* Webhook URL (read-only) */}
          <div>
            <p className="text-xs text-charcoal-400 mb-1.5">Your webhook URL</p>
            <div className="bg-charcoal-800 border border-charcoal-700 rounded-lg px-3 py-2 flex items-center justify-between">
              <span className="text-white text-xs font-mono">{webhookUrl}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success('Copied') }}
                className="text-charcoal-400 hover:text-white text-xs ml-2 flex-shrink-0"
              >
                Copy
              </button>
            </div>
          </div>

          {/* Inputs */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-charcoal-400 mb-1.5">Phone Number ID</label>
              <input
                value={phoneNumberId}
                onChange={e => setPhoneNumberId(e.target.value)}
                placeholder="1234567890123456"
                className="w-full bg-charcoal-800 border border-charcoal-700 focus:border-gold-500 rounded-lg px-3 py-2 text-white text-sm font-mono outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-charcoal-400 mb-1.5">Access Token</label>
              <input
                value={accessToken}
                onChange={e => setAccessToken(e.target.value)}
                type="password"
                placeholder="EAAxxxxxxxx..."
                className="w-full bg-charcoal-800 border border-charcoal-700 focus:border-gold-500 rounded-lg px-3 py-2 text-white text-sm font-mono outline-none transition-colors"
              />
            </div>
          </div>

          <button
            onClick={saveConfig}
            disabled={loading || !phoneNumberId || !accessToken}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-all"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Save configuration
          </button>
        </div>
      )}
    </div>
  )
}
