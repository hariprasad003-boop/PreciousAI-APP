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

  const body = await request.json().catch(() => ({}))
  const { primary_color, accent_color, store_name } = body

  const brandingUpdate = {
    ...(tenant.branding as object),
    ...(store_name && { store_name }),
    ...(primary_color && { primary_color }),
    ...(accent_color && { accent_color }),
  }

  const { error } = await supabaseAdmin
    .from('tenants')
    .update({
      onboarding_completed: true,
      branding: brandingUpdate,
    })
    .eq('id', tenant.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
