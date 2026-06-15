import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentTenant, hasFeature } from '@/lib/tenant'
import Anthropic from '@anthropic-ai/sdk'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const ai = new Anthropic()

export async function POST(request: NextRequest) {
  const tenant = await getCurrentTenant()
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!hasFeature(tenant.plan, 'aiScoring')) {
    return NextResponse.json({ error: 'AI scoring requires Pro or Enterprise plan' }, { status: 403 })
  }

  const { customer_id } = await request.json()
  if (!customer_id) return NextResponse.json({ error: 'customer_id required' }, { status: 400 })

  const { data: customer } = await supabaseAdmin
    .from('customers')
    .select(`
      full_name, lifetime_value, is_vip,
      metal_pref, stone_pref, favourite_categories,
      dob, anniversary_date,
      purchase_history(amount, category, purchase_date, occasion),
      interactions(type, created_at)
    `)
    .eq('id', customer_id)
    .eq('tenant_id', tenant.id)
    .single()

  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  const purchases = (customer as any).purchase_history ?? []
  const totalSpend = purchases.reduce((s: number, p: any) => s + p.amount, 0)
  const purchaseCount = purchases.length
  const lastPurchase = purchases.sort((a: any, b: any) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime())[0]
  const daysSinceLastPurchase = lastPurchase
    ? Math.floor((Date.now() - new Date(lastPurchase.purchase_date).getTime()) / 86400000)
    : 999

  const prompt = `You are a jewelry retail CRM AI. Score this customer based on their data.

Customer: ${customer.full_name}
Total spend: ${tenant.currency} ${totalSpend}
Number of purchases: ${purchaseCount}
Days since last purchase: ${daysSinceLastPurchase}
Favourite categories: ${(customer.favourite_categories as string[])?.join(', ') || 'unknown'}
Metal preferences: ${(customer.metal_pref as string[])?.join(', ') || 'unknown'}
Interactions logged: ${((customer as any).interactions ?? []).length}

Return ONLY a JSON object:
{
  "vip_score": <0.0 to 1.0, likelihood of being VIP based on spend and engagement>,
  "churn_risk": <0.0 to 1.0, risk of not buying again>,
  "lifetime_value_predicted": <predicted total LTV in ${tenant.currency} over next 12 months>,
  "next_purchase_category": "<most likely next purchase category>",
  "suggestions": ["action1", "action2", "action3"]
}`

  let score: any = { vip_score: 0.5, churn_risk: 0.5, lifetime_value_predicted: totalSpend, suggestions: [] }

  try {
    const message = await ai.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) score = JSON.parse(jsonMatch[0])
  } catch (err) {
    console.error('[ai:score-customer]', err)
  }

  await supabaseAdmin.from('ai_scores').upsert({
    tenant_id: tenant.id,
    customer_id,
    vip_score: score.vip_score ?? 0.5,
    churn_risk: score.churn_risk ?? 0.5,
    lifetime_value_predicted: score.lifetime_value_predicted ?? totalSpend,
    next_purchase_category: score.next_purchase_category ?? null,
    suggestions: score.suggestions ?? [],
    scored_at: new Date().toISOString(),
  }, { onConflict: 'customer_id' })

  // Auto-flag as VIP if score is high
  if (score.vip_score >= 0.8 && !customer.is_vip) {
    await supabaseAdmin.from('customers').update({ is_vip: true }).eq('id', customer_id)
  }

  return NextResponse.json({ score })
}
