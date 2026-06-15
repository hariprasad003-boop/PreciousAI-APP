'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Palette, Upload, X, Image as ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const GOLD_SHADES = [
  { label: 'Classic Gold', value: '#C9A84C' },
  { label: 'Rose Gold', value: '#C8856A' },
  { label: 'Deep Gold', value: '#A0722A' },
  { label: 'Platinum', value: '#8E9EAB' },
  { label: 'Ruby', value: '#9B2335' },
  { label: 'Emerald', value: '#1A6B4A' },
]

const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

interface BrandingSettingsProps {
  branding: {
    store_name?: string
    primary_color?: string
    accent_color?: string
    logo_url?: string
  }
  tenantId: string
}

const supabaseBrowser = createClient()

export default function BrandingSettings({ branding, tenantId }: BrandingSettingsProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [storeName, setStoreName] = useState(branding.store_name ?? '')
  const [primaryColor, setPrimaryColor] = useState(branding.primary_color ?? '#C9A84C')
  const [logoUrl, setLogoUrl] = useState(branding.logo_url ?? '')
  const [loading, setLoading] = useState(false)
  const [logoUploading, setLogoUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  async function uploadLogo(file: File) {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Only PNG, JPG, and WebP files are allowed')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Logo must be under 2MB')
      return
    }

    setLogoUploading(true)
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png'
      const path = `${tenantId}/logo.${ext}`

      const { error: uploadError } = await supabaseBrowser.storage
        .from('tenant-assets')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (uploadError) throw new Error(uploadError.message)

      const { data: { publicUrl } } = supabaseBrowser.storage
        .from('tenant-assets')
        .getPublicUrl(path)

      // Add cache-buster so the preview refreshes
      const urlWithBust = `${publicUrl}?t=${Date.now()}`

      const res = await fetch('/api/tenants/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logo_url: publicUrl }),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error ?? 'Failed to save logo URL')
      }

      setLogoUrl(urlWithBust)
      toast.success('Logo uploaded')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setLogoUploading(false)
    }
  }

  async function removeLogo() {
    setLogoUploading(true)
    try {
      const res = await fetch('/api/tenants/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logo_url: null }),
      })
      if (!res.ok) throw new Error('Failed to remove logo')
      setLogoUrl('')
      toast.success('Logo removed')
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove logo')
    } finally {
      setLogoUploading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadLogo(file)
    e.target.value = ''
  }

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) uploadLogo(file)
  // uploadLogo is stable within the component lifetime
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

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
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
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
        {/* Logo upload */}
        <div>
          <label className="block text-xs text-charcoal-400 mb-2">Store logo</label>

          {logoUrl ? (
            <div className="flex items-start gap-4">
              <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-charcoal-800 border border-charcoal-700 flex items-center justify-center flex-shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoUrl} alt="Store logo" className="w-full h-full object-contain p-2" />
              </div>
              <div className="flex flex-col gap-2 mt-1">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={logoUploading}
                  className="flex items-center gap-1.5 text-xs bg-charcoal-800 hover:bg-charcoal-700 border border-charcoal-700 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
                >
                  {logoUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Replace logo
                </button>
                <button
                  onClick={removeLogo}
                  disabled={logoUploading}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 disabled:opacity-60 transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => !logoUploading && fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${
                dragOver
                  ? 'border-gold-500 bg-gold-500/5'
                  : 'border-charcoal-700 hover:border-charcoal-600 bg-charcoal-800/50'
              } ${logoUploading ? 'pointer-events-none opacity-60' : ''}`}
            >
              {logoUploading ? (
                <Loader2 className="w-6 h-6 text-gold-500 animate-spin" />
              ) : (
                <ImageIcon className="w-6 h-6 text-charcoal-500" />
              )}
              <p className="text-charcoal-400 text-sm text-center">
                {logoUploading ? 'Uploading…' : 'Click or drag & drop your logo'}
              </p>
              <p className="text-charcoal-600 text-xs">PNG, JPG, WebP · max 2MB</p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

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
