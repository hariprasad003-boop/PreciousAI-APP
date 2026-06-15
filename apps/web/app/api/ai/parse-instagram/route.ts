import { NextRequest, NextResponse } from 'next/server'
import { getCurrentTenant } from '@/lib/tenant'
import { tagLeadWithAI } from '@/lib/services/ai'

export async function POST(request: NextRequest) {
  const tenant = await getCurrentTenant()
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { text } = await request.json()
  if (!text?.trim()) return NextResponse.json({ error: 'text required' }, { status: 400 })

  const profile = await tagLeadWithAI(text, tenant.currency)
  return NextResponse.json({ profile })
}
