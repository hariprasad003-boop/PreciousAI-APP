import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient as createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const [supabase, tenant] = await Promise.all([createClient(), getCurrentTenant()])
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('follow_ups')
    .select(`
      *,
      lead:leads(id, full_name, phone, country_code),
      customer:customers(id, full_name, phone, country_code),
      assignee:tenant_users(id, full_name)
    `)
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ follow_up: data })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const [supabase, tenant] = await Promise.all([createClient(), getCurrentTenant()])
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { status, message_content, scheduled_at } = body

  if (status && !['pending', 'sent', 'done', 'skipped', 'completed'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const updates: Record<string, any> = { updated_at: new Date().toISOString() }
  if (status) updates.status = status === 'completed' ? 'done' : status
  if (message_content !== undefined) updates.message_content = message_content
  if (scheduled_at !== undefined) updates.scheduled_at = scheduled_at

  const { data, error } = await supabase
    .from('follow_ups')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ follow_up: data })
}
