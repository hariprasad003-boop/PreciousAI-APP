'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle, XCircle, ChevronDown, Trash2 } from 'lucide-react'

interface Stage {
  id: string
  name: string
  color: string
  order_index: number
}

interface LeadActionsProps {
  lead: {
    id: string
    stage_id: string
    full_name: string
  }
  stages: Stage[]
  tenantId: string
}

export default function LeadActions({ lead, stages, tenantId }: LeadActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const sortedStages = [...stages].sort((a, b) => a.order_index - b.order_index)
  const wonStage = sortedStages.find(s => s.name.toLowerCase() === 'won')
  const lostStage = sortedStages.find(s => s.name.toLowerCase() === 'lost')

  async function moveStage(stageId: string) {
    setLoading(stageId)
    try {
      const res = await fetch(`/api/leads/${lead.id}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage_id: stageId }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success('Stage updated')
      router.refresh()
    } catch {
      toast.error('Failed to update stage')
    } finally {
      setLoading(null)
    }
  }

  async function deleteLead() {
    if (!confirm(`Delete lead "${lead.full_name}"? This cannot be undone.`)) return
    setLoading('delete')
    try {
      const res = await fetch(`/api/leads/${lead.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      toast.success('Lead deleted')
      router.push('/leads')
    } catch {
      toast.error('Failed to delete lead')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="dark-glass rounded-2xl p-5 space-y-4">
      <h2 className="font-display text-sm font-semibold text-white">Actions</h2>

      {/* Move stage */}
      <div>
        <p className="text-charcoal-400 text-xs mb-2">Move to stage</p>
        <div className="relative">
          <select
            value={lead.stage_id}
            onChange={e => moveStage(e.target.value)}
            disabled={!!loading}
            className="w-full bg-charcoal-800 border border-charcoal-700 focus:border-gold-500 rounded-lg px-3 py-2 text-white text-sm appearance-none outline-none pr-8 disabled:opacity-50"
          >
            {sortedStages.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-charcoal-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Quick win/lost */}
      <div className="grid grid-cols-2 gap-2">
        {wonStage && lead.stage_id !== wonStage.id && (
          <button
            onClick={() => moveStage(wonStage.id)}
            disabled={!!loading}
            className="flex items-center justify-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-medium py-2 rounded-lg transition-all disabled:opacity-50"
          >
            <CheckCircle className="w-3.5 h-3.5" /> Mark Won
          </button>
        )}
        {lostStage && lead.stage_id !== lostStage.id && (
          <button
            onClick={() => moveStage(lostStage.id)}
            disabled={!!loading}
            className="flex items-center justify-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-medium py-2 rounded-lg transition-all disabled:opacity-50"
          >
            <XCircle className="w-3.5 h-3.5" /> Mark Lost
          </button>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={deleteLead}
        disabled={!!loading}
        className="w-full flex items-center justify-center gap-1.5 text-charcoal-500 hover:text-red-400 text-xs py-2 transition-colors disabled:opacity-50"
      >
        <Trash2 className="w-3.5 h-3.5" /> Delete lead
      </button>
    </div>
  )
}
