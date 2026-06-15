/**
 * Stripe service — uses fetch directly, no SDK.
 * All bodies are application/x-www-form-urlencoded per Stripe API.
 */

const STRIPE_BASE = 'https://api.stripe.com/v1'

function stripeKey(): string {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set')
  return key
}

async function stripeRequest<T>(
  method: 'GET' | 'POST' | 'DELETE',
  path: string,
  body?: Record<string, string>
): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${stripeKey()}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  }

  const options: RequestInit = { method, headers }
  if (body && method !== 'GET') {
    options.body = new URLSearchParams(body).toString()
  }

  const res = await fetch(`${STRIPE_BASE}${path}`, options)
  const json = await res.json()

  if (!res.ok) {
    const msg = (json as any)?.error?.message ?? `Stripe error ${res.status}`
    throw new Error(msg)
  }

  return json as T
}

// ─── Public types ──────────────────────────────────────────────────────────────

export interface StripeSubscription {
  id: string
  status: string
  current_period_end: number
  cancel_at_period_end: boolean
  items: {
    data: Array<{ price: { id: string; product: string } }>
  }
}

// ─── Service functions ─────────────────────────────────────────────────────────

/** Creates a Stripe customer and returns their customer ID. */
export async function createCustomer(
  email: string,
  storeName: string,
  tenantId: string
): Promise<string> {
  const customer = await stripeRequest<{ id: string }>('POST', '/customers', {
    email,
    name: storeName,
    'metadata[tenant_id]': tenantId,
  })
  return customer.id
}

/** Creates a Stripe Checkout session and returns the hosted URL. */
export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  tenantId: string,
  successUrl: string,
  cancelUrl: string
): Promise<string> {
  const session = await stripeRequest<{ url: string }>('POST', '/checkout/sessions', {
    customer: customerId,
    mode: 'subscription',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    success_url: successUrl,
    cancel_url: cancelUrl,
    'metadata[tenant_id]': tenantId,
    'subscription_data[metadata][tenant_id]': tenantId,
  })
  return session.url
}

/** Creates a Billing Portal session and returns the portal URL. */
export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<string> {
  const session = await stripeRequest<{ url: string }>('POST', '/billing_portal/sessions', {
    customer: customerId,
    return_url: returnUrl,
  })
  return session.url
}

/** Fetches a subscription object by ID. */
export async function getSubscription(subscriptionId: string): Promise<StripeSubscription> {
  return stripeRequest<StripeSubscription>('GET', `/subscriptions/${subscriptionId}`)
}

/** Cancels a subscription at the end of the current period. */
export async function cancelSubscription(subscriptionId: string): Promise<void> {
  await stripeRequest('POST', `/subscriptions/${subscriptionId}`, {
    cancel_at_period_end: 'true',
  })
}
