import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentTenant, checkPlanLimit } from '@/lib/tenant'
import { sendTeamInvite } from '@/lib/services/email'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
  const tenant = await getCurrentTenant()
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limitCheck = await checkPlanLimit(tenant.id, tenant.plan, 'seats')
  if (!limitCheck.allowed) {
    return NextResponse.json(
      { error: `Seat limit reached (${limitCheck.current}/${limitCheck.limit}). Upgrade your plan.` },
      { status: 403 }
    )
  }

  const { email, full_name, role } = await request.json()
  if (!email || !full_name) return NextResponse.json({ error: 'email and full_name required' }, { status: 400 })

  const validRoles = ['manager', 'sales_staff', 'readonly']
  if (!validRoles.includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })

  // Check if user already exists
  const { data: existing } = await supabaseAdmin
    .from('tenant_users')
    .select('id')
    .eq('tenant_id', tenant.id)
    .eq('email', email)
    .single()

  if (existing) return NextResponse.json({ error: 'This email is already a team member' }, { status: 409 })

  // Create auth user (they'll get an invite email)
  const tempPassword = Math.random().toString(36).slice(-12) + 'Aa1!'
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: false,
    user_metadata: { full_name, tenant_id: tenant.id, invited: true },
  })

  if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })

  await supabaseAdmin.from('tenant_users').insert({
    id: authUser.user.id,
    tenant_id: tenant.id,
    email,
    full_name,
    role,
  })

  // Generate invite link so user can set their own password
  const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login` },
  })

  // Build invite URL — include token and store subdomain for onboarding context
  const inviteToken = linkData?.properties?.hashed_token ?? authUser.user.id
  const inviteUrl =
    `${process.env.NEXT_PUBLIC_APP_URL}/signup` +
    `?invite=${encodeURIComponent(inviteToken)}` +
    `&store=${encodeURIComponent(tenant.subdomain)}`

  // Resolve the inviter's name from tenant_users (best-effort — don't block response)
  const storeName = tenant.branding?.store_name || tenant.name
  const primaryColor = tenant.branding?.primary_color

  // Fire-and-forget invite email
  sendTeamInvite({
    to: email,
    storeName,
    inviterName: storeName, // store name as sender context since we don't have current user here
    inviteUrl,
    primaryColor,
  }).catch(console.error)

  return NextResponse.json({ success: true })
}
