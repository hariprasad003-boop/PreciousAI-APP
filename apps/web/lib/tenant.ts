import { headers } from 'next/headers'
import { createAdminClient } from './supabase/server'
import { PLANS, type PlanId } from '@preciousai/shared'
import type { Tenant } from '@preciousai/shared'

export async function getCurrentTenant(): Promise<Tenant | null> {
  const headersList = await headers()
  const subdomain = headersList.get('x-tenant-subdomain')
  if (!subdomain) return null

  const supabase = await createAdminClient()
  const { data } = await supabase
    .from('tenants')
    .select('*')
    .eq('subdomain', subdomain)
    .eq('is_active', true)
    .single()

  return data as Tenant | null
}

export function getPlanLimits(planId: PlanId) {
  return PLANS[planId]?.limits ?? PLANS.starter.limits
}

export function hasFeature(planId: PlanId, feature: keyof typeof PLANS.starter.features): boolean {
  return PLANS[planId]?.features[feature] ?? false
}

export async function checkPlanLimit(
  tenantId: string,
  planId: PlanId,
  resource: 'customers' | 'seats' | 'locations'
): Promise<{ allowed: boolean; current: number; limit: number }> {
  const supabase = await createClient()
  const limits = getPlanLimits(planId)

  const tableMap = {
    customers: 'customers',
    seats: 'tenant_users',
    locations: 'tenant_locations',
  }

  const { count } = await supabase
    .from(tableMap[resource])
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)

  const current = count ?? 0
  const limit = limits[resource]

  return {
    allowed: limit === Infinity || current < limit,
    current,
    limit: limit === Infinity ? -1 : limit,
  }
}
