import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient as createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export async function GET(_req: NextRequest) {
  const [supabase, tenant] = await Promise.all([createClient(), getCurrentTenant()])
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('follow_ups')
    .select(`
      *,
      lead:leads(id, full_name),
      customer:customers(id, full_name)
    `)
    .eq('tenant_id', tenant.id)
    .order('scheduled_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ follow_ups: data })
}

export async function POST(request: NextRequest) {
  const [supabase, tenant] = await Promise.all([createClient(), getCurrentTenant()])
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { lead_id, customer_id, scheduled_at, type, message_content, assigned_to } = body

  if (!scheduled_at || !type) {
    return NextResponse.json({ error: 'scheduled_at and type are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('follow_ups')
    .insert({
      tenant_id: tenant.id,
      lead_id: lead_id ?? null,
      customer_id: customer_id ?? null,
      scheduled_at,
      type,
      message_content: message_content ?? null,
      assigned_to: assigned_to ?? null,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ follow_up: data }, { status: 201 })
}
