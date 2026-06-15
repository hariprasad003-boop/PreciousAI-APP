import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://xkfgqrvadbagokmmwvdw.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrZmdxcnZhZGJhZ29rbW13dmR3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTE3NzgxMSwiZXhwIjoyMDk2NzUzODExfQ.OA9Rf_lwtoyZboKqoa0GTiWySnbcE4MfzTzfmZ9hqqs'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const sql = readFileSync('./scripts/migrate.sql', 'utf-8')

// Split into individual statements and run via rpc if possible
// Try testing connection first
console.log('Testing Supabase connection...')
const { data, error } = await supabase.from('tenants').select('count').limit(1)

if (error && error.code === '42P01') {
  console.log('Tables do not exist yet — need to run migration SQL')
  console.log('\nConnection to Supabase works! Now running schema migration...\n')
} else if (error) {
  console.error('Connection error:', error.message)
  process.exit(1)
} else {
  console.log('Tables already exist! Schema is up to date.')
  process.exit(0)
}
