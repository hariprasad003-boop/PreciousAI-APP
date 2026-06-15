import { createAdminClient as createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import { formatDate } from '@/lib/utils'
import { MessageCircle, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import InboxReply from '@/components/inbox/inbox-reply'

export default async function InboxPage() {
  const [supabase, tenant] = await Promise.all([createClient(), getCurrentTenant()])
  if (!tenant) return null

  // Get unique conversations (most recent message per phone number)
  const { data: messages } = await supabase
    .from('whatsapp_messages')
    .select(`
      id, from_number, to_number, content, direction,
      created_at, read_at, message_type,
      lead:leads(id, full_name, stage:lead_stages(name, color))
    `)
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })
    .limit(200)

  // Group into conversations by phone number
  const convMap = new Map<string, any>()
  for (const msg of (messages ?? [])) {
    const phone = msg.direction === 'inbound' ? msg.from_number : msg.to_number
    if (!convMap.has(phone)) convMap.set(phone, { phone, messages: [], lead: msg.lead })
    convMap.get(phone).messages.push(msg)
  }
  const conversations = Array.from(convMap.values())

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-white">WhatsApp Inbox</h1>
        <p className="text-charcoal-400 text-sm mt-1">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
      </div>

      {conversations.length === 0 ? (
        <div className="dark-glass rounded-2xl p-12 text-center">
          <MessageCircle className="w-10 h-10 text-charcoal-600 mx-auto mb-4" />
          <p className="text-charcoal-400 text-sm mb-2">No WhatsApp messages yet</p>
          <p className="text-charcoal-500 text-xs mb-6">Connect your WhatsApp Business number to start receiving messages.</p>
          <Link href="/settings" className="inline-flex items-center gap-1.5 text-gold-400 hover:text-gold-300 text-sm">
            Go to Settings <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-0 dark-glass rounded-2xl overflow-hidden">
          {/* Conversation list */}
          <div className="border-r border-charcoal-800 overflow-y-auto max-h-[calc(100vh-200px)]">
            {conversations.map(conv => {
              const lastMsg = conv.messages[0]
              const unread = conv.messages.filter((m: any) => m.direction === 'inbound' && !m.read_at).length
              return (
                <div key={conv.phone} className="px-4 py-3.5 border-b border-charcoal-800 hover:bg-charcoal-800/50 cursor-pointer transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                      <MessageCircle className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-white text-sm font-medium truncate">
                          {conv.lead?.full_name ?? conv.phone}
                        </p>
                        <p className="text-charcoal-500 text-xs flex-shrink-0 ml-2">
                          {formatDate(lastMsg.created_at)}
                        </p>
                      </div>
                      <p className="text-charcoal-400 text-xs truncate">{lastMsg.content}</p>
                      {conv.lead?.stage && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: conv.lead.stage.color }} />
                          <span className="text-charcoal-500 text-xs">{conv.lead.stage.name}</span>
                        </div>
                      )}
                    </div>
                    {unread > 0 && (
                      <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">{unread}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Message thread + reply */}
          <div className="lg:col-span-2 flex flex-col">
            {conversations[0] ? (
              <InboxReply
                conversation={conversations[0]}
                tenantId={tenant.id}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-charcoal-500 text-sm">Select a conversation</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
