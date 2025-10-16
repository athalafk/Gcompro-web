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
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 });

  const url = new URL(request.url);
  const wantAll = url.searchParams.get("all") === "1";

  const query = supabase.from("students").select("id, nim, nama").order("nim");

  if (wantAll) {
    if (profile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
