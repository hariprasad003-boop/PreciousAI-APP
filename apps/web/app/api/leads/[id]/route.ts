import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient as createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [supabase, tenant] = await Promise.all([createClient(), getCurrentTenant()])
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: lead, error } = await supabase
    .from('leads')
    .select(`
      *,
      stage:lead_stages(id, name, color, order_index),
      assigned_user:tenant_users(id, full_name),
      interactions(*),
      follow_ups(*)
    `)
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .single()

  if (error || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  return NextResponse.json({ lead })
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [supabase, tenant] = await Promise.all([createClient(), getCurrentTenant()])
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const allowed = ['stage_id', 'full_name', 'phone', 'email', 'country_code', 'source',
    'assigned_to', 'raw_message', 'intent_score', 'budget_amount', 'budget_currency',
    'occasion', 'category_interest', 'tags', 'last_contacted_at']

  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }
  updates.updated_at = new Date().toISOString()

  const { data: lead, error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ lead })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [supabase, tenant] = await Promise.all([createClient(), getCurrentTenant()])
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenant.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
