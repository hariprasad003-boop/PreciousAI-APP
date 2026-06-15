import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient as createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import { sendFollowUpReminder } from '@/lib/services/email'

export async function GET(_req: NextRequest) {
  const [supabase, tenant] = await Promise.all([createClient(), getCurrentTenant()])
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('follow_ups')
    .select(`
      *,
      lead:leads(id, full_name),
      customer:customers(id, full_name)
    `)
    .eq('tenant_id', tenant.id)
    .order('scheduled_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ follow_ups: data })
}

export async function POST(request: NextRequest) {
  const [supabase, tenant] = await Promise.all([createClient(), getCurrentTenant()])
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { lead_id, customer_id, scheduled_at, type, message_content, assigned_to } = body

  if (!scheduled_at || !type) {
    return NextResponse.json({ error: 'scheduled_at and type are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('follow_ups')
    .insert({
      tenant_id: tenant.id,
      lead_id: lead_id ?? null,
      customer_id: customer_id ?? null,
      scheduled_at,
      type,
      message_content: message_content ?? null,
      assigned_to: assigned_to ?? null,
      status: 'pending',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fire-and-forget: email the assigned user if they have an email address
  if (assigned_to) {
    ;(async () => {
      try {
        const { data: staffUser } = await supabase
          .from('tenant_users')
          .select('email, full_name')
          .eq('id', assigned_to)
          .single()

        if (!staffUser?.email) return

        // Resolve lead or customer name and phone
        let contactName = 'Unknown'
        let contactPhone = ''
        let contactId: string | undefined

        if (lead_id) {
          const { data: lead } = await supabase
            .from('leads')
            .select('full_name, phone, id')
            .eq('id', lead_id)
            .single()
          if (lead) {
            contactName = lead.full_name
            contactPhone = lead.phone
            contactId = lead.id
          }
        } else if (customer_id) {
          const { data: customer } = await supabase
            .from('customers')
            .select('full_name, phone, id')
            .eq('id', customer_id)
            .single()
          if (customer) {
            contactName = customer.full_name
            contactPhone = customer.phone
          }
        }

        const scheduledLabel = new Date(scheduled_at).toLocaleString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })

        await sendFollowUpReminder({
          to: staffUser.email,
          staffName: staffUser.full_name,
          leadName: contactName,
          leadPhone: contactPhone,
          followUpMessage: message_content ?? 'No message specified.',
          scheduledAt: scheduledLabel,
          leadId: contactId,
          storeName: tenant.branding?.store_name || tenant.name,
          primaryColor: tenant.branding?.primary_color,
        })
      } catch (emailErr) {
        console.error('[follow-ups:email]', emailErr)
      }
    })().catch(console.error)
  }

  return NextResponse.json({ follow_up: data }, { status: 201 })
}
