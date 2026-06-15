import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient as createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function POST(req: NextRequest) {
  const [supabase, tenant] = await Promise.all([createClient(), getCurrentTenant()])
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { lead_id } = body

  if (!lead_id) {
    return NextResponse.json({ error: 'lead_id is required' }, { status: 400 })
  }

  // Fetch lead with interactions
  const { data: lead, error: leadError } = await supabase
    .from('leads')
    .select(`
      *,
      stage:lead_stages(name),
      interactions(type, content, created_at)
    `)
    .eq('id', lead_id)
    .eq('tenant_id', tenant.id)
    .single()

  if (leadError || !lead) {
    return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
  }

  const stage = (lead.stage as any)?.name ?? 'Unknown'
  const lastContacted = lead.last_contacted_at
    ? new Date(lead.last_contacted_at).toLocaleDateString('en-GB')
    : 'Never'

  const recentInteractions = ((lead.interactions as any[]) ?? [])
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map((i: any) => `${i.type}: ${i.content ?? '—'}`)
    .join('\n')

  const prompt = `You are a jewelry sales assistant. Given this lead data, suggest the top 3 follow-up actions.

Lead: ${lead.full_name}
Stage: ${stage}
Last contacted: ${lastContacted}
Occasion: ${lead.occasion ?? 'Not specified'}
Budget: ${lead.budget_amount ? `${lead.budget_currency ?? tenant.currency} ${lead.budget_amount}` : 'Not specified'}
Category interest: ${(lead.category_interest as string[] | null)?.join(', ') ?? 'Not specified'}
Tags: ${(lead.tags as string[] | null)?.join(', ') ?? 'None'}
Recent interactions:
${recentInteractions || 'None recorded'}

Return ONLY a raw JSON object (no markdown, no code fences):
{
  "suggestions": [
    {
      "type": "whatsapp" | "call" | "visit",
      "message": "<the actual message or talking points to use>",
      "scheduled_for": "2 days" | "1 week" | "2 weeks",
      "reason": "<why this action at this time>"
    }
  ]
}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : null
    if (!text) return NextResponse.json({ error: 'AI returned no content' }, { status: 500 })

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'AI returned invalid JSON' }, { status: 500 })

    const parsed = JSON.parse(jsonMatch[0])

    // Convert "2 days" / "1 week" / "2 weeks" to ISO dates
    const suggestions = (parsed.suggestions ?? []).map((s: any) => {
      const now = new Date()
      let scheduledFor: Date

      if (s.scheduled_for === '2 days') {
        scheduledFor = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
      } else if (s.scheduled_for === '1 week') {
        scheduledFor = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      } else if (s.scheduled_for === '2 weeks') {
        scheduledFor = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
      } else {
        // Fallback: parse as relative offset
        scheduledFor = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
      }

      return {
        type: s.type,
        message: s.message,
        scheduled_for: s.scheduled_for,
        scheduled_at: scheduledFor.toISOString(),
        reason: s.reason,
      }
    })

    return NextResponse.json({ suggestions, lead_id })
  } catch (err: any) {
    console.error('[ai:suggest-followups]', err)
    return NextResponse.json({ error: 'AI request failed' }, { status: 500 })
  }
}
