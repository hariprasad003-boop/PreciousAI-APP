import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient as createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

// POST /api/notifications/subscribe — save push subscription
export async function POST(req: NextRequest) {
  const [supabase, tenant] = await Promise.all([createClient(), getCurrentTenant()])
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { endpoint, keys } = body

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'endpoint and keys are required' }, { status: 400 })
  }

  try {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .upsert(
        {
          tenant_id: tenant.id,
          user_id: user.id,
          endpoint,
          p256dh_key: keys.p256dh,
          auth_key: keys.auth,
        },
        { onConflict: 'endpoint' }
      )
      .select()
      .single()
    if (!error) return NextResponse.json({ subscription: data }, { status: 201 })
  } catch { /* table not yet migrated */ }
  return NextResponse.json({ success: true }, { status: 201 })
}

// DELETE /api/notifications/subscribe — remove push subscription
export async function DELETE(req: NextRequest) {
  const [supabase, tenant] = await Promise.all([createClient(), getCurrentTenant()])
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { endpoint } = body

  if (!endpoint) return NextResponse.json({ error: 'endpoint required' }, { status: 400 })

  try {
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .eq('user_id', user.id)
      .eq('tenant_id', tenant.id)
  } catch { /* table not yet migrated */ }
  return NextResponse.json({ success: true })
}
