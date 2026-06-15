import Link from 'next/link'
import { createAdminClient as createClient } from '@/lib/supabase/server'
import { getCurrentTenant } from '@/lib/tenant'
import { formatCurrency, formatDate, getInitials } from '@/lib/utils'
import { Star, UserPlus, Search } from 'lucide-react'
import AddCustomerModal from '@/components/customers/add-customer-modal'
import ImportExportButtons from '@/components/customers/import-export-buttons'

export default async function CustomersPage() {
  const [supabase, tenant] = await Promise.all([createClient(), getCurrentTenant()])
  if (!tenant) return null

  const { data: customers } = await supabase
    .from('customers')
    .select(`
      id, full_name, phone, email,
      is_vip, lifetime_value, dob, anniversary_date,
      metal_pref, stone_pref, favourite_categories,
      created_at
    `)
    .eq('tenant_id', tenant.id)
    .order('lifetime_value', { ascending: false })

  const branding = tenant.branding as any
  const totalLtv = customers?.reduce((sum, c) => sum + (c.lifetime_value ?? 0), 0) ?? 0
  const vipCount = customers?.filter(c => c.is_vip).length ?? 0

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">Customers</h1>
          <p className="text-charcoal-400 text-sm mt-1">
            {customers?.length ?? 0} customers · {vipCount} VIP · {formatCurrency(totalLtv, tenant.currency)} lifetime value
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ImportExportButtons />
          <AddCustomerModal
            countryCode={tenant.country_code}
            currency={tenant.currency}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total customers', value: customers?.length ?? 0 },
          { label: 'VIP customers', value: vipCount },
          { label: 'Avg. lifetime value', value: customers?.length ? formatCurrency(totalLtv / customers.length, tenant.currency) : '—' },
        ].map(stat => (
          <div key={stat.label} className="dark-glass rounded-xl p-4">
            <p className="text-charcoal-400 text-xs mb-1">{stat.label}</p>
            <p className="font-display text-2xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Customer table */}
      {!customers || customers.length === 0 ? (
        <div className="dark-glass rounded-2xl p-12 text-center">
          <UserPlus className="w-10 h-10 text-charcoal-600 mx-auto mb-4" />
          <p className="text-charcoal-400 text-sm mb-2">No customers yet</p>
          <p className="text-charcoal-500 text-xs">Customers are created when leads are marked as Won, or you can add them manually.</p>
        </div>
      ) : (
        <div className="dark-glass rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-charcoal-800">
                <th className="text-left px-5 py-3 text-xs text-charcoal-500 font-medium">Customer</th>
                <th className="text-left px-5 py-3 text-xs text-charcoal-500 font-medium">Phone</th>
                <th className="text-left px-5 py-3 text-xs text-charcoal-500 font-medium hidden md:table-cell">Preferences</th>
                <th className="text-right px-5 py-3 text-xs text-charcoal-500 font-medium">Lifetime value</th>
                <th className="text-right px-5 py-3 text-xs text-charcoal-500 font-medium hidden lg:table-cell">Added</th>
              </tr>
            </thead>
            <tbody>
              {customers.map(customer => (
                <tr
                  key={customer.id}
                  className="border-b border-charcoal-800 last:border-0 hover:bg-charcoal-800/50 transition-colors"
                >
                  <td className="px-5 py-3.5">
                    <Link href={`/customers/${customer.id}`} className="flex items-center gap-3 group">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                        style={{ backgroundColor: (branding?.primary_color ?? '#C9A84C') + '33', color: branding?.primary_color ?? '#C9A84C' }}
                      >
                        {getInitials(customer.full_name)}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-white text-sm font-medium group-hover:text-gold-400 transition-colors">{customer.full_name}</p>
                          {customer.is_vip && <Star className="w-3 h-3 text-gold-500 fill-gold-500" />}
                        </div>
                        {customer.email && <p className="text-charcoal-500 text-xs">{customer.email}</p>}
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-charcoal-300 text-sm">{customer.phone}</td>
                  <td className="px-5 py-3.5 hidden md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {(customer.metal_pref as string[] ?? []).slice(0, 2).map(p => (
                        <span key={p} className="text-xs bg-charcoal-800 text-charcoal-400 px-2 py-0.5 rounded-full capitalize">{p}</span>
                      ))}
                      {(customer.favourite_categories as string[] ?? []).slice(0, 1).map(c => (
                        <span key={c} className="text-xs bg-gold-500/10 text-gold-400 px-2 py-0.5 rounded-full">{c}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="text-white font-medium text-sm">{formatCurrency(customer.lifetime_value ?? 0, tenant.currency)}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right hidden lg:table-cell text-charcoal-500 text-xs">
                    {formatDate(customer.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
