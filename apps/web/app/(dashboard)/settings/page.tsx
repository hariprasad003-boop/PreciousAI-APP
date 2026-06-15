import { createAdminClient as createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import BrandingSettings from '@/components/settings/branding-settings'
import TeamSettings from '@/components/settings/team-settings'
import WhatsAppSettings from '@/components/settings/whatsapp-settings'
import LocationSettings from '@/components/settings/location-settings'
import BillingSettings from '@/components/settings/billing-settings'
import { PLANS } from '@preciousai/shared'

export default async function SettingsPage() {
  const [supabase, tenant] = await Promise.all([createClient(), getCurrentTenant()])
  if (!tenant) return null

  const [{ data: users }, { data: locations }, { data: waConfig }, { data: tenantBilling }] =
    await Promise.all([
      supabase
        .from('tenant_users')
        .select('id, full_name, email, role, is_active, created_at')
        .eq('tenant_id', tenant.id)
        .order('created_at'),

      supabase
        .from('tenant_locations')
        .select('id, name, address, city, country, phone, is_active, is_primary, created_at')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: true }),

      supabase
        .from('tenant_whatsapp_configs')
        .select('id, phone_number_id, is_active, webhook_configured_at')
        .eq('tenant_id', tenant.id)
        .maybeSingle(),

      supabase
        .from('tenants')
        .select('stripe_customer_id, subscription_status, trial_ends_at, current_period_end')
        .eq('id', tenant.id)
        .single(),
    ])

  const plan = PLANS[tenant.plan] ?? PLANS.starter
  const branding = tenant.branding as {
    store_name?: string
    primary_color?: string
    accent_color?: string
    logo_url?: string
  }
  const billing = tenantBilling as {
    stripe_customer_id: string | null
    subscription_status: string | null
    trial_ends_at: string | null
    current_period_end: string | null
  } | null

  return (
    <div className="animate-fade-in max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Settings</h1>
        <p className="text-charcoal-400 text-sm mt-1">Manage your store, team, and integrations.</p>
      </div>

      {/* Billing */}
      <BillingSettings
        plan={tenant.plan}
        subscriptionStatus={billing?.subscription_status ?? null}
        trialEndsAt={billing?.trial_ends_at ?? null}
        currentPeriodEnd={billing?.current_period_end ?? null}
        hasStripeCustomer={!!billing?.stripe_customer_id}
      />

      {/* Branding */}
      <BrandingSettings branding={branding} tenantId={tenant.id} />

      {/* Locations */}
      <LocationSettings
        locations={(locations ?? []) as {
          id: string
          name: string
          address: string | null
          city: string | null
          country: string | null
          phone: string | null
          is_active: boolean
          is_primary: boolean
          created_at: string
        }[]}
        plan={tenant.plan as 'starter' | 'pro' | 'enterprise'}
        tenantId={tenant.id}
      />

      {/* Team */}
      <TeamSettings
        users={users ?? []}
        plan={tenant.plan}
        tenantId={tenant.id}
      />

      {/* WhatsApp */}
      <WhatsAppSettings
        config={waConfig}
        plan={tenant.plan}
        tenantId={tenant.id}
      />
    </div>
  )
}
