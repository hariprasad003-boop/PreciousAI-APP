import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentTenant } from '@/lib/tenant'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenant = await getCurrentTenant()
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Verify the location belongs to this tenant
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('tenant_locations')
    .select('id, is_primary')
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 })
  }

  const body = await request.json() as {
    name?: string
    address?: string
    city?: string
    country?: string
    phone?: string
    is_primary?: boolean
    is_active?: boolean
  }

  const { name, address, city, country, phone, is_primary, is_active } = body

  // If setting as primary, clear existing primary
  if (is_primary) {
    await supabaseAdmin
      .from('tenant_locations')
      .update({ is_primary: false })
      .eq('tenant_id', tenant.id)
  }

  const updates: Record<string, unknown> = {}
  if (name !== undefined) updates.name = name.trim()
  if (address !== undefined) updates.address = address?.trim() || null
  if (city !== undefined) updates.city = city?.trim() || null
  if (country !== undefined) updates.country = country?.trim() || null
  if (phone !== undefined) updates.phone = phone?.trim() || null
  if (is_primary !== undefined) updates.is_primary = is_primary
  if (is_active !== undefined) updates.is_active = is_active

  const { data: location, error } = await supabaseAdmin
    .from('tenant_locations')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ location })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tenant = await getCurrentTenant()
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Verify the location belongs to this tenant
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('tenant_locations')
    .select('id, is_primary')
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 })
  }

  // Count how many locations the tenant has
  const { count } = await supabaseAdmin
    .from('tenant_locations')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenant.id)

  const locationCount = count ?? 0

  // Prevent deleting the primary location if it's the only one
  if (existing.is_primary && locationCount <= 1) {
    return NextResponse.json(
      { error: 'Cannot delete the only location. Add another location first.' },
      { status: 400 }
    )
  }

  const { error } = await supabaseAdmin
    .from('tenant_locations')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If the deleted location was primary and there are other locations, promote the oldest remaining one
  if (existing.is_primary && locationCount > 1) {
    const { data: remaining } = await supabaseAdmin
      .from('tenant_locations')
      .select('id')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: true })
      .limit(1)

    if (remaining?.[0]) {
      await supabaseAdmin
        .from('tenant_locations')
        .update({ is_primary: true })
        .eq('id', remaining[0].id)
    }
  }

  return NextResponse.json({ success: true })
}
