import { redirect } from 'next/navigation'
import { createAdminClient as createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import { formatCurrency } from '@/lib/utils'
import { Users, TrendingUp, Bell, MessageCircle, ArrowUpRight, Clock } from 'lucide-react'

export default async function DashboardPage() {
  const [supabase, tenant] = await Promise.all([createClient(), getCurrentTenant()])
  if (!tenant) return null

  if (!tenant.onboarding_completed) redirect('/onboarding')

  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - 7)

  const [leadsThisWeek, followUpsDue, topCustomers, recentMessages] = await Promise.all([
    supabase
      .from('leads')
      .select('id, created_at, stage_id', { count: 'exact' })
      .eq('tenant_id', tenant.id)
      .gte('created_at', weekStart.toISOString()),

    supabase
      .from('follow_ups')
      .select('id, type, message_content, scheduled_at, leads(full_name), customers(full_name)', { count: 'exact' })
      .eq('tenant_id', tenant.id)
      .eq('status', 'pending')
      .lte('scheduled_at', new Date(now.getTime() + 86400000).toISOString())
      .order('scheduled_at')
      .limit(5),

    supabase
      .from('customers')
      .select('id, full_name, lifetime_value, is_vip, country_code')
      .eq('tenant_id', tenant.id)
      .order('lifetime_value', { ascending: false })
      .limit(5),

    supabase
      .from('whatsapp_messages')
      .select('id, content, from_number, created_at, direction', { count: 'exact' })
      .eq('tenant_id', tenant.id)
      .eq('direction', 'inbound')
      .gte('created_at', new Date(now.setHours(0, 0, 0, 0)).toISOString())
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const stats = [
    {
      label: 'Leads this week',
      value: leadsThisWeek.count ?? 0,
      trend: '+12%',
      trendUp: true,
      icon: TrendingUp,
      color: 'text-gold-500',
      bg: 'bg-gold-500/10',
    },
    {
      label: 'Follow-ups due',
      value: followUpsDue.count ?? 0,
      trend: 'Today',
      trendUp: null,
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-400/10',
    },
    {
      label: 'WhatsApp today',
      value: recentMessages.count ?? 0,
      trend: 'Inbound',
      trendUp: null,
      icon: MessageCircle,
      color: 'text-emerald-400',
      bg: 'bg-emerald-400/10',
    },
    {
      label: 'Total customers',
      value: topCustomers.data?.length ?? 0,
      trend: 'Active',
      trendUp: null,
      icon: Users,
      color: 'text-blue-400',
      bg: 'bg-blue-400/10',
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">
          Good {getTimeOfDay()}, {(tenant.branding as any)?.store_name ?? tenant.name}
        </h1>
        <p className="text-charcoal-400 text-sm mt-1">Here&apos;s what&apos;s happening in your store today.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="dark-glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-charcoal-400 text-xs">{stat.label}</p>
              <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </div>
            <p className="font-display text-3xl font-bold text-white">{stat.value}</p>
            <p className={`text-xs mt-1 ${stat.trendUp ? 'text-emerald-400' : 'text-charcoal-500'}`}>
              {stat.trendUp && <ArrowUpRight className="w-3 h-3 inline" />}
              {stat.trend}
            </p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top customers */}
        <div className="dark-glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-semibold text-white">Top Customers</h2>
            <a href="/customers" className="text-gold-400 text-xs hover:text-gold-300 flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
          {topCustomers.data && topCustomers.data.length > 0 ? (
            <div className="space-y-3">
              {topCustomers.data.map((customer, i) => (
                <div key={customer.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full gold-gradient flex items-center justify-center flex-shrink-0">
                    <span className="text-charcoal-900 font-bold text-xs">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{customer.full_name}</p>
                    {customer.is_vip && (
                      <span className="text-xs text-gold-400">VIP</span>
                    )}
                  </div>
                  <p className="text-charcoal-300 text-sm font-medium">
                    {formatCurrency(customer.lifetime_value, tenant.currency)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No customers yet. Add your first customer or import from Excel." />
          )}
        </div>

        {/* Follow-ups due */}
        <div className="dark-glass rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base font-semibold text-white">Follow-ups Due</h2>
            <a href="/follow-ups" className="text-gold-400 text-xs hover:text-gold-300 flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
          {followUpsDue.data && followUpsDue.data.length > 0 ? (
            <div className="space-y-3">
              {followUpsDue.data.map((fu: any) => (
                <div key={fu.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {fu.leads?.full_name ?? fu.customers?.full_name ?? 'Unknown'}
                    </p>
                    <p className="text-charcoal-400 text-xs">{fu.type} · {new Date(fu.scheduled_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No follow-ups due. You're all caught up!" />
          )}
        </div>
      </div>

      {/* Recent WhatsApp */}
      <div className="dark-glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-base font-semibold text-white">Recent WhatsApp Messages</h2>
          <a href="/inbox" className="text-gold-400 text-xs hover:text-gold-300 flex items-center gap-1">
            Open inbox <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>
        {recentMessages.data && recentMessages.data.length > 0 ? (
          <div className="space-y-3">
            {recentMessages.data.map((msg: any) => (
              <div key={msg.id} className="flex items-start gap-3 py-2 border-b border-charcoal-800 last:border-0">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-charcoal-300 text-xs">{msg.from_number}</p>
                  <p className="text-white text-sm truncate">{msg.content}</p>
                </div>
                <p className="text-charcoal-500 text-xs flex-shrink-0">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="No WhatsApp messages yet. Connect your WhatsApp number in Settings." />
        )}
      </div>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="text-charcoal-500 text-sm text-center py-6">{message}</p>
  )
}

function getTimeOfDay(): string {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
