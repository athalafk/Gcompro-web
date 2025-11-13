/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     summary: Ubah password akun yang sedang login (Supabase Auth)
 *     description: |
 *       Mengubah kata sandi pengguna yang sedang login dengan dua jalur autentikasi:
 *
 *       1) **Bearer token (disarankan / Swagger client)**
 *          - Header: `Authorization: Bearer <access_token>`.
 *          - Server akan memverifikasi **project ref** pada token vs `NEXT_PUBLIC_SUPABASE_URL`.
 *            Jika beda → `PROJECT_MISMATCH` (401).
 *          - Setelah verifikasi `current_password` sukses, password di-update via
 *            `auth.admin.updateUserById`.
 *
 *       2) **Cookie SSR (sesi Supabase aktif di browser)**
 *          - Tanpa Bearer: server membaca sesi dari cookie.
 *          - Setelah verifikasi `current_password` sukses, password di-update via
 *            `auth.updateUser`.
 *
 *       Catatan:
 *       - Field `sign_out_others` disediakan untuk kompatibilitas; saat ini tidak memaksa logout
 *         sesi lain secara eksplisit, namun dapat kamu kelola terpisah (revoke).
 *       - Validasi body:
 *         - `current_password` wajib.
 *         - `new_password` min 8 karakter.
 *         - `confirm_password` harus sama dengan `new_password`.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordRequest'
 *           examples:
 *             valid:
 *               summary: Payload valid
 *               value:
 *                 current_password: "oldSecret#1"
 *                 new_password: "NewSecret#2025"
 *                 confirm_password: "NewSecret#2025"
 *                 sign_out_others: true
 *             mismatch_confirm:
 *               summary: Konfirmasi tidak cocok
 *               value:
 *                 current_password: "oldSecret#1"
 *                 new_password: "NewSecret#2025"
 *                 confirm_password: "typo"
 *     responses:
 *       200:
 *         description: Password berhasil diubah.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChangePasswordSuccess'
 *             examples:
 *               ok:
 *                 value: { ok: true, message: "Password berhasil diubah." }
 *       400:
 *         description: Body invalid (gagal validasi Zod).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorWithDetails'
 *             examples:
 *               invalid_body:
 *                 value:
 *                   ok: false
 *                   error: "INVALID_BODY"
 *                   details: [{ path: ["confirm_password"], message: "Konfirmasi password tidak cocok" }]
 *       401:
 *         description: Tidak ada sesi / token tidak sesuai project / token invalid.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ErrorBasic'
 *                 - $ref: '#/components/schemas/ErrorWithDetails'
 *             examples:
 *               no_session_cookie:
 *                 value:
 *                   ok: false
 *                   error: "NO_SESSION"
 *                   message: "Tidak ada sesi & tidak ada bearer token."
 *               project_mismatch:
 *                 value:
 *                   ok: false
 *                   error: "PROJECT_MISMATCH"
 *                   message: "Bearer token project (xxxx) != ENV project (yyyy). Samakan NEXT_PUBLIC_SUPABASE_URL/KEY & token ke project yang sama."
 *       403:
 *         description: Password saat ini salah.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorBasic'
 *             examples:
 *               invalid_current_password:
 *                 value:
 *                   ok: false
 *                   error: "INVALID_CREDENTIALS"
 *                   message: "Password saat ini salah."
 *       500:
 *         description: Kesalahan server saat update password / interaksi Supabase.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorBasic'
 *             examples:
 *               update_failed:
 *                 value:
 *                   ok: false
 *                   error: "UPDATE_FAILED"
 *                   message: "Unexpected error occurred."
 *
 * components:
 *   schemas:
 *     ChangePasswordRequest:
 *       type: object
 *       additionalProperties: false
 *       required: [current_password, new_password, confirm_password]
 *       properties:
 *         current_password:
 *           type: string
 *         new_password:
 *           type: string
 *           minLength: 8
 *         confirm_password:
 *           type: string
 *         sign_out_others:
 *           type: boolean
 *           default: true
 *
 *     ChangePasswordSuccess:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         ok:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Password berhasil diubah."
 *       required: [ok, message]
 *
 *     ErrorBasic:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         ok:
 *           type: boolean
 *           example: false
 *         error:
 *           type: string
 *           example: "NO_SESSION"
 *         message:
 *           type: string
 *           nullable: true
 *       required: [ok, error]
 *
 *     ErrorWithDetails:
 *       allOf:
 *         - $ref: '#/components/schemas/ErrorBasic'
 *         - type: object
 *           properties:
 *             details:
 *               description: Bebas—bisa array issues dari Zod atau teks lain.
 *               nullable: true
 */


export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

// ---------- CONFIG ----------
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const BodySchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8).max(72),
  confirm_password: z.string(),
}).refine(d => d.new_password === d.confirm_password, {
  message: 'Konfirmasi password tidak cocok',
  path: ['confirm_password'],
});

// ---------- Helpers ----------
function supabaseAnon() {
  return createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: false, autoRefreshToken: false } });
}
function supabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
}
function supabaseSSRFromReq(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
              getAll() {
          return req.cookies.getAll();
        },
              setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            res.cookies.set({ name, value, ...options });
          });
        }
    },
  });
  return { supabase, res };
}
function getBearer(req: NextRequest) {
  const h = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}
function projectRefFromUrl(url: string) {
  try { return new URL(url).hostname.split('.')[0]; } catch { return null; }
}
function projectRefFromJwt(jwt: string) {
  try {
    const [, payload] = jwt.split('.');
    const json = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    const iss: string = json?.iss || '';
    const m = iss.match(/https:\/\/([^.]+)\.supabase\.co/);
    return m?.[1] || null;
  } catch { return null; }
}

export async function POST(req: NextRequest) {
  // 1) Body
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: 'INVALID_BODY', details: e?.issues ?? String(e) }, { status: 400 });
  }

  // 2) Auth path: prefer Bearer, else cookie
  const bearer = getBearer(req);

  // 2a) Guard: PROJECT_MISMATCH
  if (bearer) {
    const envRef = projectRefFromUrl(SUPABASE_URL);
    const tokenRef = projectRefFromJwt(bearer);
    if (envRef && tokenRef && envRef !== tokenRef) {
      return NextResponse.json(
        {
          ok: false,
          error: 'PROJECT_MISMATCH',
          message: `Bearer token project (${tokenRef}) != ENV project (${envRef}). ` +
                   `Samakan NEXT_PUBLIC_SUPABASE_URL/KEY & token ke project yang sama.`,
        },
        { status: 401 },
      );
    }
  }

  // 3) Resolve user (email, id)
  let userEmail: string | null = null;
  let userId: string | null = null;

  if (bearer) {
    // via bearer
    const { data, error } = await supabaseAnon().auth.getUser(bearer);
    if (!error && data?.user) {
      userEmail = data.user.email ?? null;
      userId = data.user.id ?? null;
    }
  } else {
    // via cookie (SSR)
    const { supabase } = supabaseSSRFromReq(req);
    const { data: s } = await supabase.auth.getSession();
    userEmail = s?.session?.user?.email ?? null;
    userId = s?.session?.user?.id ?? null;
  }

  if (!userEmail || !userId) {
    return NextResponse.json(
      {
        ok: false,
        error: 'NO_SESSION',
        message: bearer
          ? 'Bearer ada tapi user tidak terdeteksi (token invalid/expired atau bukan project yang sama).'
          : 'Tidak ada sesi & tidak ada bearer token.',
      },
      { status: 401 },
    );
  }

  // 4) Verifikasi current_password
  const { error: verifyErr } = await supabaseAnon().auth.signInWithPassword({
    email: userEmail,
    password: body.current_password,
  });
  if (verifyErr) {
    return NextResponse.json(
      { ok: false, error: 'INVALID_CREDENTIALS', message: 'Password saat ini salah.' },
      { status: 403 },
    );
  }

  // 5) Update password
  if (bearer) {
    // Jalur umum (client/Swagger): pakai Admin API setelah verifikasi sukses
    const { error: updErr } = await supabaseAdmin().auth.admin.updateUserById(userId, {
      password: body.new_password,
    });
    if (updErr) {
      return NextResponse.json({ ok: false, error: 'UPDATE_FAILED', message: updErr.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, message: 'Password berhasil diubah.' });
  } else {
    // Jalur cookie (kalau memang ada)
    const { supabase, res } = supabaseSSRFromReq(req);
    const { error: updErr } = await supabase.auth.updateUser({ password: body.new_password });
    if (updErr) {
      return NextResponse.json({ ok: false, error: 'UPDATE_FAILED', message: updErr.message }, { status: 500 });
    }
    return NextResponse.json(
      { ok: true, message: 'Password berhasil diubah. Anda akan keluar.' },
      { headers: res.headers }
    );
  }
}
