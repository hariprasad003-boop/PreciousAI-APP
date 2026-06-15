import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateSubdomain } from '@/lib/utils'
import { DEFAULT_LEAD_STAGES } from '@preciousai/shared'
import { sendWelcomeEmail } from '@/lib/services/email'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || url.includes('your-project') || !key || key === 'your-service-role-key') {
    return null
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getAdminClient()
    if (!supabaseAdmin) {
      return NextResponse.json(
        {
          error:
            'Supabase is not configured. Open apps/web/.env.local and replace the placeholder values with your real Supabase project URL and service role key.',
        },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { store_name, full_name, email, password, country, plan } = body

    if (!store_name || !full_name || !email || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const subdomain = generateSubdomain(store_name)

    // Check subdomain availability
    const { data: existing } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('subdomain', subdomain)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: `The subdomain "${subdomain}" is already taken. Try a different store name.` },
        { status: 409 }
      )
    }

    const currency = country === 'India' ? 'INR' : 'AED'
    const country_code = country === 'India' ? '+91' : '+971'

    // Create tenant
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert({
        name: store_name,
        subdomain,
        plan: plan ?? 'starter',
        currency,
        country_code,
        branding: {
          store_name,
          primary_color: '#C9A84C',
          accent_color: '#1A1A2E',
          logo_url: null,
        },
      })
      .select()
      .single()

    if (tenantError) throw tenantError

    // Create default lead stages for this tenant
    const stages = DEFAULT_LEAD_STAGES.map((s: any) => ({ ...s, tenant_id: tenant.id }))
    await supabaseAdmin.from('lead_stages').insert(stages)

    // Create default location
    const { data: location } = await supabaseAdmin
      .from('tenant_locations')
      .insert({ tenant_id: tenant.id, name: 'Main Store', country: country ?? 'UAE' })
      .select()
      .single()

    // Create Supabase auth user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, tenant_id: tenant.id },
    })

    if (authError) {
      // Rollback tenant if auth fails
      await supabaseAdmin.from('tenants').delete().eq('id', tenant.id)
      throw authError
    }

    // Create tenant user record (owner role)
    await supabaseAdmin.from('tenant_users').insert({
      id: authUser.user.id,
      tenant_id: tenant.id,
      location_id: location?.id ?? null,
      email,
      full_name,
      role: 'owner',
    })

    // Fire-and-forget welcome email — don't block the response
    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://preciousai.app'}/${subdomain}/dashboard`
    sendWelcomeEmail({
      to: email,
      ownerName: full_name,
      storeName: store_name,
      loginUrl,
      primaryColor: '#C9A84C',
    }).catch(console.error)

    return NextResponse.json({
      success: true,
      subdomain,
      tenant_id: tenant.id,
    })
  } catch (err: any) {
    console.error('[signup]', err)
    const message = err?.message ?? 'Signup failed'
    // Make Supabase network errors user-friendly
    if (message.toLowerCase().includes('fetch') || message.toLowerCase().includes('network')) {
      return NextResponse.json(
        { error: 'Cannot reach the database. Check your NEXT_PUBLIC_SUPABASE_URL in .env.local.' },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
