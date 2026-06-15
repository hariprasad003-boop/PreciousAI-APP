import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import Sidebar from '@/components/layout/sidebar'
import DashboardHeader from '@/components/layout/header'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [supabase, tenant] = await Promise.all([
    createClient(),
    getCurrentTenant(),
  ])

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  if (!tenant) redirect('/login')

  const admin = await createAdminClient()
  const [{ data: tenantUser }, { data: stages }] = await Promise.all([
    admin.from('tenant_users').select('*').eq('id', user.id).eq('tenant_id', tenant.id).single(),
    admin.from('lead_stages').select('id, name, order_index').eq('tenant_id', tenant.id).order('order_index'),
  ])

  if (!tenantUser) redirect('/login')

  const branding = tenant.branding as any

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
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
