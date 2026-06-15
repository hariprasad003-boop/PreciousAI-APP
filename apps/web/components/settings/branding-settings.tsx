'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Palette } from 'lucide-react'

const GOLD_SHADES = [
  { label: 'Classic Gold', value: '#C9A84C' },
  { label: 'Rose Gold', value: '#C8856A' },
  { label: 'Deep Gold', value: '#A0722A' },
  { label: 'Platinum', value: '#8E9EAB' },
  { label: 'Ruby', value: '#9B2335' },
  { label: 'Emerald', value: '#1A6B4A' },
]

interface BrandingSettingsProps {
  branding: {
    store_name?: string
    primary_color?: string
    accent_color?: string
    logo_url?: string
  }
}

export default function BrandingSettings({ branding }: BrandingSettingsProps) {
  const router = useRouter()
  const [storeName, setStoreName] = useState(branding.store_name ?? '')
  const [primaryColor, setPrimaryColor] = useState(branding.primary_color ?? '#C9A84C')
  const [loading, setLoading] = useState(false)

  async function save() {
    setLoading(true)
    try {
      const res = await fetch('/api/tenants/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_name: storeName, primary_color: primaryColor }),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast.success('Branding updated')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dark-glass rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 bg-gold-500/10 rounded-lg flex items-center justify-center">
          <Palette className="w-4 h-4 text-gold-500" />
        </div>
        <h2 className="font-display text-base font-semibold text-white">Branding</h2>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-xs text-charcoal-400 mb-1.5">Store display name</label>
          <input
            value={storeName}
            onChange={e => setStoreName(e.target.value)}
            className="w-full bg-charcoal-800 border border-charcoal-700 focus:border-gold-500 rounded-lg px-3 py-2 text-white text-sm outline-none transition-colors"
            placeholder="Gold Palace Dubai"
          />
        </div>

        <div>
          <label className="block text-xs text-charcoal-400 mb-2">Primary colour</label>
          <div className="grid grid-cols-6 gap-2">
            {GOLD_SHADES.map(shade => (
              <button
                key={shade.value}
                onClick={() => setPrimaryColor(shade.value)}
                title={shade.label}
                className={`w-full aspect-square rounded-lg transition-all ${
                  primaryColor === shade.value
                    ? 'ring-2 ring-white ring-offset-2 ring-offset-charcoal-900'
                    : 'hover:scale-110'
                }`}
                style={{ backgroundColor: shade.value }}
              />
            ))}
          </div>
          <p className="text-charcoal-500 text-xs mt-2">Selected: {primaryColor}</p>
        </div>

        <button
          onClick={save}
          disabled={loading}
          className="flex items-center gap-2 bg-gold-500 hover:bg-gold-400 disabled:opacity-60 text-charcoal-900 font-semibold px-5 py-2 rounded-lg text-sm transition-all"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Save branding
        </button>
      </div>
    </div>
  )
}
