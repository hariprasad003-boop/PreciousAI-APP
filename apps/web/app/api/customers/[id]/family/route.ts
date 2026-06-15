import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient as createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [supabase, tenant] = await Promise.all([createClient(), getCurrentTenant()])
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: customer } = await supabase
    .from('customers').select('id').eq('id', id).eq('tenant_id', tenant.id).single()
  if (!customer) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { name, relation, dob, anniversary_date, notes } = await request.json()
  if (!name || !relation) return NextResponse.json({ error: 'name and relation required' }, { status: 400 })

  const { data, error } = await supabase
    .from('customer_family')
    .insert({
      customer_id: id,
      tenant_id: tenant.id,
      name,
      relation,
      dob: dob ?? null,
      anniversary_date: anniversary_date ?? null,
      notes: notes ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ member: data }, { status: 201 })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await params
  const [supabase, tenant] = await Promise.all([createClient(), getCurrentTenant()])
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { member_id } = await request.json()
  if (!member_id) return NextResponse.json({ error: 'member_id required' }, { status: 400 })

  const { error } = await supabase
    .from('customer_family')
    .delete()
    .eq('id', member_id)
    .eq('tenant_id', tenant.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
