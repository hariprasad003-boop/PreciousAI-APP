import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

// Paths that don't require authentication on tenant subdomains
const PUBLIC_PATHS = ['/login', '/signup', '/api/auth', '/api/webhooks', '/api/billing/webhook']
const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN ?? 'preciousai.app'

function getTenantSubdomain(request: NextRequest): string | null {
  const hostname = request.headers.get('host') ?? ''
  if (hostname.includes('localhost')) {
    const parts = hostname.split('.')
    if (parts.length > 1) return parts[0]
    // Fallback: read tenant from cookie (for local dev without subdomain DNS)
    return request.cookies.get('x-dev-tenant')?.value ?? null
  }
  if (hostname.endsWith(APP_DOMAIN)) {
    const subdomain = hostname.replace(`.${APP_DOMAIN}`, '')
    return subdomain === APP_DOMAIN ? null : subdomain
  }
  return null
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const subdomain = getTenantSubdomain(request)

  if (subdomain && !pathname.startsWith('/api')) {
    // Tenant root "/" → internally serve "/home" (dashboard home page)
    const targetPathname = pathname === '/' ? '/home' : pathname

    const tenantHeaders = new Headers(request.headers)
    tenantHeaders.set('x-tenant-subdomain', subdomain)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (_cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) => {},
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    const isPublicPath = PUBLIC_PATHS.some(p => targetPathname.startsWith(p))

    if (!user && !isPublicPath) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    if (pathname === '/') {
      const rewriteUrl = request.nextUrl.clone()
      rewriteUrl.pathname = '/home'
      const res = NextResponse.rewrite(rewriteUrl, {
        request: { headers: tenantHeaders },
      })
      // Forward cookies from supabase session refresh
      const refreshClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll: () => request.cookies.getAll(),
            setAll: (cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) => {
              cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
            },
          },
        }
      )
      await refreshClient.auth.getUser()
      return res
    }

    const response = NextResponse.next({ request: { headers: tenantHeaders } })
    const refreshClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) => {
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
          },
        },
      }
    )
    await refreshClient.auth.getUser()
    return response
  }

  // Marketing site (no subdomain) — pass through with session refresh
  const response = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) => {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )
  await supabase.auth.getUser()
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
