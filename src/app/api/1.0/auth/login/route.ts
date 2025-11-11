/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate a user using Supabase email/password.
 *     description: |
 *       Melakukan login menggunakan kombinasi NIM + password.
 *       Email dikonstruksi dari NIM dengan pola `{nim}@campus.ac.id`.
 *     tags: [Auth]
 *     operationId: loginWithNim
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           examples:
 *             valid:
 *               summary: Payload valid
 *               value:
 *                 nim: "1301320001"
 *                 password: "secret123"
 *     responses:
 *       200:
 *         description: Login berhasil (session cookie diset oleh Supabase).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginSuccess'
 *             examples:
 *               ok:
 *                 value:
 *                   message: "Login successful"
 *       400:
 *         description: Payload tidak valid (missing/format salah).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               not_json:
 *                 value: { error: "Body request harus berupa JSON." }
 *               missing_fields:
 *                 value: { error: "NIM dan kata sandi wajib diisi." }
 *       401:
 *         description: Kredensial salah.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               bad_creds:
 *                 value: { error: "NIM atau kata sandi salah." }
 *       500:
 *         description: Terjadi kesalahan tak terduga.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               unexpected:
 *                 value: { error: "Unexpected error occurred." }
 *
 * components:
 *   schemas:
 *     LoginRequest:
 *       type: object
 *       additionalProperties: false
 *       required: [nim, password]
 *       properties:
 *         nim:
 *           type: string
 *           description: Student Identification Number (akan dipetakan ke email {nim}@campus.ac.id).
 *           example: "1301320001"
 *         password:
 *           type: string
 *           minLength: 6
 *           example: "secret123"
 *     LoginSuccess:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         message:
 *           type: string
 *           example: "Login successful"
 *       required: [message]
 *     ErrorResponse:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         error:
 *           type: string
 *       required: [error]
 */


export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';
import { withSupabaseRouteCarrier, jsonNoStore } from '@/utils/api';

const EMAIL_DOMAIN = process.env.NEXT_PUBLIC_CAMPUS_EMAIL_DOMAIN || 'campus.ac.id';

type LoginPayload = { nim?: unknown; password?: unknown };

export async function POST(req: NextRequest) {
  let body: LoginPayload;
  try { body = await req.json(); }
  catch { return jsonNoStore({ error: 'Body request harus berupa JSON.' }, 400); }

  const nim = typeof body.nim === 'string' ? body.nim.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!nim || !password) return jsonNoStore({ error: 'NIM dan kata sandi wajib diisi.' }, 400);

  const res = NextResponse.json({ message: 'Login successful' }, { status: 200 });
  res.headers.set('Cache-Control', 'no-store');

  try {
    const { supabase } = withSupabaseRouteCarrier(req, res);
    const { error } = await supabase.auth.signInWithPassword({
      email: `${nim}@${EMAIL_DOMAIN}`,
      password,
    });
    if (error) return jsonNoStore({ error: 'NIM atau kata sandi salah.' }, 401);
    return res;
  } catch (e: any) {
    return jsonNoStore({ error: e?.message || 'Unexpected error occurred.' }, 500);
  }
}
