'use client'

import { useEffect, useState, useCallback } from 'react'
import { TrendingUp, Users, DollarSign, Target, BarChart3, ArrowUpRight } from 'lucide-react'

type Period = 'week' | 'month' | 'quarter' | 'year'

interface AnalyticsData {
  revenue: {
    month: string
    label: string
    revenue: number
    orders: number
    avg_order_value: number
    by_category: Record<string, number>
  }[]
  category_revenue: Record<string, number>
  leads_by_stage: {
    stage_id: string
    name: string
    count: number
    conversion_rate: number
  }[]
  customer_segments: {
    vip: { count: number; avg_lifetime_value: number }
    regular: { count: number; avg_lifetime_value: number }
    at_risk: { count: number }
    new: { count: number }
  }
  top_customers: {
    id: string
    name: string
    lifetime_value: number
    is_vip: boolean
    sparkline: { amount: number; date: string }[]
  }[]
  lead_sources: {
    source: string
    total: number
    converted: number
    conversion_rate: number
  }[]
  total_leads: number
  period: Period
}

function formatCurrencyShort(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`
  return String(amount)
}

function BarChart({ data, valueKey, labelKey, color = '#C9A84C' }: {
  data: Record<string, any>[]
  valueKey: string
  labelKey: string
  color?: string
}) {
  const maxVal = Math.max(...data.map(d => d[valueKey] ?? 0), 1)
  return (
    <div className="flex items-end gap-1.5 h-32">
      {data.map((d, i) => {
        const pct = Math.max((d[valueKey] / maxVal) * 100, d[valueKey] > 0 ? 4 : 0)
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div
              className="w-full rounded-t transition-all"
              style={{
                height: `${pct}%`,
                backgroundColor: color,
                opacity: 0.7,
              }}
            />
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-charcoal-700 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
              {formatCurrencyShort(d[valueKey])}
            </div>
            <span className="text-charcoal-600 text-center leading-tight" style={{ fontSize: '9px' }}>{d[labelKey]}</span>
          </div>
        )
      })}
    </div>
  )
}

function Sparkline({ data }: { data: { amount: number; date: string }[] }) {
  if (data.length === 0) return <span className="text-charcoal-600 text-xs">—</span>
  const max = Math.max(...data.map(d => d.amount), 1)
  const w = 40
  const h = 16
  const pts = data.map((d, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * w
    const y = h - (d.amount / max) * h
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} className="inline-block">
      <polyline points={pts} fill="none" stroke="#C9A84C" strokeWidth="1.5" />
    </svg>
  )
}

function FunnelChart({ stages }: { stages: { name: string; count: number; conversion_rate: number }[] }) {
  const maxCount = Math.max(...stages.map(s => s.count), 1)
  return (
    <div className="space-y-2">
      {stages.map((stage, i) => {
        const pct = Math.max((stage.count / maxCount) * 100, 0)
        return (
          <div key={i}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-charcoal-300 text-xs">{stage.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-charcoal-500 text-xs">{stage.count} leads</span>
                {i > 0 && (
                  <span className="text-xs font-medium text-gold-400">{stage.conversion_rate}% conv.</span>
                )}
              </div>
            </div>
            <div className="bg-charcoal-800 rounded-full h-2">
              <div
                className="h-2 rounded-full transition-all"
                style={{
                  width: `${pct}%`,
                  backgroundColor: i === 0 ? '#C9A84C' : `rgba(201,168,76,${1 - i * 0.15})`,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

const PERIOD_TABS: { label: string; value: Period }[] = [
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'Last 3 Months', value: 'quarter' },
  { label: 'This Year', value: 'year' },
]

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>('month')
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async (p: Period) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/analytics?period=${p}`)
      if (!res.ok) throw new Error('Failed to load analytics')
      const json = await res.json()
      setData(json)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(period)
  }, [period, fetchData])

  const totalRevenue = data?.revenue.reduce((s, r) => s + r.revenue, 0) ?? 0
  const totalOrders = data?.revenue.reduce((s, r) => s + r.orders, 0) ?? 0
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Analytics</h1>
          <p className="text-charcoal-400 text-sm mt-1">Store performance overview</p>
        </div>
        {/* Period tabs */}
        <div className="flex bg-charcoal-800 rounded-xl p-1 gap-1">
          {PERIOD_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setPeriod(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                period === tab.value
                  ? 'bg-gold-500 text-charcoal-900'
                  : 'text-charcoal-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="dark-glass rounded-xl p-4 text-red-400 text-sm">{error}</div>
      )}

      {data && !loading && (
        <>
          {/* Summary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Revenue', value: formatCurrencyShort(totalRevenue), icon: DollarSign, color: 'text-gold-400', bg: 'bg-gold-400/10' },
              { label: 'Total Orders', value: totalOrders, icon: BarChart3, color: 'text-purple-400', bg: 'bg-purple-400/10' },
              { label: 'Avg. Order Value', value: formatCurrencyShort(avgOrderValue), icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
              { label: 'Total Leads', value: data.total_leads, icon: Target, color: 'text-blue-400', bg: 'bg-blue-400/10' },
            ].map(stat => (
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

          {/* Revenue Chart + Category Revenue */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Monthly Revenue Bar Chart */}
            <div className="lg:col-span-2 dark-glass rounded-2xl p-5">
              <h2 className="font-display text-base font-semibold text-white mb-1">Monthly Revenue</h2>
              <p className="text-charcoal-500 text-xs mb-4">Last 6 months</p>
              {data.revenue.every(r => r.revenue === 0) ? (
                <p className="text-charcoal-500 text-sm py-10 text-center">No purchase data yet</p>
              ) : (
                <>
                  <BarChart data={data.revenue} valueKey="revenue" labelKey="label" />
                  {/* Avg order value overlay */}
                  <div className="mt-4 flex gap-6">
                    {data.revenue.map((r, i) => (
                      r.orders > 0 ? (
                        <div key={i} className="flex-1 text-center">
                          <p className="text-gold-400 text-xs font-medium">{formatCurrencyShort(r.avg_order_value)}</p>
                          <p className="text-charcoal-600 text-xs" style={{ fontSize: '9px' }}>avg</p>
                        </div>
                      ) : <div key={i} className="flex-1" />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Revenue by Category */}
            <div className="dark-glass rounded-2xl p-5">
              <h2 className="font-display text-base font-semibold text-white mb-4">By Category</h2>
              {Object.keys(data.category_revenue).length === 0 ? (
                <p className="text-charcoal-500 text-sm py-4">No data yet</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(data.category_revenue)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, amt]) => {
                      const total = Object.values(data.category_revenue).reduce((s, v) => s + v, 0)
                      const pct = total > 0 ? Math.round((amt / total) * 100) : 0
                      return (
                        <div key={cat}>
                          <div className="flex justify-between mb-1">
                            <span className="text-charcoal-300 text-xs capitalize">{cat}</span>
                            <span className="text-charcoal-400 text-xs">{pct}%</span>
                          </div>
                          <div className="bg-charcoal-800 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full bg-gold-500" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          </div>

          {/* Lead Funnel + Customer Segments */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Lead Funnel */}
            <div className="dark-glass rounded-2xl p-5">
              <h2 className="font-display text-base font-semibold text-white mb-4">Lead Funnel</h2>
              {data.leads_by_stage.length === 0 ? (
                <p className="text-charcoal-500 text-sm">No stages configured yet</p>
              ) : (
                <FunnelChart stages={data.leads_by_stage} />
              )}
            </div>

            {/* Customer Segments */}
            <div className="dark-glass rounded-2xl p-5">
              <h2 className="font-display text-base font-semibold text-white mb-4">Customer Segments</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: 'VIP',
                    count: data.customer_segments.vip.count,
                    sub: `Avg ${formatCurrencyShort(data.customer_segments.vip.avg_lifetime_value)} LTV`,
                    color: 'bg-gold-500/10 border-gold-500/30',
                    textColor: 'text-gold-400',
                  },
                  {
                    label: 'Regular',
                    count: data.customer_segments.regular.count,
                    sub: `Avg ${formatCurrencyShort(data.customer_segments.regular.avg_lifetime_value)} LTV`,
                    color: 'bg-blue-500/10 border-blue-500/30',
                    textColor: 'text-blue-400',
                  },
                  {
                    label: 'At Risk',
                    count: data.customer_segments.at_risk.count,
                    sub: 'No purchase 6+ months',
                    color: 'bg-red-500/10 border-red-500/30',
                    textColor: 'text-red-400',
                  },
                  {
                    label: 'New',
                    count: data.customer_segments.new.count,
                    sub: 'Joined < 3 months ago',
                    color: 'bg-emerald-500/10 border-emerald-500/30',
                    textColor: 'text-emerald-400',
                  },
                ].map(seg => (
                  <div key={seg.label} className={`rounded-xl p-3 border ${seg.color}`}>
                    <p className={`text-xs font-medium mb-1 ${seg.textColor}`}>{seg.label}</p>
                    <p className="font-display text-2xl font-bold text-white">{seg.count}</p>
                    <p className="text-charcoal-500 text-xs mt-0.5">{seg.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Customers + Lead Sources */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Top 5 Customers by Lifetime Value */}
            <div className="dark-glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-base font-semibold text-white">Top Customers</h2>
                <a href="/customers" className="text-gold-400 text-xs hover:text-gold-300 flex items-center gap-1">
                  View all <ArrowUpRight className="w-3 h-3" />
                </a>
              </div>
              {data.top_customers.length === 0 ? (
                <p className="text-charcoal-500 text-sm py-4">No customers yet</p>
              ) : (
                <div className="space-y-3">
                  {data.top_customers.map((c, i) => (
                    <div key={c.id} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg gold-gradient flex items-center justify-center flex-shrink-0">
                        <span className="text-charcoal-900 font-bold text-xs">{i + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <a href={`/customers/${c.id}`} className="text-white text-sm font-medium hover:text-gold-400 transition-colors truncate">
                            {c.name}
                          </a>
                          {c.is_vip && <span className="text-xs text-gold-400 flex-shrink-0">VIP</span>}
                        </div>
                        <p className="text-charcoal-400 text-xs">{formatCurrencyShort(c.lifetime_value)} LTV</p>
                      </div>
                      <Sparkline data={c.sparkline} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Lead Sources by Conversion Rate */}
            <div className="dark-glass rounded-2xl p-5">
              <h2 className="font-display text-base font-semibold text-white mb-4">Top Lead Sources</h2>
              {data.lead_sources.length === 0 ? (
                <p className="text-charcoal-500 text-sm py-4">No lead data for this period</p>
              ) : (
                <div className="space-y-4">
                  {data.lead_sources.map((src, i) => (
                    <div key={src.source}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-charcoal-700 flex items-center justify-center text-xs text-charcoal-400">{i + 1}</span>
                          <span className="text-charcoal-200 text-sm capitalize">{src.source.replace('_', ' ')}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-emerald-400 text-sm font-medium">{src.conversion_rate}%</span>
                          <span className="text-charcoal-500 text-xs ml-1">conv.</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-charcoal-800 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-emerald-500"
                            style={{ width: `${src.conversion_rate}%` }}
                          />
                        </div>
                        <span className="text-charcoal-500 text-xs w-12 text-right">{src.total} leads</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
