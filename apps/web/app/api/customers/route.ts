import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient as createClient } from '@/lib/supabase/server'
import { getCurrentTenant, checkPlanLimit } from '@/lib/tenant'

export async function GET(_request: NextRequest) {
  const [supabase, tenant] = await Promise.all([createClient(), getCurrentTenant()])
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: customers, error } = await supabase
    .from('customers')
    .select(`
      id, full_name, phone, email, country_code,
      is_vip, lifetime_value, dob, anniversary_date,
      metal_pref, stone_pref, favourite_categories,
      created_at, updated_at,
      ai_score(vip_score, churn_risk, next_purchase_category)
    `)
    .eq('tenant_id', tenant.id)
    .order('lifetime_value', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ customers })
}

export async function POST(request: NextRequest) {
  const [supabase, tenant] = await Promise.all([createClient(), getCurrentTenant()])
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limitCheck = await checkPlanLimit(tenant.id, tenant.plan, 'customers')
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: `Customer limit reached (${limitCheck.current}/${limitCheck.limit}). Upgrade your plan.` },
      { status: 403 }
    )
  }

  const body = await request.json()
  const {
    full_name, phone, email, country_code, dob, anniversary_date,
    city, metal_pref, stone_pref, style_pref, favourite_categories, notes,
    lead_id, location_id,
  } = body

  if (!full_name || !phone) {
    return NextResponse.json({ error: 'full_name and phone are required' }, { status: 400 })
  }

  const { data: customer, error } = await supabase
    .from('customers')
    .insert({
      tenant_id: tenant.id,
      full_name,
      phone,
      email: email ?? null,
      country_code: country_code ?? tenant.country_code,
      dob: dob ?? null,
      anniversary_date: anniversary_date ?? null,
      city: city ?? null,
      metal_pref: metal_pref ?? [],
      stone_pref: stone_pref ?? [],
      style_pref: style_pref ?? [],
      favourite_categories: favourite_categories ?? [],
      notes: notes ?? null,
      lead_id: lead_id ?? null,
      location_id: location_id ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ customer }, { status: 201 })
}
