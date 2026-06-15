import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import Sidebar from '@/components/layout/sidebar'
import DashboardHeader from '@/components/layout/header'
import TrialExpiredGate from '@/components/billing/trial-expired-gate'
import PastDueBanner from '@/components/billing/past-due-banner'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [supabase, tenant] = await Promise.all([
    createClient(),
    getCurrentTenant(),
  ])

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  if (!tenant) redirect('/login')

  const admin = await createAdminClient()
  const [{ data: tenantUser }, { data: stages }, { data: tenantBilling }] = await Promise.all([
    admin.from('tenant_users').select('*').eq('id', user.id).eq('tenant_id', tenant.id).single(),
    admin.from('lead_stages').select('id, name, order_index').eq('tenant_id', tenant.id).order('order_index'),
    admin
      .from('tenants')
      .select('subscription_status, trial_ends_at')
      .eq('id', tenant.id)
      .single(),
  ])

  if (!tenantUser) redirect('/login')

  const branding = tenant.branding as any
  const subscriptionStatus: string = (tenantBilling as any)?.subscription_status ?? 'trial'
  const trialEndsAt: string | null = (tenantBilling as any)?.trial_ends_at ?? null

  // Check if trial has actually expired
  const trialExpired =
    subscriptionStatus === 'trial' &&
    trialEndsAt !== null &&
    new Date(trialEndsAt) < new Date()

  const isPastDue = subscriptionStatus === 'past_due'

  return (
    <div
      className="min-h-screen bg-charcoal-950 flex"
      style={{
        '--tenant-primary': branding?.primary_color ?? '#C9A84C',
        '--tenant-accent': branding?.accent_color ?? '#1A1A2E',
      } as React.CSSProperties}
    >
      <Sidebar tenant={tenant} user={tenantUser} />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader tenant={tenant} user={tenantUser} stages={stages ?? []} />

        {/* Past-due banner — shown at top, dismissible on client */}
        {isPastDue && <PastDueBanner />}

        <main className="flex-1 p-6 overflow-auto relative">
          {/* Trial-expired full-page gate */}
          {trialExpired ? (
            <TrialExpiredGate />
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  )
}
