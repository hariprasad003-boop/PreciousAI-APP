import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient as createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

type Period = 'week' | 'month' | 'quarter' | 'year'

function getPeriodStart(period: Period): Date {
  const now = new Date()
  switch (period) {
    case 'week':
      now.setDate(now.getDate() - 7)
      return now
    case 'month':
      now.setMonth(now.getMonth() - 1)
      return now
    case 'quarter':
      now.setMonth(now.getMonth() - 3)
      return now
    case 'year':
      now.setFullYear(now.getFullYear() - 1)
      return now
  }
}

export async function GET(req: NextRequest) {
  const [supabase, tenant] = await Promise.all([createClient(), getCurrentTenant()])
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const period = (searchParams.get('period') ?? 'month') as Period
  const periodStart = getPeriodStart(period)
  const periodStartISO = periodStart.toISOString()

  // Six months back for revenue chart
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const sixMonthsAgoISO = sixMonthsAgo.toISOString()

  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

  const sixMonthsAgoDate = new Date()
  sixMonthsAgoDate.setMonth(sixMonthsAgoDate.getMonth() - 6)

  const [
    { data: purchases },
    { data: leads },
    { data: stages },
    { data: customers },
    { data: aiScores },
  ] = await Promise.all([
    supabase
      .from('purchase_history')
      .select('amount, purchase_date, category, customer_id')
      .eq('tenant_id', tenant.id)
      .gte('purchase_date', sixMonthsAgoISO),

    supabase
      .from('leads')
      .select('id, stage_id, source, created_at, converted_at, last_contacted_at')
      .eq('tenant_id', tenant.id)
      .gte('created_at', periodStartISO),

    supabase
      .from('lead_stages')
      .select('id, name, order_index')
      .eq('tenant_id', tenant.id)
      .order('order_index'),

    supabase
      .from('customers')
      .select('id, lifetime_value, is_vip, created_at')
      .eq('tenant_id', tenant.id),

    supabase
      .from('ai_scores')
      .select('customer_id, vip_score, lifetime_value_predicted')
      .eq('tenant_id', tenant.id),
  ])

  // ── Revenue: last 6 months ────────────────────────────────────────────────
  const revenueByMonth: Record<string, { revenue: number; orders: number; byCategory: Record<string, number> }> = {}

  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    revenueByMonth[key] = { revenue: 0, orders: 0, byCategory: {} }
  }

  for (const p of (purchases ?? [])) {
    const d = new Date(p.purchase_date)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (revenueByMonth[key]) {
      revenueByMonth[key].revenue += p.amount ?? 0
      revenueByMonth[key].orders += 1
      const cat = p.category ?? 'other'
      revenueByMonth[key].byCategory[cat] = (revenueByMonth[key].byCategory[cat] ?? 0) + (p.amount ?? 0)
    }
  }

  const revenue = Object.entries(revenueByMonth).map(([month, data]) => ({
    month,
    label: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    revenue: Math.round(data.revenue),
    orders: data.orders,
    avg_order_value: data.orders > 0 ? Math.round(data.revenue / data.orders) : 0,
    by_category: data.byCategory,
  }))

  // Revenue by category (aggregate)
  const categoryRevenue: Record<string, number> = {}
  for (const p of (purchases ?? [])) {
    const cat = p.category ?? 'other'
    categoryRevenue[cat] = (categoryRevenue[cat] ?? 0) + (p.amount ?? 0)
  }

  // ── Lead Funnel ───────────────────────────────────────────────────────────
  const stageMap: Record<string, { name: string; order: number; count: number }> = {}
  for (const s of (stages ?? [])) {
    stageMap[s.id] = { name: s.name, order: s.order_index, count: 0 }
  }
  for (const l of (leads ?? [])) {
    if (stageMap[l.stage_id]) stageMap[l.stage_id].count += 1
  }

  const totalLeads = (leads ?? []).length
  const leadsByStage = Object.entries(stageMap)
    .sort(([, a], [, b]) => a.order - b.order)
    .map(([id, s], idx, arr) => {
      const prevCount = idx === 0 ? totalLeads : arr[idx - 1][1].count
      const conversionRate = prevCount > 0 ? Math.round((s.count / prevCount) * 100) : 0
      return {
        stage_id: id,
        name: s.name,
        count: s.count,
        conversion_rate: conversionRate,
      }
    })

  // ── Customer Segments ─────────────────────────────────────────────────────
  const scoreMap: Record<string, number> = {}
  for (const score of (aiScores ?? [])) {
    scoreMap[score.customer_id] = score.vip_score ?? 0
  }

  const now = new Date()
  let vipCount = 0, vipTotal = 0
  let regularCount = 0, regularTotal = 0
  let atRiskCount = 0
  let newCount = 0

  for (const c of (customers ?? [])) {
    const score = scoreMap[c.id] ?? (c.is_vip ? 0.9 : 0.3)
    const createdAt = new Date(c.created_at)
    const monthsOld = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30)

    if (score > 0.8 || c.is_vip) {
      vipCount++
      vipTotal += c.lifetime_value ?? 0
    } else if (score >= 0.4) {
      regularCount++
      regularTotal += c.lifetime_value ?? 0
    }

    if (monthsOld < 3) newCount++
    // At-risk: not vip + no purchase in 6 months (approximated by created_at since we don't have last purchase per customer here)
    if (!c.is_vip && monthsOld > 6) atRiskCount++
  }

  const customerSegments = {
    vip: { count: vipCount, avg_lifetime_value: vipCount > 0 ? Math.round(vipTotal / vipCount) : 0 },
    regular: { count: regularCount, avg_lifetime_value: regularCount > 0 ? Math.round(regularTotal / regularCount) : 0 },
    at_risk: { count: atRiskCount },
    new: { count: newCount },
  }

  // ── Top Customers ─────────────────────────────────────────────────────────
  const sortedCustomers = [...(customers ?? [])]
    .sort((a, b) => (b.lifetime_value ?? 0) - (a.lifetime_value ?? 0))
    .slice(0, 5)

  // Get last 3 purchases per top customer
  const topCustomerIds = sortedCustomers.map(c => c.id)
  let topPurchases: any[] = []
  if (topCustomerIds.length > 0) {
    const { data: tp } = await supabase
      .from('purchase_history')
      .select('customer_id, amount, purchase_date')
      .in('customer_id', topCustomerIds)
      .order('purchase_date', { ascending: false })
    topPurchases = tp ?? []
  }

  // Get customer names
  let topCustomerNames: Record<string, string> = {}
  if (topCustomerIds.length > 0) {
    const { data: names } = await supabase
      .from('customers')
      .select('id, full_name')
      .in('id', topCustomerIds)
    for (const n of (names ?? [])) topCustomerNames[n.id] = n.full_name
  }

  const topCustomers = sortedCustomers.map(c => {
    const purchases = topPurchases.filter(p => p.customer_id === c.id).slice(0, 3)
    return {
      id: c.id,
      name: topCustomerNames[c.id] ?? 'Unknown',
      lifetime_value: c.lifetime_value ?? 0,
      is_vip: c.is_vip,
      sparkline: purchases.map(p => ({ amount: p.amount, date: p.purchase_date })),
    }
  })

  // ── Lead Sources ──────────────────────────────────────────────────────────
  const sourceStats: Record<string, { total: number; converted: number }> = {}
  for (const l of (leads ?? [])) {
    if (!sourceStats[l.source]) sourceStats[l.source] = { total: 0, converted: 0 }
    sourceStats[l.source].total += 1
    if (l.converted_at) sourceStats[l.source].converted += 1
  }

  const leadSources = Object.entries(sourceStats)
    .map(([source, data]) => ({
      source,
      total: data.total,
      converted: data.converted,
      conversion_rate: data.total > 0 ? Math.round((data.converted / data.total) * 100) : 0,
    }))
    .sort((a, b) => b.conversion_rate - a.conversion_rate)
    .slice(0, 3)

  return NextResponse.json({
    revenue,
    category_revenue: categoryRevenue,
    leads_by_stage: leadsByStage,
    customer_segments: customerSegments,
    top_customers: topCustomers,
    lead_sources: leadSources,
    period,
    total_leads: totalLeads,
  })
}
