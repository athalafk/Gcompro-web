import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

// ===== Cache header presets =====

// Untuk request yang mengubah state / sensitif → jangan di-cache sama sekali
export const headersNoStore = {
  'Cache-Control': 'no-store',
} as const

// Untuk GET per-user (aman & efisien): cache di browser user, tetap revalidate
export const headersPrivateSWR = {
  'Cache-Control': 'private, max-age=900, stale-while-revalidate=30',
  'Vary': 'Cookie, Authorization',
} as const

// ===== JSON / redirect helpers =====

export function jsonNoStore(data: any, status = 200) {
  return NextResponse.json(data, { status, headers: headersNoStore })
}

export function jsonPrivate(data: any, status = 200) {
  return NextResponse.json(data, { status, headers: headersPrivateSWR })
}

export function redirectNoStore(url: URL | string) {
  const res = NextResponse.redirect(url)
  Object.entries(headersNoStore).forEach(([k, v]) => res.headers.set(k, v))
  return res
}

// ===== Supabase carrier untuk Route Handler =====

export function withSupabaseRouteCarrier(
  req: NextRequest,
  initResponse: NextResponse = NextResponse.next()
): { supabase: SupabaseClient; res: NextResponse } {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            initResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )
  return { supabase, res: initResponse }
}
