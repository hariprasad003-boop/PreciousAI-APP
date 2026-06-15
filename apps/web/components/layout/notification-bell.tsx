'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Bell, X, CheckCheck, ExternalLink, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Notification {
  id: string
  title: string
  body: string | null
  url: string | null
  read: boolean
  created_at: string
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [pushSupported, setPushSupported] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const json = await res.json()
      setNotifications(json.notifications ?? [])
      setUnreadCount(json.unread_count ?? 0)
    } catch {
      // silently fail on background poll
    }
  }, [])

  useEffect(() => {
    // Check push support
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setPushSupported(true)
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) {
          reg.pushManager.getSubscription().then(sub => {
            setPushEnabled(!!sub)
          })
        }
      })
      // Register service worker
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }

    fetchNotifications()

    // Poll every 30 seconds
    intervalRef.current = setInterval(fetchNotifications, 30000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchNotifications])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function handleBellClick() {
    if (!open) {
      setOpen(true)
      await fetchNotifications()
    } else {
      setOpen(false)
    }
  }

  async function enablePush() {
    if (!pushSupported) return
    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        toast.error('Notification permission denied')
        return
      }

      const reg = await navigator.serviceWorker.ready
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        toast.error('Push notifications not configured')
        return
      }

      // Convert VAPID public key (base64url) to Uint8Array
      const padding = '='.repeat((4 - vapidKey.length % 4) % 4)
      const base64 = (vapidKey + padding).replace(/-/g, '+').replace(/_/g, '/')
      const rawKey = Uint8Array.from(atob(base64), c => c.charCodeAt(0))

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: rawKey,
      })

      const json = subscription.toJSON()
      await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: json.keys,
        }),
      })

      setPushEnabled(true)
      toast.success('Push notifications enabled!')
    } catch (err: any) {
      toast.error('Failed to enable push notifications')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function disablePush() {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        const endpoint = sub.endpoint
        await sub.unsubscribe()
        await fetch('/api/notifications/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        })
      }
      setPushEnabled(false)
      toast.success('Push notifications disabled')
    } catch {
      toast.error('Failed to disable push notifications')
    } finally {
      setLoading(false)
    }
  }

  async function markAllRead() {
    await fetch('/api/notifications', { method: 'DELETE' })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: 'PATCH' })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleBellClick}
        className="relative w-8 h-8 rounded-lg bg-charcoal-800 hover:bg-charcoal-700 flex items-center justify-center text-charcoal-400 hover:text-white transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-charcoal-900 border border-charcoal-700 rounded-2xl shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-charcoal-800">
            <span className="text-white font-semibold text-sm">Notifications</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-charcoal-400 hover:text-gold-400 transition-colors"
                  title="Mark all read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-charcoal-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Push toggle */}
          {pushSupported && (
            <div className="px-4 py-2 border-b border-charcoal-800 flex items-center justify-between">
              <span className="text-charcoal-400 text-xs">Browser push</span>
              <button
                onClick={pushEnabled ? disablePush : enablePush}
                disabled={loading}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-all disabled:opacity-50 ${
                  pushEnabled
                    ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                    : 'bg-charcoal-700 text-charcoal-300 hover:text-white'
                }`}
              >
                {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                {pushEnabled ? 'Enabled' : 'Enable'}
              </button>
            </div>
          )}

          {/* Notifications list */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <Bell className="w-6 h-6 text-charcoal-700 mx-auto mb-2" />
                <p className="text-charcoal-500 text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-charcoal-800 last:border-0 flex gap-3 group hover:bg-charcoal-800/50 transition-colors ${
                    !n.read ? 'bg-charcoal-800/30' : ''
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${n.read ? 'bg-transparent' : 'bg-gold-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${n.read ? 'text-charcoal-300' : 'text-white'}`}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-charcoal-400 text-xs mt-0.5 truncate">{n.body}</p>
                    )}
                    <p className="text-charcoal-600 text-xs mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {!n.read && (
                      <button
                        onClick={() => markRead(n.id)}
                        className="text-charcoal-500 hover:text-gold-400 transition-colors opacity-0 group-hover:opacity-100"
                        title="Mark as read"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {n.url && (
                      <a
                        href={n.url}
                        className="text-charcoal-500 hover:text-gold-400 transition-colors opacity-0 group-hover:opacity-100"
                        title="Open"
                        onClick={() => markRead(n.id)}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
