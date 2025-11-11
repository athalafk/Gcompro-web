/**
 * @swagger
 * /auth/callback:
 *   get:
 *     summary: Supabase Auth callback handler for email or OAuth flows.
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Code provided by Supabase to exchange for a session.
 *       - in: query
 *         name: callbackUrl
 *         schema:
 *           type: string
 *         description: Optional URL to redirect to after successful exchange. Defaults to '/'.
 *       - in: query
 *         name: error
 *         schema:
 *           type: string
 *         description: Error message returned by Supabase or the auth provider.
 *     responses:
 *       302:
 *         description: Redirects to `/auth/confirmed` (success) or `/auth/confirmed?status=error` (failure).
 */

import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseRouteClient } from '@/utils/supabase/route'

function sanitizeCallbackUrl(raw: string | null, req: NextRequest): URL {
  const fallback = new URL('/auth/confirmed', req.url) // default landing
  if (!raw) return fallback
  try {
    if (raw.startsWith('/')) return new URL(raw, req.url)
  } catch { /* ignore */ }
  return fallback
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error_description') || searchParams.get('error')
  const callbackUrl = sanitizeCallbackUrl(searchParams.get('callbackUrl'), req)

  if (error) {
    const url = new URL('/auth/confirmed', req.url)
    url.searchParams.set('status', 'error')
    url.searchParams.set('message', error)
    const res = NextResponse.redirect(url)
    res.headers.set('Cache-Control', 'no-store')
    return res
  }

  if (code) {
    const res = NextResponse.redirect(callbackUrl)
    res.headers.set('Cache-Control', 'no-store')

    try {
      const supabase = createSupabaseRouteClient(req, res)
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        const errUrl = new URL('/auth/confirmed', req.url)
        errUrl.searchParams.set('status', 'error')
        errUrl.searchParams.set('message', exchangeError.message)
        res.headers.set('Location', errUrl.toString())
      }

      return res
    } catch (e: unknown) {
      const errUrl = new URL('/auth/confirmed', req.url)
      errUrl.searchParams.set('status', 'error')
      errUrl.searchParams.set('message', e instanceof Error ? e.message : 'Unexpected error.')
      const res = NextResponse.redirect(errUrl)
      res.headers.set('Cache-Control', 'no-store')
      return res
    }
  }

  const url = new URL('/auth/confirmed', req.url)
  url.searchParams.set('status', 'error')
  url.searchParams.set('message', 'Missing authorization code.')
  const res = NextResponse.redirect(url)
  res.headers.set('Cache-Control', 'no-store')
  return res
}
