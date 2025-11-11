/**
 * @swagger
 * /students/{id}/transcript:
 *   post:
 *     summary: Cari/Filter transkrip mahasiswa (by semester & nama MK)
 *     description: |
 *       Mengembalikan daftar mata kuliah (transkrip) untuk mahasiswa tertentu.
 *       - `semester_no`: nomor semester (jika 0 atau tidak diisi → semua semester)
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
 *                     status: "Lulus"
 *                   - semester_no: 2
 *                     kode: "MA102"
 *                     nama: "Kalkulus II"
 *                     sks: 3
 *                     nilai: "C"
 *                     status: "Lulus"
 *       400:
 *         description: Parameter path tidak valid (student id bukan UUID).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               invalid_id: { value: { error: "Invalid student id" } }
 *       401:
 *         description: Unauthorized (tidak ada sesi Supabase).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               no_session: { value: { error: "Unauthorized" } }
 *       403:
 *         description: Forbidden (student mencoba mengakses data milik mahasiswa lain).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               forbidden: { value: { error: "Forbidden" } }
 *       500:
 *         description: Kesalahan server saat query ke Supabase.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               db_error: { value: { error: "relation enrollments does not exist" } }
 *
 *   get:
 *     summary: (Mirror) Cari/Filter transkrip via querystring
 *     description: |
 *       Versi **GET** dari endpoint yang sama menggunakan query:
 *       - `semester_no` (integer, 0 atau tidak diisi → semua semester)
 *       - `search` (string, pencarian nama MK, case-insensitive)
 *       - Memerlukan sesi Supabase yang valid; aturan akses sama seperti metode **POST**.
 *     tags: [Students]
 *     operationId: searchStudentTranscriptViaQuery
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: UUID mahasiswa (kolom `students.id`)
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: semester_no
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 0
 *           example: 2
 *         description: Nomor semester; 0 atau tidak diisi berarti semua semester.
 *       - in: query
 *         name: search
 *         required: false
 *         schema:
 *           type: string
 *           example: "kalkulus"
 *         description: Pencarian parsial pada nama mata kuliah (case-insensitive).
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/TranscriptItem'
 *       400:
 *         description: Parameter path tidak valid (student id bukan UUID).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       401:
 *         description: Unauthorized (tidak ada sesi Supabase).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Forbidden (student mencoba mengakses data milik mahasiswa lain).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       500:
 *         description: Kesalahan server saat query ke Supabase.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *
 * components:
 *   schemas:
 *     TranscriptSearchRequest:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         semester_no:
 *           type: integer
 *           minimum: 0
 *           description: Nomor semester; 0 atau tidak diisi berarti semua semester.
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
 *           enum: ["", "Lulus", "Tidak Lulus"]
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


export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { jsonNoStore, jsonPrivate, isUuidLike } from '@/utils/api';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/lib/supabase';

type TranscriptItem = {
  semester_no: number;
  kode: string;
  nama: string;
  sks: number;
  nilai: string | null;
  status: string;
};

async function fetchTranscript(db: any, studentId: string, semesterNo?: number, search?: string | null) {
  let q = db
    .from('enrollments')
    .select(`
      semester_no,
      grade_index,
      kelulusan,
      course:courses!inner(kode, nama, sks)
    `)
    .eq('student_id', studentId);

  if (Number.isFinite(semesterNo) && (semesterNo ?? 0) > 0) q = q.eq('semester_no', semesterNo);
  if (search && search.length > 0) q = q.ilike('course.nama', `%${search}%`);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  const items: TranscriptItem[] = (data ?? [])
    .map((row: any) => ({
      semester_no: Number(row?.semester_no ?? NaN),
      kode: (row?.course?.kode ?? '').toString(),
      nama: (row?.course?.nama ?? '').toString(),
      sks: Number(row?.course?.sks ?? 0),
      nilai: row?.grade_index == null
        ? null
        : (typeof row.grade_index === 'string' ? row.grade_index.trim() : String(row.grade_index)),
      status: (row?.kelulusan ?? '').toString(),
    }))
    .sort((a: { semester_no: number; kode: string; }, b: { semester_no: number; kode: any; }) => (a.semester_no - b.semester_no) || a.kode.localeCompare(b.kode));

  return items;
}

async function ensureAuthAndOwnership(req: NextRequest, studentId: string) {
  const supabaseUser = await createSupabaseServerClient();
  const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr) return { error: jsonNoStore({ error: userErr.message }, 500) };
  if (!user)   return { error: jsonNoStore({ error: 'Unauthorized' }, 401) };

  const { data: profile, error: profErr } = await supabaseUser
    .from('profiles').select('role, nim').eq('id', user.id).single();
  if (profErr) return { error: jsonNoStore({ error: profErr.message }, 500) };

  const isAdmin = profile?.role === 'admin';
  if (!isAdmin) {
    const { data: own, error: ownErr } = await supabaseUser
      .from('students').select('id').eq('id', studentId).eq('nim', profile?.nim ?? '').maybeSingle();
    if (ownErr) return { error: jsonNoStore({ error: ownErr.message }, 500) };
    if (!own)   return { error: jsonNoStore({ error: 'Forbidden' }, 403) };
  }

  return { supabaseUser, isAdmin };
}

// POST (compat)
export async function POST(req: NextRequest, context: { params: { id: string } }) {
  const studentId = context.params.id;
  if (!studentId || !isUuidLike(studentId)) return jsonNoStore({ error: 'Invalid student id' }, 400);

  const auth = await ensureAuthAndOwnership(req, studentId);
  if ('error' in auth) return auth.error;

  let body: { semester_no?: unknown; search?: unknown } = {};
  try { body = (await req.json()) ?? {}; } catch { /* ignore */ }

  const semesterNo = Number(body?.semester_no ?? 0);
  const search = typeof body?.search === 'string' ? body.search.trim() : null;

  const db = auth.isAdmin ? createAdminClient() : auth.supabaseUser;

  try {
    const items = await fetchTranscript(db, studentId, semesterNo, search);
    return jsonNoStore(items, 200);
  } catch (e: any) {
    return jsonNoStore({ error: e?.message || 'Internal Server Error' }, 500);
  }
}

// GET mirror (cachable privat)
export async function GET(req: NextRequest, context: { params: { id: string } }) {
  const studentId = context.params.id;
  if (!studentId || !isUuidLike(studentId)) return jsonPrivate({ error: 'Invalid student id' }, 400);

  const auth = await ensureAuthAndOwnership(req, studentId);
  if ('error' in auth) {
    const r = auth.error;
    try { return jsonPrivate(await r?.json(), r?.status); } catch { return jsonPrivate({ error: 'Auth error' }, 401); }
  }

  const q = new URL(req.url).searchParams;
  const semesterNo = Number(q.get('semester_no') ?? 0);
  const search = (q.get('search') ?? '').trim() || null;

  const db = auth.isAdmin ? createAdminClient() : auth.supabaseUser;

  try {
    const items = await fetchTranscript(db, studentId, semesterNo, search);
    return jsonPrivate(items, 200);
  } catch (e: any) {
    return jsonPrivate({ error: e?.message || 'Internal Server Error' }, 500);
  }
}
