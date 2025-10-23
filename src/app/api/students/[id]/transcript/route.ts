/**
 * @swagger
 * /api/students/{id}/transcript:
 *   post:
 *     summary: Cari/Filter transkrip mahasiswa (by semester & nama MK)
 *     description: |
 *       Mengembalikan daftar mata kuliah (transkrip) untuk mahasiswa tertentu.
 *       - `semester_no`: nomor semester (jika 0/diabaikan → semua semester)
 *       - `search`: pencarian parsial pada **nama** mata kuliah (case-insensitive)
 *       - Endpoint **memerlukan sesi Supabase**. Jika user **admin**, query dijalankan dengan service-role (bypass RLS).
 *     tags: [Students]
 *     operationId: searchStudentTranscript
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: UUID mahasiswa (kolom `students.id`)
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TranscriptSearchRequest'
 *           examples:
 *             all_semesters:
 *               summary: Semua semester, tanpa pencarian
 *               value: {}
 *             specific_semester:
 *               summary: Hanya semester 3
 *               value: { semester_no: 3 }
 *             search_name:
 *               summary: Cari MK mengandung kata "kalkulus"
 *               value: { search: "kalkulus" }
 *             combined:
 *               summary: Semester 2 dan nama mengandung "jaringan"
 *               value: { semester_no: 2, search: "jaringan" }
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
 *                   - semester_no: 2
 *                     kode: "IF201"
 *                     nama: "Struktur Data"
 *                     sks: 3
 *                     nilai: "AB"
 *                     status: "lulus"
 *                   - semester_no: 2
 *                     kode: "MA102"
 *                     nama: "Kalkulus II"
 *                     sks: 3
 *                     nilai: "C"
 *                     status: "lulus"
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
 *     TranscriptSearchRequest:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         semester_no:
 *           type: integer
 *           minimum: ""
 *           description: Nomor semester; tidak diisi berarti semua semester.
 *           example: 3
 *         search:
 *           type: string
 *           description: Pencarian parsial pada nama mata kuliah (case-insensitive).
 *           example: "kalkulus"
 *
 *     TranscriptItem:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         semester_no:
 *           type: integer
 *         kode:
 *           type: string
 *         nama:
 *           type: string
 *         sks:
 *           type: integer
 *         nilai:
 *           type: string
 *           nullable: true
 *           description: Indeks huruf (A/AB/B/BC/C/D/E) atau null jika belum ada.
 *         status:
 *           type: string
 *           enum: [Lulus, Tidak Lulus, ""]
 *           description: Normalisasi dari kolom `kelulusan` (kosong jika tidak terdefinisi).
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

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: studentId } = await context.params;
  const supabaseUser = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabaseUser.auth.getUser();

  if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile, error: profErr } = await supabaseUser
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 });

  const isAdmin = profile?.role === "admin";
  const db = isAdmin ? await createAdminClient() : supabaseUser;

  let body: { semester_no?: number; search?: string };
  try {
    body = (await req.json()) ?? {};
  } catch {
    body = {};
  }

  const semesterNo = Number(body?.semester_no ?? 0);
  const search = body?.search?.trim() || null;

  let query = db
    .from("enrollments")
    .select(
      `
      semester_no,
      grade_index,
      kelulusan,
      course:courses!inner(kode, nama, sks)
    `
    )
    .eq("student_id", studentId);

  if (semesterNo && semesterNo > 0) {
    query = query.eq("semester_no", semesterNo);
  }

  if (search && search.length > 0) {
    query = query.ilike("course.nama", `%${search}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const items: TranscriptItem[] = (data ?? [])
    .map((row: any) => {

      return {
        semester_no: Number(row?.semester_no ?? NaN),
        kode: row?.course?.kode ?? "",
        nama: row?.course?.nama ?? "",
        sks: Number(row?.course?.sks ?? 0),
        nilai:
          typeof row?.grade_index === "string"
            ? row.grade_index.trim()
            : row?.grade_index ?? null,
        status: row?.kelulusan ?? "",
      };
    })
    .sort((a, b) => (a.semester_no - b.semester_no) || a.kode.localeCompare(b.kode));

  return NextResponse.json(items, { status: 200 });
}