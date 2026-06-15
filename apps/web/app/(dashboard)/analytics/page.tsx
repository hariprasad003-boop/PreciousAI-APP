import { createAdminClient as createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import { formatCurrency } from '@/lib/utils'
import { TrendingUp, Users, DollarSign, Target, BarChart3 } from 'lucide-react'

export default async function AnalyticsPage() {
  const [supabase, tenant] = await Promise.all([createClient(), getCurrentTenant()])
  if (!tenant) return null

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [
    { count: totalLeads },
    { count: leadsThisMonth },
    { count: wonLeads },
    { data: customers },
    { data: stages },
    { data: allLeads },
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id).gte('created_at', thirtyDaysAgo.toISOString()),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('tenant_id', tenant.id).not('converted_at', 'is', null),
    supabase.from('customers').select('lifetime_value, is_vip, created_at').eq('tenant_id', tenant.id),
    supabase.from('lead_stages').select('id, name, color').eq('tenant_id', tenant.id),
    supabase.from('leads').select('source, stage_id').eq('tenant_id', tenant.id),
  ])

  const totalRevenue = customers?.reduce((sum, c) => sum + (c.lifetime_value ?? 0), 0) ?? 0
  const vipCount = customers?.filter(c => c.is_vip).length ?? 0
  const conversionRate = totalLeads ? Math.round(((wonLeads ?? 0) / totalLeads) * 100) : 0

  // Count leads per source
  const sourceMap: Record<string, number> = {}
  for (const lead of (allLeads ?? [])) {
    sourceMap[lead.source] = (sourceMap[lead.source] ?? 0) + 1
  }

  // Customers added per week (last 8 weeks)
  const weeklyCustomers: { week: string; count: number }[] = []
  for (let i = 7; i >= 0; i--) {
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - i * 7 - 7)
    const weekEnd = new Date()
    weekEnd.setDate(weekEnd.getDate() - i * 7)
    const label = weekStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    const count = customers?.filter(c => {
      const d = new Date(c.created_at)
      return d >= weekStart && d < weekEnd
    }).length ?? 0
    weeklyCustomers.push({ week: label, count })
  }

  const maxWeeklyCount = Math.max(...weeklyCustomers.map(w => w.count), 1)

  const summaryStats = [
    { label: 'Total leads', value: totalLeads ?? 0, icon: Target, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Leads this month', value: leadsThisMonth ?? 0, icon: TrendingUp, color: 'text-gold-400', bg: 'bg-gold-400/10' },
    { label: 'Conversion rate', value: `${conversionRate}%`, icon: BarChart3, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Total revenue', value: formatCurrency(totalRevenue, tenant.currency), icon: DollarSign, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { label: 'Total customers', value: customers?.length ?? 0, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'VIP customers', value: vipCount, icon: Users, color: 'text-gold-400', bg: 'bg-gold-400/10' },
  ]

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Analytics</h1>
        <p className="text-charcoal-400 text-sm mt-1">Store performance overview</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {summaryStats.map(stat => (
          <div key={stat.label} className="dark-glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-charcoal-400 text-xs">{stat.label}</p>
              <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </div>
            <p className="font-display text-2xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Lead sources */}
        <div className="dark-glass rounded-2xl p-5">
          <h2 className="font-display text-base font-semibold text-white mb-4">Leads by source</h2>
          {Object.keys(sourceMap).length === 0 ? (
            <p className="text-charcoal-500 text-sm">No data yet</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(sourceMap)
                .sort(([, a], [, b]) => b - a)
                .map(([source, count]) => {
                  const pct = totalLeads ? Math.round((count / totalLeads) * 100) : 0
                  return (
                    <div key={source}>
                      <div className="flex justify-between mb-1">
                        <span className="text-charcoal-300 text-xs capitalize">{source.replace('_', ' ')}</span>
                        <span className="text-charcoal-400 text-xs">{count} ({pct}%)</span>
                      </div>
                      <div className="bg-charcoal-800 rounded-full h-2">
                        <div className="h-2 rounded-full bg-gold-500 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>

        {/* Customer growth */}
        <div className="dark-glass rounded-2xl p-5">
          <h2 className="font-display text-base font-semibold text-white mb-4">Customer growth (8 weeks)</h2>
          <div className="flex items-end gap-1.5 h-32">
            {weeklyCustomers.map((w, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-gold-500/60 hover:bg-gold-500 transition-colors"
                  style={{ height: `${(w.count / maxWeeklyCount) * 100}%`, minHeight: w.count > 0 ? '4px' : '0' }}
                  title={`${w.count} customers`}
                />
                <span className="text-charcoal-600 text-xs" style={{ fontSize: '9px' }}>{w.week}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pipeline by stage */}
      {stages && stages.length > 0 && (
        <div className="dark-glass rounded-2xl p-5">
          <h2 className="font-display text-base font-semibold text-white mb-4">Pipeline by stage</h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {stages.map(stage => {
              const count = allLeads?.filter(l => l.stage_id === stage.id).length ?? 0
              return (
                <div key={stage.id} className="bg-charcoal-800 rounded-xl p-3 text-center">
                  <div className="w-3 h-3 rounded-full mx-auto mb-2" style={{ backgroundColor: stage.color }} />
                  <p className="text-white font-display text-xl font-bold">{count}</p>
                  <p className="text-charcoal-400 text-xs mt-0.5">{stage.name}</p>
                </div>
              )
            })}
          </div>
          <p className="text-charcoal-600 text-xs mt-3 text-center">Live pipeline counts appear once leads are added</p>
        </div>
      )}
    </div>
  )
}
