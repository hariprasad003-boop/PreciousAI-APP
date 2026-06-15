'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import LeadCard from './lead-card'
import AddLeadModal from './add-lead-modal'

interface LeadStage {
  id: string
  name: string
  color: string
  order_index: number
}

interface Lead {
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

interface KanbanBoardProps {
  initialLeads: Lead[]
  stages: LeadStage[]
  currency: string
  countryCode: string
  aiTagging: boolean
}

export default function KanbanBoard({ initialLeads, stages, currency, countryCode, aiTagging }: KanbanBoardProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)

  const sortedStages = [...stages].sort((a, b) => a.order_index - b.order_index)

  const handleStageChange = useCallback(async (leadId: string, stageId: string) => {
    // Optimistic update
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage_id: stageId } : l))

    const res = await fetch(`/api/leads/${leadId}/stage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage_id: stageId }),
    })

    if (!res.ok) {
      // Rollback
      setLeads(initialLeads)
      toast.error('Failed to move lead')
    }
  }, [initialLeads])

  const handleLeadCreated = useCallback((newLead: unknown) => {
    setLeads(prev => [newLead as Lead, ...prev])
  }, [])

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <p className="text-charcoal-400 text-sm">{leads.length} lead{leads.length !== 1 ? 's' : ''}</p>
        </div>
        <AddLeadModal
          stages={sortedStages}
          currency={currency}
          countryCode={countryCode}
          aiTagging={aiTagging}
          onCreated={handleLeadCreated}
        />
      </div>

      {/* Kanban columns */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {sortedStages.map(stage => {
          const stageLeads = leads.filter(l => l.stage_id === stage.id)
          return (
            <div key={stage.id} className="flex-shrink-0 w-72">
              {/* Column header */}
              <div className="flex items-center gap-2 mb-3 px-1">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: stage.color }}
                />
                <span className="text-white font-medium text-sm">{stage.name}</span>
                <span className="ml-auto text-charcoal-500 text-xs bg-charcoal-800 rounded-full px-2 py-0.5">
                  {stageLeads.length}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-3 min-h-[120px]">
                {stageLeads.length === 0 ? (
                  <div className="border-2 border-dashed border-charcoal-800 rounded-xl h-24 flex items-center justify-center">
                    <p className="text-charcoal-600 text-xs">No leads</p>
                  </div>
                ) : (
                  stageLeads.map(lead => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      stages={sortedStages}
                      currency={currency}
                      onStageChange={handleStageChange}
                    />
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
