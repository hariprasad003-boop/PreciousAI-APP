import { createAdminClient as createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import { formatDate } from '@/lib/utils'
import { Bell, CheckCircle, Clock, MessageCircle, Phone, Mail } from 'lucide-react'
import FollowUpActions from '@/components/follow-ups/follow-up-actions'

const TYPE_ICONS: Record<string, React.ElementType> = {
  whatsapp: MessageCircle,
  call: Phone,
  email: Mail,
  visit: Bell,
}

const TYPE_COLORS: Record<string, string> = {
  whatsapp: 'text-emerald-400',
  call: 'text-blue-400',
  email: 'text-purple-400',
  visit: 'text-amber-400',
}

export default async function FollowUpsPage() {
  const [supabase, tenant] = await Promise.all([createClient(), getCurrentTenant()])
  if (!tenant) return null

  const now = new Date()
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)

  const [{ data: due }, { data: upcoming }, { data: completed }] = await Promise.all([
    supabase
      .from('follow_ups')
      .select(`
        id, type, scheduled_at, message_content, status,
        lead:leads(id, full_name, phone, country_code),
        customer:customers(id, full_name, phone, country_code),
        assignee:tenant_users(full_name)
      `)
      .eq('tenant_id', tenant.id)
      .eq('status', 'pending')
      .lte('scheduled_at', todayEnd.toISOString())
      .order('scheduled_at'),

    supabase
      .from('follow_ups')
      .select(`
        id, type, scheduled_at, message_content, status,
        lead:leads(id, full_name, phone),
        customer:customers(id, full_name, phone)
      `)
      .eq('tenant_id', tenant.id)
      .eq('status', 'pending')
      .gt('scheduled_at', todayEnd.toISOString())
      .order('scheduled_at')
      .limit(20),

    supabase
      .from('follow_ups')
      .select(`
        id, type, scheduled_at, status,
        lead:leads(id, full_name),
        customer:customers(id, full_name)
      `)
      .eq('tenant_id', tenant.id)
      .in('status', ['done', 'sent'])
      .order('scheduled_at', { ascending: false })
      .limit(10),
  ])

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Follow-ups</h1>
          <p className="text-charcoal-400 text-sm mt-1">
            {due?.length ?? 0} due today · {upcoming?.length ?? 0} upcoming
          </p>
        </div>
      </div>

      {/* Due today */}
      <section>
        <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" /> Due Today
          {(due?.length ?? 0) > 0 && (
            <span className="bg-amber-400/20 text-amber-400 text-xs px-2 py-0.5 rounded-full">{due!.length}</span>
          )}
        </h2>
        {!due || due.length === 0 ? (
          <div className="dark-glass rounded-xl p-6 text-center">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-charcoal-400 text-sm">All caught up! No follow-ups due today.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {due.map(fu => (
              <FollowUpCard key={fu.id} followUp={fu as any} showActions />
            ))}
          </div>
        )}
      </section>

      {/* Upcoming */}
      {upcoming && upcoming.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Bell className="w-4 h-4 text-charcoal-400" /> Upcoming
          </h2>
          <div className="space-y-3">
            {upcoming.map(fu => (
              <FollowUpCard key={fu.id} followUp={fu as any} />
            ))}
          </div>
        </section>
      )}

      {/* Recently completed */}
      {completed && completed.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-charcoal-500 mb-3">Recently completed</h2>
          <div className="space-y-2">
            {completed.map(fu => (
              <FollowUpCard key={fu.id} followUp={fu as any} muted />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function FollowUpCard({ followUp: fu, showActions = false, muted = false }: {
  followUp: any
  showActions?: boolean
  muted?: boolean
}) {
  const Icon = TYPE_ICONS[fu.type] ?? Bell
  const iconColor = muted ? 'text-charcoal-600' : (TYPE_COLORS[fu.type] ?? 'text-charcoal-400')
  const contactName = fu.lead?.full_name ?? fu.customer?.full_name ?? 'Unknown'
  const contactId = fu.lead?.id ? `/leads/${fu.lead.id}` : fu.customer?.id ? `/customers/${fu.customer.id}` : null

  return (
    <div className={`dark-glass rounded-xl p-4 flex items-start gap-4 ${muted ? 'opacity-60' : ''}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${muted ? 'bg-charcoal-800' : 'bg-charcoal-800'}`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {contactId ? (
            <a href={contactId} className="text-white font-medium text-sm hover:text-gold-400 transition-colors">{contactName}</a>
          ) : (
            <p className="text-white font-medium text-sm">{contactName}</p>
          )}
          <span className={`text-xs capitalize px-2 py-0.5 rounded-full ${
            fu.status === 'done' || fu.status === 'sent'
              ? 'bg-emerald-500/10 text-emerald-400'
              : 'bg-amber-500/10 text-amber-400'
          }`}>
            {fu.status}
          </span>
        </div>
        <p className="text-charcoal-400 text-xs capitalize">{fu.type} · {formatDate(fu.scheduled_at)}</p>
        {fu.message_content && (
          <p className="text-charcoal-300 text-xs mt-1 italic truncate">"{fu.message_content}"</p>
        )}
      </div>
      {showActions && (
        <FollowUpActions
          followUpId={fu.id}
          leadId={fu.lead?.id}
          leadPhone={fu.lead?.phone ?? fu.customer?.phone}
          leadCountryCode={fu.lead?.country_code}
          messageContent={fu.message_content}
        />
      )}
    </div>
  )
}
