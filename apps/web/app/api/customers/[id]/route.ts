import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient as createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [supabase, tenant] = await Promise.all([createClient(), getCurrentTenant()])
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: customer, error } = await supabase
    .from('customers')
    .select(`
      *,
      family_members:customer_family(*),
      purchase_history(*),
      interactions(*),
      follow_ups(*),
      ai_score(*),
      lead:leads(id, source, stage:lead_stages(name, color))
    `)
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .single()

  if (error || !customer) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ customer })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [supabase, tenant] = await Promise.all([createClient(), getCurrentTenant()])
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const allowed = [
    'full_name', 'phone', 'email', 'country_code', 'dob', 'anniversary_date',
    'city', 'metal_pref', 'stone_pref', 'style_pref', 'favourite_categories',
    'notes', 'is_vip', 'lifetime_value',
  ]
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const { data: customer, error } = await supabase
    .from('customers')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ customer })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [supabase, tenant] = await Promise.all([createClient(), getCurrentTenant()])
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenant.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
