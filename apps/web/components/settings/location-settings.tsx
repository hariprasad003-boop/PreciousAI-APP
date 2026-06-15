'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { MapPin, Plus, Loader2, X, Pencil, Trash2, Star } from 'lucide-react'
import { PLANS } from '@preciousai/shared'
import type { PlanId } from '@preciousai/shared'

interface Location {
  id: string
  name: string
  address: string | null
  city: string | null
  country: string | null
  phone: string | null
  is_active: boolean
  is_primary: boolean
  created_at: string
}

interface LocationSettingsProps {
  locations: Location[]
  plan: PlanId
  tenantId: string
}

const inputCls =
  'w-full bg-charcoal-900 border border-charcoal-700 focus:border-gold-500 rounded-lg px-3 py-2 text-white text-sm outline-none transition-colors placeholder:text-charcoal-500'

function LocationForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: Partial<Location>
  onSave: (data: LocationFormData) => Promise<void>
  onCancel: () => void
  saving: boolean
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [city, setCity] = useState(initial?.city ?? '')
  const [country, setCountry] = useState(initial?.country ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [isPrimary, setIsPrimary] = useState(initial?.is_primary ?? false)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('Location name is required')
      return
    }
    onSave({ name, address, city, country, phone, is_primary: isPrimary })
  }

  return (
    <form onSubmit={submit} className="bg-charcoal-800 rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs text-charcoal-400 mb-1">Location name *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Main Branch"
            className={inputCls}
            required
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-charcoal-400 mb-1">Address</label>
          <input
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="123 Gold Street"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs text-charcoal-400 mb-1">City</label>
          <input
            value={city}
            onChange={e => setCity(e.target.value)}
            placeholder="Dubai"
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs text-charcoal-400 mb-1">Country</label>
          <input
            value={country}
            onChange={e => setCountry(e.target.value)}
            placeholder="UAE"
            className={inputCls}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-charcoal-400 mb-1">Phone</label>
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+971 4 123 4567"
            className={inputCls}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={isPrimary}
          onChange={e => setIsPrimary(e.target.checked)}
          className="w-4 h-4 rounded border-charcoal-600 accent-gold-500"
        />
        <span className="text-sm text-charcoal-300">Set as primary location</span>
      </label>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-gold-500 hover:bg-gold-400 disabled:opacity-60 text-charcoal-900 font-semibold px-4 py-2 rounded-lg text-sm transition-all"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {initial?.id ? 'Save changes' : 'Add location'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-charcoal-400 hover:text-white text-sm px-3 py-2 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

interface LocationFormData {
  name: string
  address: string
  city: string
  country: string
  phone: string
  is_primary: boolean
}

export default function LocationSettings({ locations: initialLocations, plan, tenantId }: LocationSettingsProps) {
  const router = useRouter()
  const [locations, setLocations] = useState<Location[]>(initialLocations)
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const planLimits = PLANS[plan]?.limits ?? PLANS.starter.limits
  const locationLimit = planLimits.locations
  const limitDisplay = locationLimit === Infinity ? '∞' : locationLimit
  const canAdd = locationLimit === Infinity || locations.length < locationLimit

  async function handleAdd(data: LocationFormData) {
    setSavingId('new')
    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error ?? 'Failed to add location')
      toast.success('Location added')
      setAdding(false)
      router.refresh()
      // Refresh local state optimistically
      setLocations(prev => {
        const updated = data.is_primary
          ? prev.map(l => ({ ...l, is_primary: false }))
          : prev
        return [...updated, result.location as Location]
      })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add location')
    } finally {
      setSavingId(null)
    }
  }

  async function handleEdit(id: string, data: LocationFormData) {
    setSavingId(id)
    try {
      const res = await fetch(`/api/locations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error ?? 'Failed to update location')
      toast.success('Location updated')
      setEditingId(null)
      router.refresh()
      setLocations(prev => {
        const updated = data.is_primary
          ? prev.map(l => ({ ...l, is_primary: l.id === id }))
          : prev
        return updated.map(l => (l.id === id ? (result.location as Location) : l))
      })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update location')
    } finally {
      setSavingId(null)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this location? This cannot be undone.')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/locations/${id}`, { method: 'DELETE' })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error ?? 'Failed to delete location')
      toast.success('Location deleted')
      setLocations(prev => prev.filter(l => l.id !== id))
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete location')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="dark-glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
            <MapPin className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold text-white">Locations</h2>
            <p className="text-charcoal-500 text-xs">
              {locations.length} / {limitDisplay} locations
            </p>
          </div>
        </div>
        {canAdd && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 text-xs bg-charcoal-800 hover:bg-charcoal-700 border border-charcoal-700 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add location
          </button>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <div className="mb-4">
          <LocationForm
            onSave={handleAdd}
            onCancel={() => setAdding(false)}
            saving={savingId === 'new'}
          />
        </div>
      )}

      {/* Locations list */}
      {locations.length === 0 && !adding ? (
        <div className="text-center py-8">
          <MapPin className="w-8 h-8 text-charcoal-700 mx-auto mb-3" />
          <p className="text-charcoal-400 text-sm mb-1">No locations yet</p>
          <p className="text-charcoal-600 text-xs">Add your first store location to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {locations.map(location => (
            <div key={location.id}>
              {editingId === location.id ? (
                <LocationForm
                  initial={location}
                  onSave={data => handleEdit(location.id, data)}
                  onCancel={() => setEditingId(null)}
                  saving={savingId === location.id}
                />
              ) : (
                <div className="flex items-start gap-3 py-3 border-b border-charcoal-800 last:border-0">
                  <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-white text-sm font-medium">{location.name}</p>
                      {location.is_primary && (
                        <span className="flex items-center gap-1 text-xs bg-gold-500/10 text-gold-400 px-2 py-0.5 rounded-full">
                          <Star className="w-3 h-3 fill-gold-400" /> Primary
                        </span>
                      )}
                      {!location.is_active && (
                        <span className="text-xs bg-charcoal-800 text-charcoal-500 px-2 py-0.5 rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>
                    {(location.address || location.city || location.country) && (
                      <p className="text-charcoal-400 text-xs">
                        {[location.address, location.city, location.country].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {location.phone && (
                      <p className="text-charcoal-500 text-xs mt-0.5">{location.phone}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setEditingId(location.id)}
                      className="p-1.5 text-charcoal-400 hover:text-white hover:bg-charcoal-800 rounded-lg transition-colors"
                      title="Edit location"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(location.id)}
                      disabled={deletingId === location.id}
                      className="p-1.5 text-charcoal-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                      title="Delete location"
                    >
                      {deletingId === location.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!canAdd && (
        <p className="text-charcoal-500 text-xs mt-4 text-center">
          Location limit reached ({limitDisplay} on {plan} plan).{' '}
          <a href="/settings/billing" className="text-gold-400 hover:text-gold-300">
            Upgrade your plan
          </a>{' '}
          to add more.
        </p>
      )}
    </div>
  )
}
