import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient as createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'

export async function GET(_req: NextRequest) {
  const [supabase, tenant] = await Promise.all([createClient(), getCurrentTenant()])
  if (!tenant) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: customers, error } = await supabase
    .from('customers')
    .select(`
      full_name, phone, email, country_code,
      dob, anniversary_date, city,
      metal_pref, stone_pref, favourite_categories,
      is_vip, lifetime_value, notes, created_at
    `)
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (customers ?? []).map(c => ({
    'Full Name': c.full_name,
    'Phone': c.phone,
    'Email': c.email ?? '',
    'Country Code': c.country_code,
    'Date of Birth': c.dob ?? '',
    'Anniversary': c.anniversary_date ?? '',
    'City': c.city ?? '',
    'Metal Preferences': (c.metal_pref as string[] ?? []).join(', '),
    'Stone Preferences': (c.stone_pref as string[] ?? []).join(', '),
    'Favourite Categories': (c.favourite_categories as string[] ?? []).join(', '),
    'VIP': c.is_vip ? 'Yes' : 'No',
    'Lifetime Value': c.lifetime_value ?? 0,
    'Notes': c.notes ?? '',
    'Added': c.created_at,
  }))

  const headers = Object.keys(rows[0] ?? {})
  const csvLines = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(h => {
        const val = String((row as any)[h] ?? '').replace(/"/g, '""')
        return val.includes(',') || val.includes('"') || val.includes('\n') ? `"${val}"` : val
      }).join(',')
    ),
  ]

  return new NextResponse(csvLines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="customers-${tenant.subdomain}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
