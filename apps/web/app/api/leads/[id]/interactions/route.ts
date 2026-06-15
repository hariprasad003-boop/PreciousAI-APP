import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient as createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [supabase, tenant] = await Promise.all([createClient(), getCurrentTenant()])
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await supabase.auth.getUser()
  const { type, content, direction, media_url } = await request.json()

  if (!type) return NextResponse.json({ error: 'type required' }, { status: 400 })

  const { data, error } = await supabase
    .from('interactions')
    .insert({
      tenant_id: tenant.id,
      lead_id: id,
      staff_id: user?.id ?? null,
      type,
      content: content ?? null,
      direction: direction ?? 'outbound',
      media_url: media_url ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('leads').update({ last_contacted_at: new Date().toISOString() }).eq('id', id)

  return NextResponse.json({ interaction: data }, { status: 201 })
}
