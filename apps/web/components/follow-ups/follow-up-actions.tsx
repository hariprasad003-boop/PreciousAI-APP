'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle, SkipForward, Loader2 } from 'lucide-react'

export default function FollowUpActions({ followUpId }: { followUpId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function update(status: 'done' | 'skipped') {
    setLoading(status)
    try {
      const res = await fetch(`/api/follow-ups/${followUpId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(status === 'done' ? 'Marked as done' : 'Skipped')
      router.refresh()
    } catch {
      toast.error('Failed to update')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <button
        onClick={() => update('done')}
        disabled={!!loading}
        className="flex items-center gap-1 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50"
      >
        {loading === 'done' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
        Done
      </button>
      <button
        onClick={() => update('skipped')}
        disabled={!!loading}
        className="flex items-center gap-1 text-xs bg-charcoal-800 hover:bg-charcoal-700 text-charcoal-400 hover:text-white px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50"
      >
        {loading === 'skipped' ? <Loader2 className="w-3 h-3 animate-spin" /> : <SkipForward className="w-3 h-3" />}
        Skip
      </button>
    </div>
  )
}
