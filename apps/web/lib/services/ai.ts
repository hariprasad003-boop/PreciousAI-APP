import Anthropic from '@anthropic-ai/sdk'
import type { AILeadProfile } from '@preciousai/shared'

const client = new Anthropic()

export async function tagLeadWithAI(rawMessage: string, currency = 'AED'): Promise<AILeadProfile | null> {
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are a CRM assistant for a jewelry and gemstone retail store. Analyze this customer message and extract structured lead information.

Customer message: "${rawMessage}"
Store currency: ${currency}

Return ONLY a raw JSON object with exactly these fields (no markdown, no code fences):
{
  "customer_type": "e.g. Bridal, Gift Buyer, Investment, Self Purchase",
  "budget": { "amount": <number>, "currency": "${currency}" },
  "intent_score": <0.0 to 1.0>,
  "occasion": "e.g. Wedding, Anniversary, Birthday, Eid, Diwali or null",
  "category_interest": ["Rings", "Necklaces", "Bangles", "Earrings", "Watches"],
  "tags": ["Bridal", "High Budget", "Urgent"],
  "recommended_next_action": "what the salesperson should do next"
}`,
        },
      ],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : null
    if (!text) return null

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    return JSON.parse(jsonMatch[0]) as AILeadProfile
  } catch (err) {
    console.error('[ai:tag-lead]', err)
    return null
  }
}

export async function generateFollowUpMessage(
  customerName: string,
  context: string,
  currency = 'AED'
): Promise<string | null> {
  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `Write a short, warm WhatsApp follow-up message for a jewelry store customer.

Customer name: ${customerName}
Context: ${context}
Currency: ${currency}

Write a natural, friendly message (2-3 sentences max). No emojis. No hashtags. Just the message text.`,
        },
      ],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : null
    return text?.trim() ?? null
  } catch (err) {
    console.error('[ai:follow-up]', err)
    return null
  }
}
