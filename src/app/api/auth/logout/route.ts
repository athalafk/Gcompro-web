/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Sign out the active Supabase session.
 *     description: Menghapus sesi Supabase yang sedang aktif untuk user saat ini.
 *     tags: [Auth]
 *     operationId: logoutUser
 *     responses:
 *       200:
 *         description: Logout berhasil.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LogoutSuccess'
 *             examples:
 *               ok:
 *                 value:
 *                   message: "Logout successful"
 *       500:
 *         description: Terjadi kesalahan saat logout.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               unexpected:
 *                 value:
 *                   error: "Unexpected error occurred."
 *
 * components:
 *   schemas:
 *     LogoutSuccess:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         message:
 *           type: string
 *           example: "Logout successful"
 *       required: [message]
 *     ErrorResponse:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         error:
 *           type: string
 *       required: [error]
 */


import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();

    return NextResponse.json({ message: "Logout successful" });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
