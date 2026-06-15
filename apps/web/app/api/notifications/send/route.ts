import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient as createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

// POST /api/notifications/send — store in-app notification (push delivery is a future enhancement)
export async function POST(req: NextRequest) {
  const [supabase, tenant] = await Promise.all([createClient(), getCurrentTenant()])
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { user_id, title, body: notifBody, url } = body

  if (!user_id || !title) {
    return NextResponse.json({ error: 'user_id and title are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      tenant_id: tenant.id,
      user_id,
      title,
      body: notifBody ?? null,
      url: url ?? null,
      read: false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // TODO: Deliver via Web Push using VAPID signing once web-push library is available.
  // The push_subscriptions table contains all registered endpoints.

  return NextResponse.json({ notification: data }, { status: 201 })
}
