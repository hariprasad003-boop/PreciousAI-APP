import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import { createBillingPortalSession } from '@/lib/services/stripe'

export async function POST(request: NextRequest) {
  try {
    const [supabase, tenant] = await Promise.all([createClient(), getCurrentTenant()])
    if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = await createAdminClient()
    const { data: tenantRow } = await admin
      .from('tenants')
      .select('stripe_customer_id, subdomain')
      .eq('id', tenant.id)
      .single()

    const stripeCustomerId: string | null = (tenantRow as any)?.stripe_customer_id ?? null

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: 'No Stripe customer found. Please subscribe to a plan first.' },
        { status: 400 }
      )
    }

    const origin =
      request.headers.get('origin') ??
      `https://${(tenantRow as any).subdomain}.${process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'preciousai.app'}`

    const returnUrl = `${origin}/settings`

    const portalUrl = await createBillingPortalSession(stripeCustomerId, returnUrl)

    return NextResponse.json({ url: portalUrl })
  } catch (err: any) {
    console.error('[billing/portal] error:', err)
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}
