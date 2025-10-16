/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Authenticate a user using Supabase email/password.
 *     tags: [Auth]
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
 *     responses:
 *       200:
 *         description: Login berhasil.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Login successful
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
 *       401:
 *         description: Kredensial salah.
 *       500:
 *         description: Terjadi kesalahan tak terduga.
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