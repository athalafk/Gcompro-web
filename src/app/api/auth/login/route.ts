/**
 * @swagger
 * /api/auth/login:
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
 *         description: Login berhasil.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginSuccess'
 *             examples:
 *               ok:
 *                 value:
 *                   message: "Login successful"
 *                   user:
 *                     id: "7f9b1e10-5b3f-4b3c-8e1d-0e9b1a2c3d4e"
 *                     email: "1301320001@campus.ac.id"
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
 *                 value: { error: "NIM dan password wajib diisi." }
 *       401:
 *         description: Kredensial salah.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               bad_creds:
 *                 value: { error: "NIM atau password salah." }
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
 *     LoginSuccess:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         message:
 *           type: string
 *           example: "Login successful"
 *         user:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             email:
 *               type: string
 *               format: email
 *               nullable: true
 *       required: [message]
 *     ErrorResponse:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         error:
 *           type: string
 *       required: [error]
 */


import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

type LoginPayload = {
  nim?: unknown;
  password?: unknown;
};

export async function POST(req: NextRequest) {
  let body: LoginPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Body request harus berupa JSON." },
      { status: 400 }
    );
  }

  const nim = typeof body.nim === "string" ? body.nim.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!nim || !password) {
    return NextResponse.json(
      { error: "NIM dan password wajib diisi." },
      { status: 400 }
    );
  }

  const email = `${nim}@campus.ac.id`;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return NextResponse.json({ error: "NIM atau password salah." }, { status: 401 });
    }

    return NextResponse.json({
      message: "Login successful",
      user: data.user,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}