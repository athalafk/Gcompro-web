/**
 * @swagger
 * /students/{id}/predict-graduation:
 *   post:
 *     summary: Prediksi kelulusan tepat waktu (≤ 8 semester) untuk mahasiswa (proxy ke AI)
 *     description: |
 *       Endpoint ini menyiapkan payload dari data akademik mahasiswa, lalu **meneruskan** (proxy)
 *       respons prediksi dari AI service (`POST /predict-graduation/`) ke frontend.
 *
 *       Payload yang dikirim ke AI:
 *       - `current_semester` (integer): semester saat ini (last_semester_no + 1).
 *       - `total_sks_passed` (integer): total SKS yang **lulus** (`enrollments.status='FINAL'` dan `kelulusan='Lulus'`).
 *       - `ipk_last_semester` (number): IPS semester terakhir (diambil dari `semester_stats.ips` pada `semester_no` terakhir).
 *       - `courses_passed` (array<string>): daftar **kode** mata kuliah yang lulus (unik),
 *         join `enrollments` -> `courses.kode`.
 *
 *       Catatan akses:
 *       - Endpoint **memerlukan sesi Supabase**.
 *       - Jika user **admin**, query dijalankan dengan service-role (bypass RLS).
 *       - Jika user **student**, hanya dapat mengakses prediksi dirinya sendiri.
 *
 *       Caching:
 *       - Secara default hasil prediksi **menggunakan cache server** (revalidate 900 detik).
 *       - Tambahkan `?cache=0` untuk memaksa hitung ulang dan menginvalisasi cache `student:{id}`.
 *     tags: [Students, AI]
 *     operationId: predictStudentGraduation
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: UUID mahasiswa (kolom `students.id`)
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: cache
 *         required: false
 *         description: "Kontrol cache: '0' untuk menonaktifkan cache; omit atau nilai lain untuk menggunakan cache."
 *         schema:
 *           type: string
 *           enum: ["0", "1"]
 *           default: "1"
 *     requestBody:
 *       required: false
 *     responses:
 *       200:
 *         description: OK — respons langsung dari AI service.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AiPredictGraduationResponse'
 *             examples:
 *               sample:
 *                 summary: Contoh hasil prediksi kelulusan tepat waktu
 *                 value:
 *                   status: "🟢 Aman"
 *                   color: "green"
 *                   description: "Posisi aman. Beban ringan..."
 *                   stats:
 *                     sks_needed: 144
 *                     semesters_left: 3
 *                     required_pace: 16
 *                     student_capacity: 20
 *       400:
 *         description: Parameter path tidak valid (ID bukan UUID).
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
 *       502:
 *         description: Bad Gateway — gagal memanggil AI service atau respons tidak valid.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               ai_error: { value: { error: "AI service error (502): Bad Gateway" } }
 *               invalid_payload: { value: { error: "AI service returned invalid payload" } }
 *       500:
 *         description: Kesalahan server (gagal query Supabase atau AI_BASE_URL tidak diset).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               server_error: { value: { error: "AI_BASE_URL is not configured" } }
 *
 *   get:
 *     summary: (Mirror) Prediksi kelulusan tepat waktu via querystring (private cache)
 *     description: |
 *       Versi **GET** dari endpoint yang sama menggunakan query:
 *       - `cache=0` untuk bypass cache (force recompute).
 *       - Aturan akses sama seperti metode **POST**.
 *     tags: [Students, AI]
 *     operationId: predictStudentGraduationViaQuery
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: UUID mahasiswa (kolom `students.id`)
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: cache
 *         required: false
 *         description: "Kontrol cache: '0' untuk menonaktifkan cache; omit atau nilai lain untuk menggunakan cache."
 *         schema:
 *           type: string
 *           enum: ["0", "1"]
 *           default: "1"
 *     responses:
 *       200:
 *         description: OK — respons langsung dari AI service.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AiPredictGraduationResponse'
 *       400:
 *         description: Parameter path tidak valid (ID bukan UUID).
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
 *       502:
 *         description: Bad Gateway — gagal memanggil AI service atau respons tidak valid.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       500:
 *         description: Kesalahan server.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *
 * components:
 *   schemas:
 *     AiPredictGraduationResponse:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         status: { type: string, example: "🟢 Aman" }
 *         color:  { type: string, example: "green" }
 *         description: { type: string, example: "Posisi aman. Beban ringan..." }
 *         stats:
 *           type: object
 *           additionalProperties: false
 *           properties:
 *             sks_needed: { type: integer, example: 144 }
 *             semesters_left: { type: integer, example: 3 }
 *             required_pace: { type: integer, example: 16 }
 *             student_capacity: { type: integer, example: 20 }
 *           required: [sks_needed, semesters_left, required_pace, student_capacity]
 *       required: [status, color, description, stats]
 *
 *     ErrorResponse:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         error: { type: string }
 *       required: [error]
 */

export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { jsonNoStore, jsonPrivate, isUuidLike, joinUrl, fetchWithTimeout } from '@/utils/api';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/lib/supabase';
import { unstable_cache, revalidateTag } from '@/utils/cache';

type AiPredictGraduationPayload = {
  current_semester: number;
  total_sks_passed: number;
  ipk_last_semester: number;
  courses_passed: string[];
};

type AiPredictGraduationResponse = {
  status: string;
  color: string;
  description: string;
  stats: {
    sks_needed: number;
    semesters_left: number;
    required_pace: number;
    student_capacity: number;
  };
};

type SemesterStatsRow = { semester_no: number | null; ips: number | null };
type CumRow = { last_semester_no: number | null };
type PassedRow = { sks: number | null; course?: { kode: string | null } | null };

async function ensureAuthAndOwnership(studentId: string) {
  const supabaseUser = await createSupabaseServerClient();

  const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr) return { error: jsonNoStore({ error: userErr.message }, 500) };
  if (!user) return { error: jsonNoStore({ error: 'Unauthorized' }, 401) };

  const { data: profile, error: profErr } = await supabaseUser
    .from('profiles')
    .select('role, nim')
    .eq('id', user.id)
    .single();

  if (profErr) return { error: jsonNoStore({ error: profErr.message }, 500) };

  const isAdmin = profile?.role === 'admin';

  if (!isAdmin) {
    const { data: own, error: ownErr } = await supabaseUser
      .from('students')
      .select('id')
      .eq('id', studentId)
      .eq('nim', profile?.nim ?? '')
      .maybeSingle();

    if (ownErr) return { error: jsonNoStore({ error: ownErr.message }, 500) };
    if (!own) return { error: jsonNoStore({ error: 'Forbidden' }, 403) };
  }

  return { supabaseUser, isAdmin };
}

async function computePredictGraduation(studentId: string) {
  const db = createAdminClient();

  // 1) current_semester = cumulative_stats.last_semester_no + 1 (fallback ke semester_stats)
  const { data: cum, error: cumErr } = await db
    .from('cumulative_stats')
    .select('semester_no')
    .eq('student_id', studentId)
    .maybeSingle<CumRow>();

  if (cumErr) return { status: 500, body: { error: cumErr.message } };

  let lastSemesterNo = Number(cum?.last_semester_no ?? 0) || 0;

  // fallback kalau null/0: ambil semester_no terbesar dari semester_stats
  if (!lastSemesterNo) {
    const { data: semRows, error: semErr } = await db
      .from('semester_stats')
      .select('semester_no')
      .eq('student_id', studentId)
      .not('semester_no', 'is', null)
      .order('semester_no', { ascending: false })
      .limit(1)
      .returns<Array<{ semester_no: number | null }>>();

    if (semErr) return { status: 500, body: { error: semErr.message } };
    lastSemesterNo = Number(semRows?.[0]?.semester_no ?? 0) || 0;
  }

  const { data: currentSem, error: curErr } = await db
    .rpc('get_student_current_semester_for_ai', { p_student_id: studentId });

  if (curErr) return { status: 500, body: { error: curErr.message } };

  const current_semester = Number(currentSem ?? 1) || 1;

  // 2) ipk_last_semester (nama field AI) = IPS terakhir dari semester_stats
  const { data: lastIpsRows, error: lastIpsErr } = await db
    .from('semester_stats')
    .select('semester_no, ips')
    .eq('student_id', studentId)
    .not('semester_no', 'is', null)
    .order('semester_no', { ascending: false })
    .limit(1)
    .returns<SemesterStatsRow[]>();

  if (lastIpsErr) return { status: 500, body: { error: lastIpsErr.message } };

  const ipk_last_semester = Number(lastIpsRows?.[0]?.ips ?? 0) || 0;

  // 3) total_sks_passed + courses_passed (FINAL & Lulus)
  const { data: passedRows, error: passedErr } = await db
    .from('enrollments')
    .select('sks, course:courses!inner(kode)')
    .eq('student_id', studentId)
    .eq('status', 'FINAL')
    .eq('kelulusan', 'Lulus')
    .returns<PassedRow[]>();

  if (passedErr) return { status: 500, body: { error: passedErr.message } };

  let total_sks_passed = 0;
  const codes = new Set<string>();

  for (const r of passedRows ?? []) {
    total_sks_passed += Number(r?.sks ?? 0) || 0;
    const kode = String(r?.course?.kode ?? '').trim();
    if (kode) codes.add(kode);
  }

  const courses_passed = Array.from(codes);

  // 4) call AI
  const base = process.env.AI_BASE_URL;
  if (!base) return { status: 500, body: { error: 'AI_BASE_URL is not configured' } };

  const payload: AiPredictGraduationPayload = {
    current_semester,
    total_sks_passed,
    ipk_last_semester,
    courses_passed,
  };

  const res = await fetchWithTimeout(joinUrl(base, '/predict-graduation/'), {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(payload),
    timeoutMs: 15_000,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { status: 502, body: { error: `AI service error (${res.status}): ${text || res.statusText}` } };
  }

  const data = (await res.json().catch(() => null)) as unknown;
  if (!data || typeof data !== 'object') {
    return { status: 502, body: { error: 'AI service returned invalid payload' } };
  }

  return { status: 200, body: data as AiPredictGraduationResponse };
}

// cache per studentId + tag per studentId
function cachedPredictGraduation(studentId: string) {
  return unstable_cache(
    async () => computePredictGraduation(studentId),
    ['ai:predict-graduation', studentId],
    { revalidate: 900, tags: ['ai:predict-graduation', `student:${studentId}`] },
  )();
}

// POST (no-store)
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: studentId } = await context.params;
  if (!studentId || !isUuidLike(studentId)) return jsonNoStore({ error: 'Invalid student id' }, 400);

  const auth = await ensureAuthAndOwnership(studentId);
  if ('error' in auth) return auth.error;

  const useCache = new URL(req.url).searchParams.get('cache') !== '0';

  const result = useCache ? await cachedPredictGraduation(studentId) : await computePredictGraduation(studentId);

  if (!useCache) revalidateTag(`student:${studentId}`);

  return jsonNoStore(result.body, result.status);
}

// GET mirror (private cache)
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: studentId } = await context.params;
  if (!studentId || !isUuidLike(studentId)) return jsonPrivate({ error: 'Invalid student id' }, 400);

  const auth = await ensureAuthAndOwnership(studentId);
  if ('error' in auth) {
    const r = auth.error;
    try { return jsonPrivate(await r?.json(), r?.status); } catch { return jsonPrivate({ error: 'Auth error' }, 401); }
  }

  const useCache = new URL(req.url).searchParams.get('cache') !== '0';

  const result = useCache ? await cachedPredictGraduation(studentId) : await computePredictGraduation(studentId);

  if (!useCache) revalidateTag(`student:${studentId}`);

  return jsonPrivate(result.body, result.status);
}
