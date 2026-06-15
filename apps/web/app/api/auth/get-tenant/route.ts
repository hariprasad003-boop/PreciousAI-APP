import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data, error } = await supabaseAdmin
      .from('tenant_users')
      .select('tenants(subdomain, name, is_active)')
      .eq('email', email)
      .eq('is_active', true)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'No store found for this account' }, { status: 404 })
    }

    const tenant = data.tenants as any
    if (!tenant?.is_active) {
      return NextResponse.json({ error: 'Your store has been deactivated' }, { status: 403 })
    }

    return NextResponse.json({ subdomain: tenant.subdomain, store_name: tenant.name })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to get tenant' }, { status: 500 })
  }
}
