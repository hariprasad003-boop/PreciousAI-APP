import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import { createCustomer, createCheckoutSession } from '@/lib/services/stripe'
import { headers } from 'next/headers'

const PRICE_IDS: Record<'starter' | 'pro', string> = {
  starter: process.env.STRIPE_PRICE_STARTER ?? '',
  pro: process.env.STRIPE_PRICE_PRO ?? '',
}

export async function POST(request: NextRequest) {
  try {
    const [supabase, tenant] = await Promise.all([createClient(), getCurrentTenant()])
    if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Verify the user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { plan } = body as { plan: 'starter' | 'pro' }

    if (!plan || !['starter', 'pro'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan. Must be starter or pro.' }, { status: 400 })
    }

    const priceId = PRICE_IDS[plan]
    if (!priceId) {
      return NextResponse.json({ error: `Price ID for plan "${plan}" is not configured` }, { status: 500 })
    }

    const admin = await createAdminClient()

    // Fetch the full tenant row (includes billing columns added by migration 004)
    const { data: tenantRow } = await admin
      .from('tenants')
      .select('stripe_customer_id, name, subdomain')
      .eq('id', tenant.id)
      .single()

    let stripeCustomerId: string = (tenantRow as any)?.stripe_customer_id ?? ''

    if (!stripeCustomerId) {
      // Create a new Stripe customer
      stripeCustomerId = await createCustomer(user.email ?? '', tenant.name, tenant.id)

      // Persist the customer ID immediately so it isn't created twice
      await admin
        .from('tenants')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', tenant.id)
    }

    // Derive base URL from request for success/cancel redirect
    const headersList = await headers()
    const origin =
      request.headers.get('origin') ??
      `https://${tenant.subdomain}.${process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'preciousai.app'}`

    const successUrl = `${origin}/settings?billing=success`
    const cancelUrl = `${origin}/settings?billing=cancelled`

    const checkoutUrl = await createCheckoutSession(
      stripeCustomerId,
      priceId,
      tenant.id,
      successUrl,
      cancelUrl
    )

    return NextResponse.json({ url: checkoutUrl })
  } catch (err: any) {
    console.error('[billing/checkout] error:', err)
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}
