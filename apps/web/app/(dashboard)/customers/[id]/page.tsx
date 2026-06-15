import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient as createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import { formatCurrency, formatDate, getInitials } from '@/lib/utils'
import { ArrowLeft, Star, Gift, Heart, ShoppingBag, Phone, Mail } from 'lucide-react'
import AddPurchaseModal from '@/components/customers/add-purchase-modal'
import AddFollowUpModal from '@/components/leads/add-followup-modal'

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [supabase, tenant] = await Promise.all([createClient(), getCurrentTenant()])
  if (!tenant) return null

  const { data: customer } = await supabase
    .from('customers')
    .select(`
      *,
      family_members:customer_family(*),
      purchase_history(*),
      interactions(*),
      ai_score(*),
      lead:leads(id, source, stage:lead_stages(name, color))
    `)
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .single()

  if (!customer) notFound()

  const branding = tenant.branding as any
  const aiScore = (customer as any).ai_score
  const purchases = ((customer as any).purchase_history ?? []) as any[]
  const family = ((customer as any).family_members ?? []) as any[]
  const interactions = ((customer as any).interactions ?? []) as any[]

  const nextBirthday = customer.dob
    ? getNextOccurrence(new Date(customer.dob))
    : null
  const nextAnniversary = customer.anniversary_date
    ? getNextOccurrence(new Date(customer.anniversary_date))
    : null

  return (
    <div className="animate-fade-in max-w-5xl">
      <Link href="/customers" className="inline-flex items-center gap-1.5 text-charcoal-400 hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to customers
      </Link>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left — main profile */}
        <div className="lg:col-span-2 space-y-5">
          {/* Header card */}
          <div className="dark-glass rounded-2xl p-6">
            <div className="flex items-start gap-4 mb-5">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold font-display flex-shrink-0"
                style={{ backgroundColor: (branding?.primary_color ?? '#C9A84C') + '33', color: branding?.primary_color ?? '#C9A84C' }}
              >
                {getInitials(customer.full_name)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="font-display text-xl font-bold text-white">{customer.full_name}</h1>
                  {customer.is_vip && (
                    <span className="flex items-center gap-1 text-xs bg-gold-500/20 text-gold-400 px-2 py-0.5 rounded-full">
                      <Star className="w-3 h-3 fill-gold-400" /> VIP
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 text-charcoal-400 text-sm">
                  <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{customer.country_code} {customer.phone}</span>
                  {customer.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{customer.email}</span>}
                </div>
              </div>
              <p className="font-display text-2xl font-bold text-gold-400">
                {formatCurrency(customer.lifetime_value ?? 0, tenant.currency)}
              </p>
            </div>

            {/* Key dates */}
            <div className="grid grid-cols-2 gap-3">
              {customer.dob && (
                <div className="bg-charcoal-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Gift className="w-3.5 h-3.5 text-pink-400" />
                    <p className="text-charcoal-400 text-xs">Birthday</p>
                  </div>
                  <p className="text-white text-sm">{formatDate(customer.dob)}</p>
                  {nextBirthday && <p className="text-pink-400 text-xs mt-0.5">In {nextBirthday} days</p>}
                </div>
              )}
              {customer.anniversary_date && (
                <div className="bg-charcoal-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Heart className="w-3.5 h-3.5 text-red-400" />
                    <p className="text-charcoal-400 text-xs">Anniversary</p>
                  </div>
                  <p className="text-white text-sm">{formatDate(customer.anniversary_date)}</p>
                  {nextAnniversary && <p className="text-red-400 text-xs mt-0.5">In {nextAnniversary} days</p>}
                </div>
              )}
            </div>

            {/* Preferences */}
            {((customer.metal_pref as string[])?.length > 0 || (customer.stone_pref as string[])?.length > 0) && (
              <div className="mt-4 space-y-2">
                {(customer.metal_pref as string[])?.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-charcoal-500 text-xs">Metal:</span>
                    {(customer.metal_pref as string[]).map(p => (
                      <span key={p} className="text-xs bg-charcoal-800 text-charcoal-300 px-2 py-0.5 rounded-full capitalize">{p.replace('_', ' ')}</span>
                    ))}
                  </div>
                )}
                {(customer.stone_pref as string[])?.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-charcoal-500 text-xs">Stone:</span>
                    {(customer.stone_pref as string[]).map(p => (
                      <span key={p} className="text-xs bg-charcoal-800 text-charcoal-300 px-2 py-0.5 rounded-full capitalize">{p}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {customer.notes && (
              <p className="mt-4 text-charcoal-400 text-sm italic border-t border-charcoal-800 pt-4">
                "{customer.notes}"
              </p>
            )}
          </div>

          {/* Purchase history */}
          <div className="dark-glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-base font-semibold text-white flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-gold-500" /> Purchase History
              </h2>
              <AddPurchaseModal customerId={id} currency={tenant.currency} />
            </div>
            {purchases.length === 0 ? (
              <p className="text-charcoal-500 text-sm">No purchases recorded yet.</p>
            ) : (
              <div className="space-y-3">
                {purchases.map((p: any) => (
                  <div key={p.id} className="flex items-start justify-between gap-3 py-2 border-b border-charcoal-800 last:border-0">
                    <div>
                      <p className="text-white text-sm font-medium">{p.item_description ?? p.category ?? 'Purchase'}</p>
                      <p className="text-charcoal-500 text-xs">{formatDate(p.purchase_date)}{p.occasion && ` · ${p.occasion}`}</p>
                    </div>
                    <p className="text-gold-400 font-medium text-sm flex-shrink-0">
                      {formatCurrency(p.amount, p.currency ?? tenant.currency)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">
          {/* Actions */}
          <div className="dark-glass rounded-2xl p-5 space-y-2">
            <h2 className="font-display text-sm font-semibold text-white mb-3">Actions</h2>
            <AddFollowUpModal customerId={id} />
          </div>

          {/* AI Score */}
          {aiScore && (
            <div className="dark-glass rounded-2xl p-5">
              <h2 className="font-display text-sm font-semibold text-white mb-4">AI Insights</h2>
              <div className="space-y-3">
                <ScoreBar label="VIP Score" value={aiScore.vip_score} color="#C9A84C" />
                <ScoreBar label="Churn Risk" value={aiScore.churn_risk} color="#EF4444" invert />
                {aiScore.next_purchase_category && (
                  <div className="bg-charcoal-800 rounded-lg p-3 mt-2">
                    <p className="text-charcoal-400 text-xs mb-1">Next purchase prediction</p>
                    <p className="text-white text-sm font-medium">{aiScore.next_purchase_category}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Family */}
          {family.length > 0 && (
            <div className="dark-glass rounded-2xl p-5">
              <h2 className="font-display text-sm font-semibold text-white mb-3">Family</h2>
              <div className="space-y-2">
                {family.map((member: any) => (
                  <div key={member.id} className="flex items-center gap-3 py-2 border-b border-charcoal-800 last:border-0">
                    <div className="w-7 h-7 rounded-full bg-charcoal-800 flex items-center justify-center text-xs text-charcoal-300 flex-shrink-0">
                      {getInitials(member.name)}
                    </div>
                    <div>
                      <p className="text-white text-sm">{member.name}</p>
                      <p className="text-charcoal-500 text-xs capitalize">{member.relation}</p>
                    </div>
                    {member.dob && (
                      <p className="ml-auto text-charcoal-500 text-xs">{formatDate(member.dob)}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent activity */}
          {interactions.length > 0 && (
            <div className="dark-glass rounded-2xl p-5">
              <h2 className="font-display text-sm font-semibold text-white mb-3">Recent Activity</h2>
              <div className="space-y-3">
                {interactions.slice(0, 5).map((i: any) => (
                  <div key={i.id} className="flex gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-gold-500 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-charcoal-300 text-xs capitalize">{i.type}</p>
                      <p className="text-charcoal-500 text-xs">{formatDate(i.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ScoreBar({ label, value, color, invert = false }: { label: string; value: number; color: string; invert?: boolean }) {
  const displayPct = Math.round(value * 100)
  return (
    <div>
      <div className="flex justify-between mb-1">
        <p className="text-charcoal-400 text-xs">{label}</p>
        <p className="text-white text-xs font-medium">{displayPct}%</p>
      </div>
      <div className="bg-charcoal-800 rounded-full h-1.5">
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${displayPct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

function getNextOccurrence(date: Date): number {
  const today = new Date()
  const next = new Date(today.getFullYear(), date.getMonth(), date.getDate())
  if (next < today) next.setFullYear(today.getFullYear() + 1)
  return Math.ceil((next.getTime() - today.getTime()) / 86400000)
}
