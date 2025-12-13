/**
 * @swagger
 * /admin/rehash-password:
 *   post:
 *     summary: Reset/ganti password user (Admin API).
 *     description: >
 *       **Hanya admin**. Bisa menarget user berdasarkan `userId` **atau** `email`.
 *       Jika `newPassword` tidak dikirim, default ke **"123456"**.
 *     tags: [debug]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: ID user di Supabase Auth (opsional jika menggunakan `email`).
 *                 example: "12b4dff9-b975-4800-863d-78f1ec8c9e3e"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email user di Auth (opsional jika menggunakan `userId`).
 *                 example: "1301320001@campus.ac.id"
 *               newPassword:
 *                 type: string
 *                 minLength: 6
 *                 description: Password baru. Default "123456" jika tidak disediakan.
 *                 example: "SandiBaru123!"
 *     responses:
 *       200:
 *         description: Password berhasil diubah.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RehashPasswordResult'
 *             examples:
 *               ok:
 *                 value: { ok: true, user_id: "12b4dff9-b975-4800-863d-78f1ec8c9e3e" }
 *       400:
 *         description: Payload kurang/invalid (butuh salah satu `userId` atau `email`).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               badRequest:
 *                 value: { error: "Either userId or email is required" }
 *       401:
 *         description: Unauthorized (belum login).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               unauthorized:
 *                 value: { error: "Unauthorized" }
 *       403:
 *         description: Forbidden (bukan admin).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               forbidden:
 *                 value: { error: "Forbidden" }
 *       404:
 *         description: User tidak ditemukan (saat cari berdasarkan `email`).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               notFound:
 *                 value: { error: "User not found" }
 *       500:
 *         description: Gagal reset password (error dari Admin API).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               serverError:
 *                 value: { error: "Admin API error" }
 *
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: >
 *         Token akses Supabase (JWT). Server memverifikasi session dan memastikan `profiles.role = "admin"`.
 *   schemas:
 *     RehashPasswordResult:
 *       type: object
 *       properties:
 *         ok: { type: boolean, example: true }
 *         user_id:
 *           type: string
 *           format: uuid
 *           example: "12b4dff9-b975-4800-863d-78f1ec8c9e3e"
 *       required: [ok, user_id]
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error: { type: string }
 *       required: [error]
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const { userId, email, newPassword = "123456" } = await req.json();

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!  // SERVICE ROLE (server only)
  );

  // 1) Jika userId sudah ada, langsung update
  if (userId) {
    const { error: updErr } = await admin.auth.admin.updateUserById(userId, {
      password: newPassword,
      email_confirm: true,
    });
    if (updErr) return NextResponse.json({ error: "Failed to reset password", debug: updErr }, { status: 500 });
    return NextResponse.json({ ok: true, user_id: userId });
  }

  // 2) Kalau userId belum ada, cari dengan paginasi (fallback untuk cari by email)
  if (!email) return NextResponse.json({ error: "Provide either userId or email" }, { status: 400 });

  let page = 1;
  const perPage = 200; // nilai aman; bisa diturunkan/naikkan sesuai kebutuhan
  let foundId: string | null = null;

  for (let i = 0; i < 50; i++) { // batasi 50 halaman (10k user)
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) return NextResponse.json({ error: "listUsers failed", debug: error }, { status: 500 });

    const match = data.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (match) { foundId = match.id; break; }

    if (!data.users?.length) break; // habis
    page++;
  }

  if (!foundId) return NextResponse.json({ error: "User not found in this project" }, { status: 404 });

  const { error: updErr } = await admin.auth.admin.updateUserById(foundId, {
    password: newPassword,
    email_confirm: true,
  });
  if (updErr) return NextResponse.json({ error: "Failed to reset password", debug: updErr }, { status: 500 });

  return NextResponse.json({ ok: true, user_id: foundId });
}
