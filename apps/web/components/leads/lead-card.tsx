'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Phone, MessageCircle, Instagram, User, Mic, ChevronDown } from 'lucide-react'
import { cn, formatCurrency, intentScoreLabel } from '@/lib/utils'

const SOURCE_ICONS: Record<string, React.ElementType> = {
  whatsapp: MessageCircle,
  instagram: Instagram,
  walk_in: User,
  phone: Phone,
  manual: User,
}

const SOURCE_COLORS: Record<string, string> = {
  whatsapp: 'text-emerald-400',
  instagram: 'text-pink-400',
  walk_in: 'text-blue-400',
  phone: 'text-purple-400',
  manual: 'text-charcoal-400',
}

interface LeadStage {
  id: string
  name: string
  color: string
  order_index: number
}

interface LeadCardProps {
  lead: {
    id: string
    full_name: string
    phone: string
    source: string
    intent_score: number | null
    budget_amount: number | null
    budget_currency: string | null
    tags: string[]
    occasion: string | null
    stage_id: string
    created_at: string
    assigned_user?: { id: string; full_name: string } | null
  }
  stages: LeadStage[]
  currency: string
  onStageChange: (leadId: string, stageId: string) => void
}

export default function LeadCard({ lead, stages, currency, onStageChange }: LeadCardProps) {
  const router = useRouter()
  const [movingStage, setMovingStage] = useState(false)
  const SourceIcon = SOURCE_ICONS[lead.source] ?? User
  const sourceColor = SOURCE_COLORS[lead.source] ?? 'text-charcoal-400'

  const intentLabel = lead.intent_score != null ? intentScoreLabel(lead.intent_score) : null

  async function handleStageChange(e: React.ChangeEvent<HTMLSelectElement>) {
    e.stopPropagation()
    const newStageId = e.target.value
    if (newStageId === lead.stage_id) return
    setMovingStage(true)
    try {
      await onStageChange(lead.id, newStageId)
    } finally {
      setMovingStage(false)
    }
  }

  return (
    <div
      className="bg-charcoal-800 border border-charcoal-700 hover:border-gold-500/40 rounded-xl p-4 cursor-pointer transition-all group"
      onClick={() => router.push(`/leads/${lead.id}`)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn('flex-shrink-0', sourceColor)}>
            <SourceIcon className="w-3.5 h-3.5" />
          </div>
          <p className="text-white font-medium text-sm truncate">{lead.full_name}</p>
        </div>
        {intentLabel && (
          <span className={cn('text-xs flex-shrink-0 font-medium', intentLabel.color)}>
            {Math.round((lead.intent_score ?? 0) * 100)}%
          </span>
        )}
      </div>

      {/* Phone */}
      <p className="text-charcoal-400 text-xs mb-3">{lead.phone}</p>

      {/* Budget + Occasion */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {lead.budget_amount != null && lead.budget_amount > 0 && (
          <span className="text-xs bg-gold-500/10 text-gold-400 px-2 py-0.5 rounded-full">
            {formatCurrency(lead.budget_amount, lead.budget_currency ?? currency)}
          </span>
        )}
        {lead.occasion && (
          <span className="text-xs bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full">
            {lead.occasion}
          </span>
        )}
      </div>

      {/* AI Tags */}
      {lead.tags && lead.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {lead.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-xs bg-charcoal-700 text-charcoal-300 px-2 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
          {lead.tags.length > 3 && (
            <span className="text-xs text-charcoal-500">+{lead.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Stage move (stop propagation so click doesn't navigate) */}
      <div
        onClick={e => e.stopPropagation()}
        className="relative"
      >
        <select
          value={lead.stage_id}
          onChange={handleStageChange}
          disabled={movingStage}
          className="w-full text-xs bg-charcoal-900 border border-charcoal-700 rounded-lg px-2 py-1.5 text-charcoal-300 appearance-none cursor-pointer focus:border-gold-500 outline-none pr-6 disabled:opacity-50"
        >
          {stages.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <ChevronDown className="w-3 h-3 text-charcoal-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </div>
  )
}
