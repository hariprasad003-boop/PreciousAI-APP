import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentTenant } from '@/lib/tenant'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function PATCH(request: NextRequest) {
  const tenant = await getCurrentTenant()
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { store_name, primary_color, accent_color, logo_url } = body

  const updatedBranding = {
    ...(tenant.branding as object),
    ...(store_name !== undefined && { store_name }),
    ...(primary_color !== undefined && { primary_color }),
    ...(accent_color !== undefined && { accent_color }),
    ...(logo_url !== undefined && { logo_url }),
  }

  const { error } = await supabaseAdmin
    .from('tenants')
    .update({ branding: updatedBranding })
    .eq('id', tenant.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ branding: updatedBranding })
}
