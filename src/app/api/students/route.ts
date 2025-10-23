export const dynamic = "force-dynamic";

/**
 * @swagger
 * /api/students:
 *   post:
 *     summary: Daftar Mahasiswa (admin only, filter prodi + search nama/nim)
 *     description: |
 *       Mengambil daftar mahasiswa berdasarkan filter `prodi` dan/atau kata kunci `search`.
 *       - Endpoint ini **hanya dapat diakses oleh role=admin** (dicek melalui `profiles.role`).
 *       - Query dijalankan menggunakan **service-role Supabase**.
 *       - Field yang dapat difilter:
 *         - `prodi`: pencarian partial pada nama program studi.
 *         - `search`: pencarian pada nama atau NIM mahasiswa.
 *     tags: [Admin, Students]
 *     operationId: searchStudentsAdmin
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StudentSearchRequest'
 *           examples:
 *             all:
 *               summary: Get All Students
 *               value: {}
 *             by_prodi:
 *               summary: Filter berdasarkan prodi
 *               value: { prodi: "Informatika" }
 *             by_search:
 *               summary: Pencarian kata kunci nama/NIM
 *               value: { search: "13519" }
 *             combined:
 *               summary: Gabungan filter prodi & nama
 *               value: { prodi: "Teknik", search: "Alice" }
 *     responses:
 *       200:
 *         description: OK (daftar mahasiswa ditemukan)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/StudentSummary'
 *             examples:
 *               sample:
 *                 value:
 *                   - id: "9f9a4212-0761-482d-8b01-a20c35f2010d"
 *                     nim: "13519001"
 *                     nama: "Alice Rahmawati"
 *                     prodi: "Teknik Telekomunikasi"
 *                   - id: "b11b4212-0761-482d-8b01-a20c35f2010e"
 *                     nim: "13519002"
 *                     nama: "Budi Santoso"
 *                     prodi: "Teknik Informatika"
 *       401:
 *         description: Unauthorized (tidak ada sesi Supabase aktif)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               no_session:
 *                 value: { error: "Unauthorized" }
 *       403:
 *         description: Forbidden (bukan admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               forbidden:
 *                 value: { error: "Forbidden" }
 *       500:
 *         description: Kesalahan server (gagal query Supabase)
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
 *     StudentSearchRequest:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         prodi:
 *           type: string
 *           description: Pencarian partial pada nama program studi (case-insensitive)
 *           example: "Informatika"
 *         search:
 *           type: string
 *           description: Kata kunci untuk mencari nama atau NIM mahasiswa (case-insensitive)
 *           example: "13519"
 *
 *     StudentSummary:
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
 *         prodi:
 *           type: string
 *           nullable: true
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

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();
  if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 });
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { prodi?: string; search?: string } = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    body = {};
  }

  const prodi = body.prodi?.trim() || "";
  const search = body.search?.trim() || "";

  const db = await createAdminClient();
  let query = db
    .from("students")
    .select("id, nim, nama, prodi")
    .order("nim", { ascending: true });

  if (prodi) {
    query = query.ilike("prodi", `%${prodi}%`);
  }

  if (search) {
    const pattern = `%${search}%`;
    query = query.or(`nama.ilike.${pattern},nim.ilike.${pattern}`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data, { status: 200 });
}
