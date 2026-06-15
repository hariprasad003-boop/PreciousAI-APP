import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export async function GET() {
  const [supabase, tenant] = await Promise.all([createAdminClient(), getCurrentTenant()])
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: stages, error } = await supabase
    .from('lead_stages')
    .select('id, name, order_index')
    .eq('tenant_id', tenant.id)
    .order('order_index')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ stages })
}
