import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient as createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [supabase, tenant] = await Promise.all([createClient(), getCurrentTenant()])
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: customer } = await supabase
    .from('customers')
    .select('id, lifetime_value')
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .single()

  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 })

  const body = await request.json()
  const { purchase_date, amount, currency, category, item_description, occasion, staff_id, location_id, image_url } = body

  if (!purchase_date || !amount) {
    return NextResponse.json({ error: 'purchase_date and amount are required' }, { status: 400 })
  }

  const { data: purchase, error } = await supabase
    .from('purchase_history')
    .insert({
      customer_id: id,
      tenant_id: tenant.id,
      purchase_date,
      amount,
      currency: currency ?? tenant.currency,
      category: category ?? null,
      item_description: item_description ?? null,
      occasion: occasion ?? null,
      staff_id: staff_id ?? null,
      location_id: location_id ?? null,
      image_url: image_url ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const newLtv = (customer.lifetime_value ?? 0) + amount
  await supabase.from('customers').update({ lifetime_value: newLtv }).eq('id', id)

  return NextResponse.json({ purchase }, { status: 201 })
}
