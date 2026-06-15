import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { tagLeadWithAI } from '@/lib/services/ai'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Webhook verification (GET)
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode !== 'subscribe') {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
  }

  // Check token against all active tenants' verify tokens
  const { data: configs } = await supabaseAdmin
    .from('tenant_whatsapp_configs')
    .select('verify_token')
    .eq('is_active', true)

  const validToken = configs?.some(c => c.verify_token === token)
    || token === process.env.META_WEBHOOK_VERIFY_TOKEN

  if (!validToken) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return new NextResponse(challenge, { status: 200 })
}

// Inbound messages (POST)
export async function POST(request: NextRequest) {
  const body = await request.json()

  // Validate Meta webhook signature (basic check)
  if (body.object !== 'whatsapp_business_account') {
    return NextResponse.json({ status: 'ignored' })
  }

  for (const entry of (body.entry ?? [])) {
    for (const change of (entry.changes ?? [])) {
      if (change.field !== 'messages') continue

      const value = change.value
      const phoneNumberId = value?.metadata?.phone_number_id
      if (!phoneNumberId) continue

      // Route to correct tenant
      const { data: config } = await supabaseAdmin
        .from('tenant_whatsapp_configs')
        .select('tenant_id, tenants(plan, currency, country_code)')
        .eq('phone_number_id', phoneNumberId)
        .eq('is_active', true)
        .single()

      if (!config) continue

      const tenantId = config.tenant_id
      const tenantPlan = (config.tenants as any)?.plan ?? 'starter'
      const currency = (config.tenants as any)?.currency ?? 'AED'

      for (const message of (value?.messages ?? [])) {
        if (message.type !== 'text') continue

        const fromNumber = message.from
        const text = message.text?.body ?? ''
        const waMessageId = message.id

        // Deduplicate
        const { data: existing } = await supabaseAdmin
          .from('whatsapp_messages')
          .select('id')
          .eq('wa_message_id', waMessageId)
          .single()

        if (existing) continue

        // Find or create lead
        let leadId: string | null = null
        const { data: existingLead } = await supabaseAdmin
          .from('leads')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('phone', fromNumber)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (existingLead) {
          leadId = existingLead.id
        } else {
          // Get default stage (New)
          const { data: stages } = await supabaseAdmin
            .from('lead_stages')
            .select('id, order_index')
            .eq('tenant_id', tenantId)
            .order('order_index')
            .limit(1)

          const defaultStageId = stages?.[0]?.id
          if (defaultStageId) {
            const { data: newLead } = await supabaseAdmin
              .from('leads')
              .insert({
                tenant_id: tenantId,
                stage_id: defaultStageId,
                full_name: `WhatsApp ${fromNumber}`,
                phone: fromNumber,
                source: 'whatsapp',
                raw_message: text,
              })
              .select('id')
              .single()

            if (newLead) leadId = newLead.id

            // AI tag if Pro/Enterprise
            if (leadId && text && ['pro', 'enterprise'].includes(tenantPlan)) {
              const aiProfile = await tagLeadWithAI(text, currency)
              if (aiProfile && leadId) {
                await supabaseAdmin
                  .from('leads')
                  .update({
                    intent_score: aiProfile.intent_score,
                    tags: aiProfile.tags ?? [],
                    category_interest: aiProfile.category_interest ?? [],
                    budget_amount: aiProfile.budget?.amount ?? null,
                    occasion: aiProfile.occasion ?? null,
                  })
                  .eq('id', leadId)
              }
            }
          }
        }

        // Store the message
        await supabaseAdmin.from('whatsapp_messages').insert({
          tenant_id: tenantId,
          wa_message_id: waMessageId,
          direction: 'inbound',
          from_number: fromNumber,
          to_number: phoneNumberId,
          message_type: 'text',
          content: text,
          lead_id: leadId,
        })

        // Update lead last_contacted_at
        if (leadId) {
          await supabaseAdmin
            .from('leads')
            .update({ last_contacted_at: new Date().toISOString() })
            .eq('id', leadId)
        }
      }
    }
  }

  return NextResponse.json({ status: 'ok' })
}
