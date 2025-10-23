/**
 * @swagger
 * /api/students/{id}/transcript:
 *   get:
 *     summary: Transkrip mata kuliah mahasiswa (per semester)
 *     description: |
 *       Mengambil daftar mata kuliah yang diambil mahasiswa, termasuk semester, kode/nama MK, SKS, nilai, dan status kelulusan.
 *       - Endpoint **memerlukan sesi Supabase yang valid** (cookie/token).
 *       - Jika user **admin**, pembacaan dilakukan dengan service-role client (bypass RLS) untuk akses lintas mahasiswa.
 *       - Data diambil langsung dari tabel `enrollments` (tanpa view) dengan join ke `courses`.
 *     tags: [Students]
 *     operationId: getStudentTranscript
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
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/TranscriptItem'
 *             examples:
 *               sample:
 *                 value:
 *                   - semester_no: 1
 *                     kode: "IF101"
 *                     nama: "Pengantar Informatika"
 *                     sks: 3
 *                     nilai: "A"
 *                     status: "lulus"
 *                   - semester_no: 1
 *                     kode: "MA101"
 *                     nama: "Kalkulus I"
 *                     sks: 3
 *                     nilai: "B"
 *                     status: "lulus"
 *                   - semester_no: 2
 *                     kode: "MA102"
 *                     nama: "Kalkulus II"
 *                     sks: 3
 *                     nilai: "D"
 *                     status: "tidak lulus"
 *       401:
 *         description: Unauthorized (tidak ada sesi Supabase).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               no_session:
 *                 value: { error: "Unauthorized" }
 *       500:
 *         description: Kesalahan server saat query ke Supabase.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               db_error:
 *                 value: { error: "relation enrollments does not exist" }
 *
 * components:
 *   schemas:
 *     TranscriptItem:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         semester_no:
 *           type: integer
 *           description: Nomor semester pengambilan MK.
 *         kode:
 *           type: string
 *           description: Kode mata kuliah.
 *         nama:
 *           type: string
 *           description: Nama mata kuliah.
 *         sks:
 *           type: integer
 *           description: Bobot SKS mata kuliah.
 *         nilai:
 *           type: string
 *           nullable: true
 *           description: Indeks huruf (A/AB/B/BC/C/D/E) atau null jika belum ada.
 *         status:
 *           type: string
 *           description: Status kelulusan berdasarkan kolom `kelulusan` (di-normalisasi).
 *           enum: [lulus, tidak lulus]
 *       required: [semester_no, kode, nama, sks, status]
 *
 *     ErrorResponse:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         error:
 *           type: string
 *       required: [error]
 */


export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/lib/supabase";

type TranscriptItem = {
  semester_no: number;
  kode: string;
  nama: string;
  sks: number;
  nilai: string | null;
  status: string;
};

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  // --- Auth (sesi user)
  const supabaseUser = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabaseUser.auth.getUser();

  if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 });
  if (!user)   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // --- Ambil role
  const { data: profile, error: profErr } = await supabaseUser
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 });

  // Admin => service-role client (bypass RLS untuk baca lintas mahasiswa)
  const isAdmin = profile?.role === "admin";
  const db = isAdmin ? await createAdminClient() : supabaseUser;

  const studentId = params.id;

  // --- Ambil data transkrip tanpa view
  const { data, error } = await db
    .from("enrollments")
    .select(`
      semester_no,
      grade_index,
      kelulusan,
      course:course_id(kode, nama, sks)
    `)
    .eq("student_id", studentId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // --- Bentuk payload akhir
  const items: TranscriptItem[] = (data ?? [])
    .map((row: any) => {

      return {
        semester_no: Number(row?.semester_no ?? NaN),
        kode: row?.course?.kode ?? "",
        nama: row?.course?.nama ?? "",
        sks: Number(row?.course?.sks ?? 0),
        nilai: row?.grade_index ?? null,
        status: row?.kelulusan ?? "",
      };
    })
    // urutkan: semester_no -> kode
    .sort((a, b) => (a.semester_no - b.semester_no) || a.kode.localeCompare(b.kode));

  return NextResponse.json(items, { status: 200 });
}
