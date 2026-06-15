import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getCurrentTenant, checkPlanLimit } from '@/lib/tenant'
import * as XLSX from 'xlsx'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
  const tenant = await getCurrentTenant()
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })

  const limitCheck = await checkPlanLimit(tenant.id, tenant.plan, 'customers')

  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, any>[]

  if (rows.length === 0) return NextResponse.json({ error: 'No data found in file' }, { status: 400 })

  const remaining = limitCheck.limit === -1 ? Infinity : limitCheck.limit - limitCheck.current
  const toImport = rows.slice(0, remaining === Infinity ? rows.length : remaining)

  // Normalise column names (case-insensitive, handle common variations)
  function col(row: Record<string, any>, ...keys: string[]): string {
    for (const k of keys) {
      const found = Object.keys(row).find(rk => rk.toLowerCase().replace(/[\s_]/g, '') === k.toLowerCase().replace(/[\s_]/g, ''))
      if (found && row[found] != null && row[found] !== '') return String(row[found]).trim()
    }
    return ''
  }

  const records = toImport
    .filter(row => col(row, 'fullname', 'name', 'customername'))
    .map(row => ({
      tenant_id: tenant.id,
      full_name: col(row, 'fullname', 'name', 'customername'),
      phone: col(row, 'phone', 'mobile', 'phonenumber', 'contact') || '0000000000',
      email: col(row, 'email') || null,
      country_code: col(row, 'countrycode', 'code') || tenant.country_code,
      city: col(row, 'city', 'location') || null,
      notes: col(row, 'notes', 'remarks', 'comments') || null,
      is_vip: ['yes', 'true', '1'].includes(col(row, 'vip').toLowerCase()),
      lifetime_value: parseFloat(col(row, 'lifetimevalue', 'ltv', 'totalspend') || '0') || 0,
      metal_pref: col(row, 'metalpreferences', 'metalpref', 'metal')
        ? col(row, 'metalpreferences', 'metalpref', 'metal').split(/[,;]/).map((s: string) => s.trim()).filter(Boolean)
        : [],
      stone_pref: col(row, 'stonepreferences', 'stonepref', 'stone')
        ? col(row, 'stonepreferences', 'stonepref', 'stone').split(/[,;]/).map((s: string) => s.trim()).filter(Boolean)
        : [],
      favourite_categories: col(row, 'favouritecategories', 'categories')
        ? col(row, 'favouritecategories', 'categories').split(/[,;]/).map((s: string) => s.trim()).filter(Boolean)
        : [],
    }))

  if (records.length === 0) {
    return NextResponse.json({ error: 'No valid rows found. Ensure the file has a "Full Name" column.' }, { status: 400 })
  }

  // Insert in batches of 100
  let inserted = 0
  for (let i = 0; i < records.length; i += 100) {
    const batch = records.slice(i, i + 100)
    const { error } = await supabaseAdmin.from('customers').insert(batch)
    if (!error) inserted += batch.length
  }

  return NextResponse.json({
    imported: inserted,
    skipped: rows.length - toImport.length,
    message: `${inserted} customers imported${rows.length > toImport.length ? `. ${rows.length - toImport.length} skipped (plan limit).` : '.'}`,
  })
}
