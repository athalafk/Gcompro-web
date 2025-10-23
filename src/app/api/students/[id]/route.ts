/**
 * @swagger
 * /api/students/{id}:
 *   get:
 *     summary: Detail mahasiswa berdasarkan ID
 *     description: |
 *       Mengambil data lengkap 1 mahasiswa berdasarkan `id`.
 *       Endpoint ini memerlukan sesi Supabase yang valid (autentikasi).
 *     tags: [Students]
 *     operationId: getStudentById
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: UUID mahasiswa (kolom `students.id`)
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Data mahasiswa ditemukan.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StudentDetail'
 *             examples:
 *               sample:
 *                 value:
 *                   id: "9f9a4212-0761-482d-8b01-a20c35f2010d"
 *                   nim: "13519001"
 *                   nama: "Alice Rahmawati"
 *                   prodi: "Teknik Telekomunikasi"
 *       401:
 *         description: Unauthorized (tidak ada sesi Supabase).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               no_session:
 *                 value: { error: "Unauthorized" }
 *       404:
 *         description: Mahasiswa tidak ditemukan.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               not_found:
 *                 value: { error: "Not Found" }
 *       500:
 *         description: Kesalahan query Supabase.
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
 *     StudentDetail:
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

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("students")
    .select("id, nama, nim, prodi")
    .eq("id", params.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not Found" }, { status: 404 });

  return NextResponse.json(data, { status: 200 });
}
