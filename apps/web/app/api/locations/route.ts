import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentTenant, checkPlanLimit } from '@/lib/tenant'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(_req: NextRequest) {
  const tenant = await getCurrentTenant()
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: locations, error } = await supabaseAdmin
    .from('tenant_locations')
    .select('id, name, city, country, phone, is_active, is_primary, created_at')
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ locations: locations ?? [] })
}

export async function POST(request: NextRequest) {
  const tenant = await getCurrentTenant()
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Check plan limit
  const limitCheck = await checkPlanLimit(tenant.id, tenant.plan as 'starter' | 'pro' | 'enterprise', 'locations')
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: `Location limit reached (${limitCheck.limit} on ${tenant.plan} plan). Upgrade to add more.` },
      { status: 403 }
    )
  }

  const body = await request.json() as {
    name: string
    address?: string
    city?: string
    country?: string
    phone?: string
    is_primary?: boolean
  }

  const { name, address, city, country, phone, is_primary } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Location name is required' }, { status: 400 })
  }

  // If setting as primary, clear any existing primary flag
  if (is_primary) {
    await supabaseAdmin
      .from('tenant_locations')
      .update({ is_primary: false })
      .eq('tenant_id', tenant.id)
  }

  // If this is the first location, make it primary
  const isPrimary = is_primary || limitCheck.current === 0

  const { data: location, error } = await supabaseAdmin
    .from('tenant_locations')
    .insert({
      tenant_id: tenant.id,
      name: name.trim(),
      address: address?.trim() || null,
      city: city?.trim() || null,
      country: country?.trim() || null,
      phone: phone?.trim() || null,
      is_primary: isPrimary,
      is_active: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ location }, { status: 201 })
}
