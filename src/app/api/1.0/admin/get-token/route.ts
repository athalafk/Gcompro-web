/**
 * @swagger
 * /admin/get-token:
 *   post:
 *     summary: (Admin only) Ambil JWT access token Supabase dengan NIM + password
 *     description: >
 *       **Hanya untuk admin** (dibuktikan via `Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}`).
 *       Endpoint helper internal agar bisa mengambil **JWT access_token** & **refresh_token**
 *       langsung dari Swagger UI menggunakan kredensial NIM + password.
 *       Email dibentuk dari pola: `nim@{NEXT_PUBLIC_STUDENT_EMAIL_DOMAIN|campus.ac.id}`.
 *     tags: [Admin]
 *     security:
 *       - ServiceRoleAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nim, password]
 *             properties:
 *               nim:
 *                 type: string
 *                 description: Student Identification Number.
 *                 example: "1301320001"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 example: "ADMIN321!!!"
 *     responses:
 *       200:
 *         description: Token berhasil didapatkan.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SupabasePasswordGrant'
 *             examples:
 *               ok:
 *                 value:
 *                   access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                   token_type: "bearer"
 *                   expires_in: 3600
 *                   refresh_token: "eyJhbGciOi..."
 *                   user: { id: "12b4dff9-b975-4800-863d-78f1ec8c9e3e", email: "1301320001@campus.ac.id" }
 *       400:
 *         description: Payload tidak valid / login gagal.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               badRequest:
 *                 value: { error: "NIM dan password wajib diisi." }
 *       401:
 *         description: Unauthorized (header Authorization tidak diisi/valid).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               unauthorized:
 *                 value: { error: "Unauthorized" }
 *       500:
 *         description: Kesalahan server saat menghubungi Supabase Auth.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               serverError:
 *                 value: { error: "fetch failed" }
 *
 * components:
 *   securitySchemes:
 *     ServiceRoleAuth:
 *       type: apiKey
 *       in: header
 *       name: Authorization
 *       description: >
 *         Format: `Bearer {SUPABASE_SERVICE_ROLE_KEY}`. **Jangan** dipakai di klien publik atau production tanpa pembatasan akses.
 *   schemas:
 *     SupabasePasswordGrant:
 *       type: object
 *       properties:
 *         access_token: { type: string }
 *         token_type: { type: string, example: "bearer" }
 *         expires_in: { type: integer, example: 3600 }
 *         refresh_token: { type: string }
 *         user:
 *           type: object
 *           properties:
 *             id: { type: string, format: uuid }
 *             email: { type: string, format: email }
 *       required: [access_token, token_type, expires_in, refresh_token, user]
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error: { type: string }
 *       required: [error]
 */

import { NextResponse } from "next/server";

type Body = { nim?: unknown; password?: unknown };

export async function POST(req: Request) {
  // === Guard: Service Role only
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const authz = req.headers.get("authorization") || "";
  const authorized = !!svc && authz === `Bearer ${svc}`;
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // === Parse & validate body
  const body = (await req.json().catch(() => null)) as Body | null;
  const nim = typeof body?.nim === "string" ? body!.nim.trim() : "";
  const password = typeof body?.password === "string" ? body!.password : "";
  if (!nim || !password) {
    return NextResponse.json({ error: "NIM dan password wajib diisi." }, { status: 400 });
  }

  // === Build email from NIM using configured domain
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const domain = process.env.NEXT_PUBLIC_STUDENT_EMAIL_DOMAIN || "campus.ac.id";
  const email = `${nim}@${domain}`;

  try {
    // Proxy ke Supabase Auth (password grant) → langsung dapat access_token
    const r = await fetch(`${url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": anon,
        "Authorization": `Bearer ${anon}`,
      },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });

    const j = await r.json();

    if (!r.ok) {
      const msg =
        (typeof j?.error_description === "string" && j.error_description) ||
        (typeof j?.msg === "string" && j.msg) ||
        "NIM atau Kata Sandi salah.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    return NextResponse.json(
      {
        access_token: j.access_token,
        token_type: j.token_type,
        expires_in: j.expires_in,
        refresh_token: j.refresh_token,
        user: j.user ? { id: j.user.id, email: j.user.email } : null,
      },
      { status: 200 }
    );
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
