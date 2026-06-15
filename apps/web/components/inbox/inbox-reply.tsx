'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Send, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface InboxReplyProps {
  conversation: {
    phone: string
    messages: Array<{
      id: string
      content: string
      direction: string
      created_at: string
    }>
    lead?: { id: string; full_name: string } | null
  }
  tenantId: string
}

export default function InboxReply({ conversation, tenantId }: InboxReplyProps) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messages = [...conversation.messages].reverse()

  async function sendReply() {
    if (!message.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: conversation.phone, message }),
      })
      if (!res.ok) throw new Error('Failed to send')
      toast.success('Message sent')
      setMessage('')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col h-full min-h-[400px]">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-charcoal-800 flex items-center gap-3">
        <div>
          <p className="text-white font-medium text-sm">{conversation.lead?.full_name ?? conversation.phone}</p>
          <p className="text-charcoal-500 text-xs">{conversation.phone}</p>
        </div>
        {conversation.lead && (
          <a href={`/leads/${conversation.lead.id}`} className="ml-auto text-xs text-gold-400 hover:text-gold-300">
            View lead →
          </a>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs px-4 py-2.5 rounded-2xl text-sm ${
              msg.direction === 'outbound'
                ? 'bg-gold-500 text-charcoal-900 rounded-br-sm'
                : 'bg-charcoal-800 text-white rounded-bl-sm'
            }`}>
              <p>{msg.content}</p>
              <p className={`text-xs mt-1 ${msg.direction === 'outbound' ? 'text-charcoal-700' : 'text-charcoal-500'}`}>
                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Reply input */}
      <div className="p-4 border-t border-charcoal-800 flex gap-3">
        <input
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() } }}
          placeholder="Type a message…"
          className="flex-1 bg-charcoal-800 border border-charcoal-700 focus:border-gold-500 rounded-xl px-4 py-2.5 text-white text-sm outline-none transition-colors placeholder:text-charcoal-500"
        />
        <button
          onClick={sendReply}
          disabled={sending || !message.trim()}
          className="w-10 h-10 rounded-xl bg-gold-500 hover:bg-gold-400 disabled:opacity-50 flex items-center justify-center transition-all"
        >
          {sending ? <Loader2 className="w-4 h-4 text-charcoal-900 animate-spin" /> : <Send className="w-4 h-4 text-charcoal-900" />}
        </button>
      </div>
    </div>
  )
}
