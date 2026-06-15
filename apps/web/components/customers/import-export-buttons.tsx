'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Upload, Download, Loader2 } from 'lucide-react'

export default function ImportExportButtons() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Please upload an Excel file (.xlsx or .xls)')
      e.target.value = ''
      return
    }

    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/customers/import', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Import failed')
      toast.success(data.message ?? `${data.imported} customers imported`)
      router.refresh()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const res = await fetch('/api/customers/export')
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? 'Export failed')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const disposition = res.headers.get('Content-Disposition') ?? ''
      const match = disposition.match(/filename="?([^"]+)"?/)
      a.download = match?.[1] ?? 'customers.csv'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success('Customers exported')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleImport}
      />

      {/* Import button */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={importing}
        className="flex items-center gap-2 bg-charcoal-800 hover:bg-charcoal-700 disabled:opacity-60 border border-charcoal-700 text-white font-medium px-3 py-2 rounded-lg text-sm transition-all"
        title="Import customers from Excel"
      >
        {importing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Upload className="w-4 h-4" />
        )}
        {importing ? 'Importing…' : 'Import'}
      </button>

      {/* Export button */}
      <button
        onClick={handleExport}
        disabled={exporting}
        className="flex items-center gap-2 bg-charcoal-800 hover:bg-charcoal-700 disabled:opacity-60 border border-charcoal-700 text-white font-medium px-3 py-2 rounded-lg text-sm transition-all"
        title="Export customers to CSV"
      >
        {exporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        {exporting ? 'Exporting…' : 'Export'}
      </button>
    </div>
  )
}
