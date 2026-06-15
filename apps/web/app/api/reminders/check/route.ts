import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  sendBirthdayReminder,
  sendAnniversaryReminder,
} from '@/lib/services/email'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CustomerRow {
  id: string
  tenant_id: string
  full_name: string
  phone: string
  dob: string | null
  anniversary_date: string | null
}

interface TenantUserRow {
  id: string
  email: string
  full_name: string
  tenant_id: string
  notify_reminders: boolean
}

interface TenantRow {
  id: string
  name: string
  branding: {
    primary_color?: string
    store_name?: string
  }
}

// ─── POST /api/reminders/check ────────────────────────────────────────────────
// Called by a cron job or manually. Finds customers with birthday / anniversary
// in the next 3 days and emails all staff with notify_reminders: true.

export async function POST(_req: NextRequest) {
  const supabase = await createAdminClient()
  const errors: string[] = []
  let sent = 0

  // ── 1. Find birthday customers in next 3 days ────────────────────────────

  const { data: birthdayCustomers, error: bdError } = await supabase.rpc(
    'get_upcoming_birthday_customers'
  )

  if (bdError) {
    // Fallback: manual query if RPC does not exist yet
    const { data: bdFallback, error: bdFallbackError } = await supabase
      .from('customers')
      .select('id, tenant_id, full_name, phone, dob, anniversary_date')
      .not('dob', 'is', null)

    if (bdFallbackError) {
      errors.push(`Birthday query error: ${bdFallbackError.message}`)
    } else {
      const today = new Date()
      const upcoming = (bdFallback as CustomerRow[]).filter((c) => {
        if (!c.dob) return false
        const dob = new Date(c.dob)
        for (let d = 0; d <= 3; d++) {
          const check = new Date(today)
          check.setDate(today.getDate() + d)
          if (
            dob.getMonth() === check.getMonth() &&
            dob.getDate() === check.getDate()
          ) {
            return true
          }
        }
        return false
      })
      await processCustomers(supabase, upcoming, 'birthday', errors, (count) => (sent += count))
    }
  } else {
    await processCustomers(supabase, birthdayCustomers as CustomerRow[], 'birthday', errors, (count) => (sent += count))
  }

  // ── 2. Find anniversary customers in next 3 days ─────────────────────────

  const { data: annivCustomers, error: annivError } = await supabase
    .from('customers')
    .select('id, tenant_id, full_name, phone, dob, anniversary_date')
    .not('anniversary_date', 'is', null)

  if (annivError) {
    errors.push(`Anniversary query error: ${annivError.message}`)
  } else {
    const today = new Date()
    const upcoming = (annivCustomers as CustomerRow[]).filter((c) => {
      if (!c.anniversary_date) return false
      const anniv = new Date(c.anniversary_date)
      for (let d = 0; d <= 3; d++) {
        const check = new Date(today)
        check.setDate(today.getDate() + d)
        if (
          anniv.getMonth() === check.getMonth() &&
          anniv.getDate() === check.getDate()
        ) {
          return true
        }
      }
      return false
    })
    await processCustomers(supabase, upcoming, 'anniversary', errors, (count) => (sent += count))
  }

  return NextResponse.json({ sent, errors })
}

// ─── Helper: process a list of customers and send emails ──────────────────────

async function processCustomers(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  customers: CustomerRow[],
  type: 'birthday' | 'anniversary',
  errors: string[],
  onSent: (count: number) => void
) {
  if (!customers.length) return

  // Group by tenant_id to batch tenant lookups
  const tenantIds = [...new Set(customers.map((c) => c.tenant_id))]

  // Fetch tenants
  const { data: tenants } = await supabase
    .from('tenants')
    .select('id, name, branding')
    .in('id', tenantIds)

  const tenantMap = new Map<string, TenantRow>((tenants ?? []).map((t: TenantRow) => [t.id, t]))

  // Fetch staff with reminders enabled — note: notify_reminders may not exist yet,
  // so we fall back to all active staff if the column is missing
  const { data: allStaff } = await supabase
    .from('tenant_users')
    .select('id, email, full_name, tenant_id, notify_reminders')
    .in('tenant_id', tenantIds)
    .eq('is_active', true)

  // Group staff by tenant
  const staffByTenant = new Map<string, TenantUserRow[]>()
  for (const s of (allStaff ?? []) as TenantUserRow[]) {
    if (!staffByTenant.has(s.tenant_id)) staffByTenant.set(s.tenant_id, [])
    staffByTenant.get(s.tenant_id)!.push(s)
  }

  for (const customer of customers) {
    const tenant = tenantMap.get(customer.tenant_id)
    if (!tenant) continue

    const staff = (staffByTenant.get(customer.tenant_id) ?? []).filter(
      // If notify_reminders column exists, respect it; otherwise notify all staff
      (s) => s.notify_reminders !== false
    )

    if (!staff.length) continue

    const storeName = tenant.branding?.store_name || tenant.name
    const primaryColor = tenant.branding?.primary_color || '#D4AF37'

    const dateStr = type === 'birthday'
      ? formatDate(customer.dob!)
      : formatDate(customer.anniversary_date!)

    for (const staffMember of staff) {
      try {
        let result
        if (type === 'birthday') {
          result = await sendBirthdayReminder({
            to: staffMember.email,
            staffName: staffMember.full_name,
            customerName: customer.full_name,
            customerPhone: customer.phone,
            birthdayDate: dateStr,
            storeName,
            primaryColor,
          })
        } else {
          result = await sendAnniversaryReminder({
            to: staffMember.email,
            staffName: staffMember.full_name,
            customerName: customer.full_name,
            customerPhone: customer.phone,
            anniversaryDate: dateStr,
            storeName,
            primaryColor,
          })
        }

        // Log to reminder_logs
        await supabase.from('reminder_logs').insert({
          tenant_id: customer.tenant_id,
          customer_id: customer.id,
          type,
          status: result.success ? 'sent' : 'failed',
          error: result.error ?? null,
        })

        if (result.success) {
          onSent(1)
        } else {
          errors.push(`[${type}] ${customer.full_name} -> ${staffMember.email}: ${result.error}`)
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`[${type}] ${customer.full_name}: ${msg}`)

        await supabase.from('reminder_logs').insert({
          tenant_id: customer.tenant_id,
          customer_id: customer.id,
          type,
          status: 'failed',
          error: msg,
        })
      }
    }
  }
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
    })
  } catch {
    return dateStr
  }
}
