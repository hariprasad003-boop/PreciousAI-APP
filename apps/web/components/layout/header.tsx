'use client'

import { useRouter } from 'next/navigation'
import { Bell, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Tenant, TenantUser } from '@preciousai/shared'
import VoiceRecorder from '@/components/leads/voice-recorder'

interface HeaderProps {
  tenant: Tenant
  user: TenantUser
  stages: { id: string; name: string; order_index: number }[]
}

export default function DashboardHeader({ tenant, user, stages }: HeaderProps) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Signed out')
    router.push('/')
  }

  return (
    <header className="h-14 bg-charcoal-900 border-b border-charcoal-800 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-xs text-charcoal-500 font-mono">{tenant.subdomain}.preciousai.app</span>
        <span className="text-xs bg-gold-500/20 text-gold-400 px-2 py-0.5 rounded-full capitalize">{tenant.plan}</span>
      </div>
      <div className="flex items-center gap-2">
        <VoiceRecorder stages={stages} countryCode={tenant.country_code} />
        <button className="w-8 h-8 rounded-lg bg-charcoal-800 hover:bg-charcoal-700 flex items-center justify-center text-charcoal-400 hover:text-white transition-colors">
          <Bell className="w-4 h-4" />
        </button>
        <button
          onClick={handleSignOut}
          className="w-8 h-8 rounded-lg bg-charcoal-800 hover:bg-charcoal-700 flex items-center justify-center text-charcoal-400 hover:text-red-400 transition-colors"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  )
}
