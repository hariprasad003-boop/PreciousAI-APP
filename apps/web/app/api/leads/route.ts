import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient as createClient } from '@/lib/supabase/server'
import { getCurrentTenant, hasFeature } from '@/lib/tenant'
import { tagLeadWithAI } from '@/lib/services/ai'

export async function GET(_request: NextRequest) {
  const [supabase, tenant] = await Promise.all([createClient(), getCurrentTenant()])
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: leads, error } = await supabase
    .from('leads')
    .select(`
      *,
      stage:lead_stages(id, name, color, order_index),
      assigned_user:tenant_users(id, full_name)
    `)
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ leads })
}

export async function POST(request: NextRequest) {
  const [supabase, tenant] = await Promise.all([createClient(), getCurrentTenant()])
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { full_name, phone, country_code, source, stage_id, raw_message, budget_amount, budget_currency, occasion, email } = body

  if (!full_name || !phone || !stage_id) {
    return NextResponse.json({ error: 'full_name, phone, and stage_id are required' }, { status: 400 })
  }

  const { data: lead, error } = await supabase
    .from('leads')
    .insert({
      tenant_id: tenant.id,
      full_name,
      phone,
      country_code: country_code ?? tenant.country_code,
      source: source ?? 'manual',
      stage_id,
      raw_message: raw_message ?? null,
      budget_amount: budget_amount ?? null,
      budget_currency: budget_currency ?? tenant.currency,
      occasion: occasion ?? null,
      email: email ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Auto-tag with AI if plan supports it and raw message provided
  if (raw_message && hasFeature(tenant.plan, 'aiTagging')) {
    const aiProfile = await tagLeadWithAI(raw_message, tenant.currency)
    if (aiProfile) {
      await supabase
        .from('leads')
        .update({
          intent_score: aiProfile.intent_score,
          tags: aiProfile.tags ?? [],
          category_interest: aiProfile.category_interest ?? [],
          budget_amount: aiProfile.budget?.amount ?? budget_amount ?? null,
          occasion: aiProfile.occasion ?? occasion ?? null,
        })
        .eq('id', lead.id)
    }
  }

  return NextResponse.json({ lead }, { status: 201 })
}
