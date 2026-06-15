import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient as createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import { formatCurrency, formatDate, getInitials, intentScoreLabel } from '@/lib/utils'
import { ArrowLeft, Phone, MessageCircle, Instagram, User, Calendar, Tag } from 'lucide-react'
import LeadActions from '@/components/leads/lead-actions'
import AddNoteModal from '@/components/leads/add-note-modal'
import AddFollowUpModal from '@/components/leads/add-followup-modal'

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [supabase, tenant] = await Promise.all([createClient(), getCurrentTenant()])
  if (!tenant) return null

  const { data: lead } = await supabase
    .from('leads')
    .select(`
      *,
      stage:lead_stages(id, name, color, order_index),
      assigned_user:tenant_users(id, full_name),
      interactions(*, staff:tenant_users(full_name)),
      follow_ups(id, type, scheduled_at, status, message_content)
    `)
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .single()

  if (!lead) notFound()

  const { data: stages } = await supabase
    .from('lead_stages')
    .select('id, name, color, order_index')
    .eq('tenant_id', tenant.id)
    .order('order_index')

  const intentLabel = lead.intent_score != null ? intentScoreLabel(lead.intent_score) : null
  const stage = lead.stage as any
  const branding = tenant.branding as any

  const SOURCE_ICON: Record<string, React.ElementType> = {
    whatsapp: MessageCircle,
    instagram: Instagram,
    walk_in: User,
    phone: Phone,
    manual: User,
  }
  const SourceIcon = SOURCE_ICON[lead.source] ?? User

  return (
    <div className="animate-fade-in max-w-4xl">
      {/* Back */}
      <Link href="/leads" className="inline-flex items-center gap-1.5 text-charcoal-400 hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to pipeline
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main card */}
        <div className="lg:col-span-2 space-y-5">
          {/* Header */}
          <div className="dark-glass rounded-2xl p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold font-display text-lg flex-shrink-0"
                  style={{ backgroundColor: branding?.primary_color ?? '#C9A84C', color: '#1A1A2E' }}
                >
                  {getInitials(lead.full_name)}
                </div>
                <div>
                  <h1 className="font-display text-xl font-bold text-white">{lead.full_name}</h1>
                  <div className="flex items-center gap-2 mt-0.5">
                    <SourceIcon className="w-3.5 h-3.5 text-charcoal-400" />
                    <span className="text-charcoal-400 text-sm capitalize">{lead.source.replace('_', ' ')}</span>
                    <span className="text-charcoal-600">·</span>
                    <span className="text-charcoal-400 text-sm">{formatDate(lead.created_at)}</span>
                  </div>
                </div>
              </div>

              {stage && (
                <div
                  className="px-3 py-1 rounded-full text-xs font-medium text-white flex-shrink-0"
                  style={{ backgroundColor: stage.color + '33', border: `1px solid ${stage.color}66`, color: stage.color }}
                >
                  {stage.name}
                </div>
              )}
            </div>

            {/* Contact info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-charcoal-800 rounded-lg p-3">
                <p className="text-charcoal-500 text-xs mb-1">Phone</p>
                <p className="text-white text-sm font-medium">{lead.country_code} {lead.phone}</p>
              </div>
              {lead.email && (
                <div className="bg-charcoal-800 rounded-lg p-3">
                  <p className="text-charcoal-500 text-xs mb-1">Email</p>
                  <p className="text-white text-sm font-medium truncate">{lead.email}</p>
                </div>
              )}
              {lead.budget_amount && (
                <div className="bg-charcoal-800 rounded-lg p-3">
                  <p className="text-charcoal-500 text-xs mb-1">Budget</p>
                  <p className="text-white text-sm font-medium">
                    {formatCurrency(lead.budget_amount, lead.budget_currency ?? tenant.currency)}
                  </p>
                </div>
              )}
              {lead.occasion && (
                <div className="bg-charcoal-800 rounded-lg p-3">
                  <p className="text-charcoal-500 text-xs mb-1">Occasion</p>
                  <p className="text-white text-sm font-medium">{lead.occasion}</p>
                </div>
              )}
            </div>

            {/* Intent score */}
            {intentLabel && (
              <div className="mt-4 flex items-center gap-3">
                <div className="flex-1 bg-charcoal-800 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-gold-500 transition-all"
                    style={{ width: `${Math.round((lead.intent_score ?? 0) * 100)}%` }}
                  />
                </div>
                <span className={`text-xs font-medium ${intentLabel.color}`}>
                  {intentLabel.label} ({Math.round((lead.intent_score ?? 0) * 100)}%)
                </span>
              </div>
            )}

            {/* Tags */}
            {lead.tags && lead.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {lead.tags.map((tag: string) => (
                  <span key={tag} className="flex items-center gap-1 text-xs bg-charcoal-800 text-charcoal-300 px-2.5 py-1 rounded-full">
                    <Tag className="w-3 h-3" /> {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Category interest */}
            {lead.category_interest && lead.category_interest.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {(lead.category_interest as string[]).map(cat => (
                  <span key={cat} className="text-xs bg-gold-500/10 text-gold-400 px-2.5 py-1 rounded-full">{cat}</span>
                ))}
              </div>
            )}
          </div>

          {/* Raw message */}
          {lead.raw_message && (
            <div className="dark-glass rounded-2xl p-5">
              <p className="text-charcoal-400 text-xs mb-2 uppercase tracking-wider">Original message</p>
              <p className="text-charcoal-200 text-sm leading-relaxed italic">"{lead.raw_message}"</p>
            </div>
          )}

          {/* Interaction timeline */}
          <div className="dark-glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-base font-semibold text-white">Activity</h2>
              <AddNoteModal leadId={id} />
            </div>
            {lead.interactions && (lead.interactions as any[]).length > 0 ? (
              <div className="space-y-4">
                {(lead.interactions as any[]).map((interaction: any) => (
                  <div key={interaction.id} className="flex gap-3">
                    <div className="w-2 h-2 rounded-full bg-gold-500 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-charcoal-300 text-sm">{interaction.content ?? '—'}</p>
                      <p className="text-charcoal-500 text-xs mt-0.5">
                        {interaction.type} · {formatDate(interaction.created_at)}
                        {interaction.staff?.full_name && ` · ${interaction.staff.full_name}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-charcoal-500 text-sm">No activity yet.</p>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          <LeadActions
            lead={lead as any}
            stages={stages ?? []}
            tenantId={tenant.id}
          />

          {/* Follow-ups */}
          <div className="dark-glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-sm font-semibold text-white">Follow-ups</h2>
              <AddFollowUpModal leadId={id} />
            </div>
            {lead.follow_ups && (lead.follow_ups as any[]).length > 0 ? (
              <div className="space-y-3">
                {(lead.follow_ups as any[]).map((fu: any) => (
                  <div key={fu.id} className="flex items-start gap-2">
                    <Calendar className="w-4 h-4 text-charcoal-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-charcoal-300 text-xs font-medium capitalize">{fu.type}</p>
                      <p className="text-charcoal-500 text-xs">{formatDate(fu.scheduled_at)}</p>
                    </div>
                    <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${fu.status === 'done' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                      {fu.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-charcoal-500 text-sm">No follow-ups yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
