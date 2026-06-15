import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentTenant } from '@/lib/tenant'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
  const tenant = await getCurrentTenant()
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { to, message, lead_id } = await request.json()
  if (!to || !message) return NextResponse.json({ error: 'to and message required' }, { status: 400 })

  const { data: config } = await supabaseAdmin
    .from('tenant_whatsapp_configs')
    .select('phone_number_id, access_token')
    .eq('tenant_id', tenant.id)
    .eq('is_active', true)
    .single()

  if (!config) return NextResponse.json({ error: 'WhatsApp not configured' }, { status: 400 })

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${config.phone_number_id}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message },
      }),
    }
  )

  const data = await res.json()
  if (!res.ok) return NextResponse.json({ error: data.error?.message ?? 'Send failed' }, { status: 500 })

  // Log the outbound message
  await supabaseAdmin.from('whatsapp_messages').insert({
    tenant_id: tenant.id,
    wa_message_id: data.messages?.[0]?.id,
    direction: 'outbound',
    from_number: config.phone_number_id,
    to_number: to,
    message_type: 'text',
    content: message,
    lead_id: lead_id ?? null,
  })

  return NextResponse.json({ success: true })
}
