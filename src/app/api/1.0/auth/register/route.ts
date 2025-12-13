/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Daftarkan akun baru menggunakan Supabase email/password.
 *     tags: [deprecated]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       201:
 *         description: Registrasi berhasil, email konfirmasi dikirim.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Registration successful. Please check your email.
 *                 user:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     email:
 *                       type: string
 *                       format: email
 *                       nullable: true
 *       400:
 *         description: Payload tidak valid.
 *       409:
 *         description: Email sudah terdaftar.
 *       500:
 *         description: Terjadi kesalahan tak terduga.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseRouteClient } from '@/utils/supabase/route'

type RegisterPayload = {
  email?: unknown
  password?: unknown
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export async function POST(req: NextRequest) {
  let body: RegisterPayload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body request harus berupa JSON.' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!email || !password) {
    return NextResponse.json({ error: 'Email dan password wajib diisi.' }, { status: 400 })
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'Format email tidak valid.' }, { status: 400 })
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password minimal 6 karakter.' }, { status: 400 })
  }

  const res = NextResponse.json(
    { message: 'Registration successful. Please check your email.' },
    { status: 201 }
  )
  res.headers.set('Cache-Control', 'no-store')

  try {
    const base =
      process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/g, '') || req.nextUrl.origin.replace(/\/+$/g, '')
    const emailRedirectTo = `${base}/api/auth/callback`

    const supabase = createSupabaseRouteClient(req, res)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo },
    })

    if (error) {
      const msg = (error.message || '').toLowerCase()
      const already =
        msg.includes('already') ||
        msg.includes('registered') ||
        msg.includes('exists') ||
        msg.includes('user already') ||
        error.status === 409
      const status = already ? 409 : 500
      return NextResponse.json({ error: error.message }, { status })
    }

    return res
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unexpected error occurred.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}