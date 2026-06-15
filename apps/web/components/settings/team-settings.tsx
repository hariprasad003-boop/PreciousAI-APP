'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Users, Plus, Loader2, X } from 'lucide-react'
import { getInitials } from '@/lib/utils'
import { PLANS } from '@preciousai/shared'
import type { PlanId } from '@preciousai/shared'

interface TeamMember {
  id: string
  full_name: string
  email: string
  role: string
  is_active: boolean
  created_at: string
}

interface TeamSettingsProps {
  users: TeamMember[]
  plan: PlanId
  tenantId: string
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  manager: 'Manager',
  sales_staff: 'Sales Staff',
  readonly: 'Read Only',
}

export default function TeamSettings({ users, plan, tenantId }: TeamSettingsProps) {
  const router = useRouter()
  const [inviting, setInviting] = useState(false)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('sales_staff')
  const [loading, setLoading] = useState(false)

  const planLimits = PLANS[plan]?.limits ?? PLANS.starter.limits
  const seatLimit = planLimits.seats === Infinity ? '∞' : planLimits.seats
  const canAdd = planLimits.seats === Infinity || users.length < planLimits.seats

  async function inviteUser() {
    if (!email || !fullName) return
    setLoading(true)
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, full_name: fullName, role }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to invite')
      toast.success(`Invitation sent to ${email}`)
      setEmail('')
      setFullName('')
      setInviting(false)
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dark-glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-white">Team</h2>
            <p className="text-charcoal-500 text-xs">{users.length} / {seatLimit} seats</p>
          </div>
        </div>
        {canAdd && !inviting && (
          <button
            onClick={() => setInviting(true)}
            className="flex items-center gap-1.5 text-xs bg-charcoal-800 hover:bg-charcoal-700 border border-charcoal-700 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Invite member
          </button>
        )}
      </div>

      {/* Invite form */}
      {inviting && (
        <div className="bg-charcoal-800 rounded-xl p-4 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-white text-sm font-medium">Invite team member</p>
            <button onClick={() => setInviting(false)} className="text-charcoal-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            placeholder="Full name"
            className="w-full bg-charcoal-900 border border-charcoal-700 focus:border-gold-500 rounded-lg px-3 py-2 text-white text-sm outline-none transition-colors"
          />
          <input
            value={email}
            onChange={e => setEmail(e.target.value)}
            type="email"
            placeholder="Email address"
            className="w-full bg-charcoal-900 border border-charcoal-700 focus:border-gold-500 rounded-lg px-3 py-2 text-white text-sm outline-none transition-colors"
          />
          <select
            value={role}
            onChange={e => setRole(e.target.value)}
            className="w-full bg-charcoal-900 border border-charcoal-700 focus:border-gold-500 rounded-lg px-3 py-2 text-white text-sm outline-none transition-colors"
          >
            <option value="manager">Manager</option>
            <option value="sales_staff">Sales Staff</option>
            <option value="readonly">Read Only</option>
          </select>
          <button
            onClick={inviteUser}
            disabled={loading || !email || !fullName}
            className="w-full flex items-center justify-center gap-2 bg-gold-500 hover:bg-gold-400 disabled:opacity-60 text-charcoal-900 font-semibold py-2 rounded-lg text-sm transition-all"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Send invitation
          </button>
        </div>
      )}

      {/* Team list */}
      <div className="space-y-2">
        {users.map(user => (
          <div key={user.id} className="flex items-center gap-3 py-2.5 border-b border-charcoal-800 last:border-0">
            <div className="w-8 h-8 rounded-full gold-gradient flex items-center justify-center flex-shrink-0">
              <span className="text-charcoal-900 font-bold text-xs">{getInitials(user.full_name)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{user.full_name}</p>
              <p className="text-charcoal-500 text-xs truncate">{user.email}</p>
            </div>
            <span className="text-xs bg-charcoal-800 text-charcoal-400 px-2 py-0.5 rounded-full capitalize flex-shrink-0">
              {ROLE_LABELS[user.role] ?? user.role}
            </span>
          </div>
        ))}
      </div>

      {!canAdd && (
        <p className="text-charcoal-500 text-xs mt-4 text-center">
          Seat limit reached. <a href="/settings/billing" className="text-gold-400 hover:text-gold-300">Upgrade your plan</a> to add more.
        </p>
      )}
    </div>
  )
}
