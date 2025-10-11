/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Sign out the active Supabase session.
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logout berhasil.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logout successful
 *       500:
 *         description: Terjadi kesalahan saat logout.
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
