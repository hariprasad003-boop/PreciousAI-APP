import { createAdminClient as createClient } from '@/lib/supabase/server'
import { getCurrentTenant, hasFeature } from '@/lib/tenant'
import KanbanBoard from '@/components/leads/kanban-board'

export default async function LeadsPage() {
  const [supabase, tenant] = await Promise.all([createClient(), getCurrentTenant()])
  if (!tenant) return null

  const [{ data: leads }, { data: stages }] = await Promise.all([
    supabase
      .from('leads')
      .select(`
        id, full_name, phone, source,
        intent_score, budget_amount, budget_currency,
        tags, occasion, stage_id, created_at,
        assigned_user:tenant_users(id, full_name)
      `)
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false }),

    supabase
      .from('lead_stages')
      .select('id, name, color, order_index')
      .eq('tenant_id', tenant.id)
      .order('order_index'),
  ])

  const aiTagging = hasFeature(tenant.plan, 'aiTagging')

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-white">Lead Pipeline</h1>
        <p className="text-charcoal-400 text-sm mt-1">
          Track every prospect from first contact to sale.
          {aiTagging && <span className="text-gold-400 ml-1">AI tagging active.</span>}
        </p>
      </div>

      <KanbanBoard
        initialLeads={(leads ?? []) as any}
        stages={stages ?? []}
        currency={tenant.currency}
        countryCode={tenant.country_code}
        aiTagging={aiTagging}
      />
    </div>
  )
}
