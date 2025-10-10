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