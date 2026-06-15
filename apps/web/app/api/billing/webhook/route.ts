import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// ─── Stripe signature verification (no SDK) ────────────────────────────────────

async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string
): Promise<boolean> {
  // Parse the Stripe-Signature header: "t=timestamp,v1=hash,..."
  const parts = Object.fromEntries(
    sigHeader.split(',').map(part => {
      const [key, ...rest] = part.split('=')
      return [key, rest.join('=')]
    })
  )

  const timestamp = parts['t']
  const signature = parts['v1']

  if (!timestamp || !signature) return false

  // Tolerance: reject webhooks older than 5 minutes
  const ts = parseInt(timestamp, 10)
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - ts) > 300) return false

  const signedPayload = `${timestamp}.${payload}`

  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const sigBuffer = await crypto.subtle.sign('HMAC', key, enc.encode(signedPayload))
  const computed = Array.from(new Uint8Array(sigBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  // Constant-time comparison
  if (computed.length !== signature.length) return false
  let diff = 0
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ signature.charCodeAt(i)
  }
  return diff === 0
}

// ─── Plan resolution from Stripe price ID ─────────────────────────────────────

function planFromPriceId(priceId: string): 'starter' | 'pro' | null {
  if (priceId === process.env.STRIPE_PRICE_STARTER) return 'starter'
  if (priceId === process.env.STRIPE_PRICE_PRO) return 'pro'
  return null
}

// ─── Webhook handler ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Always return 200 so Stripe doesn't retry indefinitely on our errors
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('[webhook] STRIPE_WEBHOOK_SECRET not set')
      return NextResponse.json({ received: true })
    }

    const sigHeader = request.headers.get('stripe-signature')
    if (!sigHeader) {
      console.warn('[webhook] Missing stripe-signature header')
      return NextResponse.json({ received: true })
    }

    const payload = await request.text()

    const valid = await verifyStripeSignature(payload, sigHeader, webhookSecret)
    if (!valid) {
      console.warn('[webhook] Invalid Stripe signature')
      return NextResponse.json({ received: true })
    }

    const event = JSON.parse(payload)
    const admin = await createAdminClient()

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const tenantId: string = session.metadata?.tenant_id
        const subscriptionId: string = session.subscription
        const customerId: string = session.customer

        if (!tenantId || !subscriptionId) break

        // Fetch the subscription to get the price / plan
        let plan: 'starter' | 'pro' | null = null
        try {
          const subRes = await fetch(
            `https://api.stripe.com/v1/subscriptions/${subscriptionId}`,
            {
              headers: {
                Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
              },
            }
          )
          if (subRes.ok) {
            const sub = await subRes.json()
            const priceId: string = sub.items?.data?.[0]?.price?.id ?? ''
            plan = planFromPriceId(priceId)
          }
        } catch (e) {
          console.error('[webhook] Failed to fetch subscription:', e)
        }

        await admin
          .from('tenants')
          .update({
            plan: plan ?? 'starter',
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_status: 'active',
            trial_ends_at: null,
          })
          .eq('id', tenantId)

        console.log(`[webhook] checkout.session.completed → tenant ${tenantId} → plan ${plan}`)
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object
        const tenantId: string = sub.metadata?.tenant_id

        if (!tenantId) {
          // Fall back to lookup by stripe_customer_id
          const customerId: string = sub.customer
          const { data } = await admin
            .from('tenants')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .maybeSingle()
          if (!data) break

          const priceId: string = sub.items?.data?.[0]?.price?.id ?? ''
          const plan = planFromPriceId(priceId)

          await admin
            .from('tenants')
            .update({
              subscription_status: sub.status,
              ...(plan ? { plan } : {}),
              current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            })
            .eq('id', (data as any).id)
          break
        }

        const priceId: string = sub.items?.data?.[0]?.price?.id ?? ''
        const plan = planFromPriceId(priceId)

        await admin
          .from('tenants')
          .update({
            subscription_status: sub.status,
            ...(plan ? { plan } : {}),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          })
          .eq('id', tenantId)

        console.log(`[webhook] subscription.updated → tenant ${tenantId} → status ${sub.status}`)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object
        const customerId: string = sub.customer

        // Find tenant by customer ID
        const { data } = await admin
          .from('tenants')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle()

        if (!data) {
          console.warn(`[webhook] subscription.deleted: no tenant found for customer ${customerId}`)
          break
        }

        await admin
          .from('tenants')
          .update({
            plan: 'starter',
            subscription_status: 'cancelled',
            stripe_subscription_id: null,
          })
          .eq('id', (data as any).id)

        console.log(`[webhook] subscription.deleted → tenant ${(data as any).id} downgraded to starter`)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const customerId: string = invoice.customer

        const { data } = await admin
          .from('tenants')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .maybeSingle()

        if (!data) break

        await admin
          .from('tenants')
          .update({ subscription_status: 'past_due' })
          .eq('id', (data as any).id)

        console.log(`[webhook] payment_failed → tenant ${(data as any).id} → past_due`)
        break
      }

      default:
        // Unhandled event types — silently ignore
        break
    }
  } catch (err) {
    // Log but always return 200
    console.error('[webhook] Unhandled error:', err)
  }

  return NextResponse.json({ received: true })
}
