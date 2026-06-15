import { createAdminClient as createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import BrandingSettings from '@/components/settings/branding-settings'
import TeamSettings from '@/components/settings/team-settings'
import WhatsAppSettings from '@/components/settings/whatsapp-settings'
import { PLANS } from '@preciousai/shared'

export default async function SettingsPage() {
  const [supabase, tenant] = await Promise.all([createClient(), getCurrentTenant()])
  if (!tenant) return null

  const [{ data: users }, { data: locations }, { data: waConfig }] = await Promise.all([
    supabase
      .from('tenant_users')
      .select('id, full_name, email, role, is_active, created_at')
      .eq('tenant_id', tenant.id)
      .order('created_at'),

    supabase
      .from('tenant_locations')
      .select('id, name, city, country, is_active')
      .eq('tenant_id', tenant.id),

    supabase
      .from('tenant_whatsapp_configs')
      .select('id, phone_number_id, is_active, webhook_configured_at')
      .eq('tenant_id', tenant.id)
      .maybeSingle(),
  ])

  const plan = PLANS[tenant.plan] ?? PLANS.starter
  const branding = tenant.branding as any

  return (
    <div className="animate-fade-in max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-white">Settings</h1>
        <p className="text-charcoal-400 text-sm mt-1">Manage your store, team, and integrations.</p>
      </div>

      {/* Plan badge */}
      <div className="dark-glass rounded-xl px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-charcoal-400 text-xs mb-0.5">Current plan</p>
          <p className="text-white font-semibold font-display">{plan.name}</p>
        </div>
        <div className="flex items-center gap-3">
          {tenant.plan !== 'enterprise' && (
            <a
              href="/settings/billing"
              className="text-xs bg-gold-500 hover:bg-gold-400 text-charcoal-900 font-semibold px-4 py-2 rounded-lg transition-all"
            >
              Upgrade
            </a>
          )}
        </div>
      </div>

      {/* Branding */}
      <BrandingSettings branding={branding} />

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
