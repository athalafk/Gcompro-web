/**
 * @swagger
 * /api/students:
 *   get:
 *     summary: Daftar semua mahasiswa
 *     tags: [Students]
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                     example: "9f9a4212-0761-482d-8b01-a20c35f2010d"
 *                   nim:
 *                     type: string
 *                     nullable: true
 *                     example: "13519001"
 *                   nama:
 *                     type: string
 *                     example: "Alice"
 *       500:
 *         description: Error query Supabase
 */


import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("students")
    .select("id, nim, nama")
    .order("nim");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}