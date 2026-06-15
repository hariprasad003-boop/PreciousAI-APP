import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentTenant, hasFeature } from '@/lib/tenant'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
  const tenant = await getCurrentTenant()
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!hasFeature(tenant.plan, 'whatsapp')) {
    return NextResponse.json({ error: 'WhatsApp requires Pro or Enterprise plan' }, { status: 403 })
  }

  const { phone_number_id, access_token } = await request.json()

  if (!phone_number_id || !access_token) {
    return NextResponse.json({ error: 'phone_number_id and access_token required' }, { status: 400 })
  }

  // Verify the credentials with Meta API
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${phone_number_id}`, {
      headers: { Authorization: `Bearer ${access_token}` },
    })
    if (!res.ok) {
      return NextResponse.json({ error: 'Invalid Phone Number ID or access token. Please check your Meta credentials.' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Could not verify Meta credentials' }, { status: 500 })
  }

  const { error } = await supabaseAdmin
    .from('tenant_whatsapp_configs')
    .upsert({
      tenant_id: tenant.id,
      phone_number_id,
      access_token,
      is_active: true,
      webhook_configured_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
