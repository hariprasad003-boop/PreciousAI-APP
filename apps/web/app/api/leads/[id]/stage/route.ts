import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient as createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [supabase, tenant] = await Promise.all([createClient(), getCurrentTenant()])
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { stage_id } = await request.json()
  if (!stage_id) return NextResponse.json({ error: 'stage_id required' }, { status: 400 })

  const { data: stage } = await supabase
    .from('lead_stages')
    .select('id')
    .eq('id', stage_id)
    .eq('tenant_id', tenant.id)
    .single()

  if (!stage) return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })

  const { data: lead, error } = await supabase
    .from('leads')
    .update({ stage_id, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ lead })
}
