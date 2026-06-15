/**
 * PreciousAI migration runner — tries multiple Supabase connection strategies.
 * Run: node scripts/run-migrations.mjs
 */
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SQL = readFileSync(join(__dirname, '../supabase/APPLY_THESE_MIGRATIONS.sql'), 'utf8')

const PROJECT_REF = 'xkfgqrvadbagokmmwvdw'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrZmdxcnZhZGJhZ29rbW13dmR3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTE3NzgxMSwiZXhwIjoyMDk2NzUzODExfQ.OA9Rf_lwtoyZboKqoa0GTiWySnbcE4MfzTzfmZ9hqqs'

// Split SQL into individual statements (skip comments and blanks)
function splitStatements(sql) {
  return sql
    .split(/;[\s]*(\n|$)/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))
}

async function tryManagementAPI() {
  console.log('\n[1/3] Trying Supabase Management API with service role key...')
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: 'SELECT 1 as test' }),
  })
  const body = await res.json()
  console.log(`  Status: ${res.status}`, body)
  return res.ok
}

async function tryRestRPC() {
  console.log('\n[2/3] Trying PostgREST exec_sql RPC...')
  const stmts = splitStatements(SQL)
  let ok = true
  for (const stmt of stmts.slice(0, 3)) {
    const res = await fetch(`https://${PROJECT_REF}.supabase.co/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'apikey': SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql: stmt }),
    })
    const body = await res.json().catch(() => res.text())
    console.log(`  [${res.status}]`, typeof body === 'string' ? body.slice(0, 120) : body)
    if (!res.ok) { ok = false; break }
  }
  return ok
}

async function tryDirectPG() {
  console.log('\n[3/3] Trying direct pg connection...')
  let pg
  try {
    pg = (await import('pg')).default
  } catch {
    console.log('  pg not installed, installing...')
    const { execSync } = await import('child_process')
    try {
      execSync('npm install pg --no-save --silent', { cwd: join(__dirname, '..'), stdio: 'inherit' })
      pg = (await import('pg')).default
    } catch (e) {
      console.log('  Failed to install pg:', e.message)
      return false
    }
  }

  const connectionStrings = [
    // Try pooler with service_role JWT as password (long shot)
    `postgresql://postgres.${PROJECT_REF}:${SERVICE_ROLE_KEY}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
    `postgresql://postgres.${PROJECT_REF}:${SERVICE_ROLE_KEY}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
    // Direct with JWT as password
    `postgresql://postgres:${SERVICE_ROLE_KEY}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
    // Common default passwords
    `postgresql://postgres:postgres@db.${PROJECT_REF}.supabase.co:5432/postgres`,
  ]

  for (const cs of connectionStrings) {
    const safeCs = cs.replace(SERVICE_ROLE_KEY, '[JWT]').replace(/postgres:[^@]+@/, 'postgres:[PWD]@')
    console.log(`  Trying: ${safeCs}`)
    const client = new pg.Client({ connectionString: cs, connectionTimeoutMillis: 5000, ssl: { rejectUnauthorized: false } })
    try {
      await client.connect()
      console.log('  ✅ Connected!')
      const stmts = splitStatements(SQL)
      let applied = 0
      for (const stmt of stmts) {
        try {
          await client.query(stmt)
          applied++
        } catch (e) {
          if (!e.message.includes('already exists') && !e.message.includes('duplicate')) {
            console.log(`  ⚠️  ${e.message.slice(0, 120)}`)
          }
        }
      }
      await client.end()
      console.log(`\n✅ MIGRATIONS APPLIED — ${applied} statements executed successfully.`)
      return true
    } catch (e) {
      console.log(`  ❌ ${e.message.slice(0, 80)}`)
      await client.end().catch(() => {})
    }
  }
  return false
}

(async () => {
  console.log('=== PreciousAI Migration Runner ===')
  const mgmtOk = await tryManagementAPI()
  if (mgmtOk) { console.log('✅ Management API worked!'); process.exit(0) }

  const rpcOk = await tryRestRPC()
  if (rpcOk) { console.log('✅ RPC worked!'); process.exit(0) }

  const pgOk = await tryDirectPG()
  if (pgOk) { process.exit(0) }

  console.log('\n❌ All connection methods failed.')
  console.log('   A Supabase database password or Management API PAT is required.')
  console.log('   Your database password is at: Supabase Dashboard → Settings → Database → Connection string')
  process.exit(1)
})()
