'use client'

import { useState } from 'react'
import { AlertTriangle, X, Loader2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

export default function PastDueBanner() {
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(false)

  if (dismissed) return null

  async function openPortal() {
    setLoading(true)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to open portal')
      window.location.href = data.url
    } catch (err: any) {
      toast.error(err.message)
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3 bg-red-500/10 border-b border-red-500/30 px-6 py-3">
      <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
      <p className="text-red-300 text-sm flex-1">
        <span className="font-semibold">Payment failed.</span>{' '}
        Please update your payment method to keep your account active.
      </p>
      <button
        onClick={openPortal}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs bg-red-500 hover:bg-red-400 text-white font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60 flex-shrink-0"
      >
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <ExternalLink className="w-3 h-3" />
        )}
        Fix billing
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="text-red-400 hover:text-red-300 transition-colors flex-shrink-0"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
