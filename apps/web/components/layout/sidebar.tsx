'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, UserCircle, MessageCircle,
  Bell, Settings, Gem, BarChart3, Instagram
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import type { Tenant, TenantUser } from '@preciousai/shared'

const NAV = [
  { label: 'Dashboard', href: '/home', icon: LayoutDashboard },
  { label: 'Leads', href: '/leads', icon: Users },
  { label: 'Customers', href: '/customers', icon: UserCircle },
  { label: 'WhatsApp Inbox', href: '/inbox', icon: MessageCircle },
  { label: 'Follow-ups', href: '/follow-ups', icon: Bell },
  { label: 'Instagram DMs', href: '/instagram', icon: Instagram },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Settings', href: '/settings', icon: Settings },
]

interface SidebarProps {
  tenant: Tenant
  user: TenantUser
}

export default function Sidebar({ tenant, user }: SidebarProps) {
  const pathname = usePathname()
  const branding = tenant.branding as any

  return (
    <aside className="w-60 flex-shrink-0 bg-charcoal-900 border-r border-charcoal-800 flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-4 h-16 flex items-center border-b border-charcoal-800">
        {branding?.logo_url ? (
          <img src={branding.logo_url} alt={tenant.name} className="h-8 object-contain" />
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--tenant-primary)' }}>
              <Gem className="w-4 h-4 text-charcoal-900" />
            </div>
            <span className="font-display font-semibold text-white text-sm truncate max-w-[140px]">
              {branding?.store_name ?? tenant.name}
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
        {NAV.map((item) => {
          const active = pathname === item.href || (item.href !== '/home' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
                active
                  ? 'text-charcoal-900 font-medium'
                  : 'text-charcoal-400 hover:text-white hover:bg-charcoal-800'
              )}
              style={active ? { backgroundColor: 'var(--tenant-primary)' } : {}}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-charcoal-800">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full gold-gradient flex items-center justify-center flex-shrink-0">
            <span className="text-charcoal-900 font-bold text-xs">{getInitials(user.full_name)}</span>
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-medium truncate">{user.full_name}</p>
            <p className="text-charcoal-400 text-xs capitalize">{user.role.replace('_', ' ')}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
