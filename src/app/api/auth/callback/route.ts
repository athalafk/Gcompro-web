/**
 * @swagger
 * /api/auth/callback:
 * get:
 * summary: Supabase Auth Callback endpoint (Email/OAuth redirection handler)
 * tags: [Auth]
 * parameters:
 * - in: query
 * name: code
 * schema: { type: string }
 * description: Code parameter provided by Supabase for session exchange.
 * - in: query
 * name: callbackUrl
 * schema: { type: string }
 * description: Optional URL to redirect to after successful exchange. Defaults to '/'.
 * - in: query
 * name: error
 * schema: { type: string }
 * description: Error message from Supabase/Auth Provider.
 * responses:
 * 302:
 * description: Redirects to '/auth/confirmed' (success) or '/auth/confirmed?status=error' (failure/error).
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  
  const code = searchParams.get('code') 
  const callbackUrl = searchParams.get('callbackUrl') || '/'
  const error = searchParams.get('error_description') || searchParams.get('error')

  if (error) {
    return NextResponse.redirect(
      new URL(`/auth/confirmed?status=error&message=${encodeURIComponent(error)}`, request.url)
    )
  }

  if (code) {
    const supabase = createClient()
    
    const { error: exchangeError } = await (await supabase).auth.exchangeCodeForSession(code)

    if (exchangeError) {
      return NextResponse.redirect(
        new URL(`/auth/confirmed?status=error&message=${encodeURIComponent(exchangeError.message)}`, request.url)
      )
    }
  } 

  const next = searchParams.get('callbackUrl')
    ? new URL(callbackUrl, request.url)
    : new URL('/auth/confirmed', request.url)

  return NextResponse.redirect(next)
}