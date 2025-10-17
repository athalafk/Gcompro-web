/**
 * @swagger
 * /api/students:
 *   get:
 *     summary: Daftar mahasiswa
 *     description: |
 *       Mengembalikan daftar mahasiswa (id, nim, nama).
 *       - Endpoint **memerlukan sesi Supabase yang valid** (cookie/token).
 *       - Query `all=1` hanya boleh diakses oleh **role=admin** (jika tidak, 403).
 *     tags: [Students]
 *     operationId: listStudents
 *     parameters:
 *       - in: query
 *         name: all
 *         required: false
 *         description: Set ke `1` untuk meminta seluruh data (khusus admin).
 *         schema:
 *           type: string
 *           enum: ["1"]
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/StudentsListItem'
 *             examples:
 *               sample:
 *                 value:
 *                   - id: "9f9a4212-0761-482d-8b01-a20c35f2010d"
 *                     nim: "13519001"
 *                     nama: "Alice"
 *                   - id: "7b2f2c1e-8a3a-4b6a-9f1a-11a3c7a0d1ef"
 *                     nim: "13519002"
 *                     nama: "Budi"
 *       401:
 *         description: Unauthorized (tidak ada sesi Supabase).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               no_session:
 *                 value: { error: "Unauthorized" }
 *       403:
 *         description: Forbidden (bukan admin ketika meminta `all=1`).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               not_admin:
 *                 value: { error: "Forbidden" }
 *       500:
 *         description: Error query Supabase / profiling.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               db_error:
 *                 value: { error: "relation students does not exist" }
 *
 * components:
 *   schemas:
 *     StudentsListItem:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         nim:
 *           type: string
 *           nullable: true
 *         nama:
 *           type: string
 *       required: [id, nama]
 *
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
