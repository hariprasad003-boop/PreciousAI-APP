import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://xkfgqrvadbagokmmwvdw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrZmdxcnZhZGJhZ29rbW13dmR3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTE3NzgxMSwiZXhwIjoyMDk2NzUzODExfQ.OA9Rf_lwtoyZboKqoa0GTiWySnbcE4MfzTzfmZ9hqqs',
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const tables = [
  'tenants', 'tenant_locations', 'tenant_users', 'tenant_whatsapp_configs',
  'lead_stages', 'leads', 'customers', 'customer_family',
  'purchase_history', 'interactions', 'whatsapp_messages',
  'follow_ups', 'events', 'ai_scores'
]

let allOk = true
for (const table of tables) {
  const { error } = await supabase.from(table).select('count').limit(1)
  const ok = !error || error.code === 'PGRST116'
  console.log(`  ${ok ? '✓' : '✗'} ${table}${error && error.code !== 'PGRST116' ? ' — ' + error.message : ''}`)
  if (!ok) allOk = false
}

console.log(allOk ? '\nAll tables OK — ready to go!' : '\nSome tables missing.')
process.exit(allOk ? 0 : 1)
