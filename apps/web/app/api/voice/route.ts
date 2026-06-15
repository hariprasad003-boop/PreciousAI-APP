import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentTenant, hasFeature } from '@/lib/tenant'
import { tagLeadWithAI } from '@/lib/services/ai'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
  const tenant = await getCurrentTenant()
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!hasFeature(tenant.plan, 'voiceToCrm')) {
    return NextResponse.json({ error: 'Voice-to-CRM requires Pro or Enterprise plan' }, { status: 403 })
  }

  const formData = await request.formData()
  const audio = formData.get('audio') as File | null

  if (!audio) return NextResponse.json({ error: 'audio file required' }, { status: 400 })

  // Upload audio to Supabase Storage
  const filename = `voice-notes/${tenant.id}/${Date.now()}.webm`
  const arrayBuffer = await audio.arrayBuffer()
  const { data: uploadData, error: uploadError } = await supabaseAdmin
    .storage
    .from('voice-notes')
    .upload(filename, arrayBuffer, { contentType: audio.type || 'audio/webm' })

  if (uploadError) {
    console.error('[voice:upload]', uploadError)
    return NextResponse.json({ error: 'Failed to upload audio' }, { status: 500 })
  }

  // Transcribe via Deepgram REST API
  const deepgramKey = process.env.DEEPGRAM_API_KEY
  if (!deepgramKey) {
    return NextResponse.json({ error: 'Deepgram API key not configured' }, { status: 500 })
  }

  const { data: { publicUrl } } = supabaseAdmin.storage.from('voice-notes').getPublicUrl(filename)

  let transcript = ''
  try {
    const dgRes = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&language=en', {
      method: 'POST',
      headers: {
        Authorization: `Token ${deepgramKey}`,
        'Content-Type': 'audio/webm',
      },
      body: arrayBuffer,
    })
    const dgData = await dgRes.json()
    transcript = dgData?.results?.channels?.[0]?.alternatives?.[0]?.transcript ?? ''
  } catch (err) {
    console.error('[voice:deepgram]', err)
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 })
  }

  if (!transcript) {
    return NextResponse.json({ error: 'Could not transcribe audio — please speak clearly and try again' }, { status: 422 })
  }

  // Parse transcript with Claude
  const aiProfile = await tagLeadWithAI(transcript, tenant.currency)

  return NextResponse.json({
    transcript,
    voice_note_url: publicUrl,
    ai_profile: aiProfile,
  })
}
