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
 *       - `current_semester` (integer): semester terakhir mahasiswa (berdasarkan `v_student_cumulative.semester_no` terbaru).
 *       - `total_sks_passed` (integer): total SKS yang **lulus** (dari `enrollments` dengan `status='FINAL'` dan `kelulusan='Lulus'`).
 *       - `ipk_last_semester` (number): IPS semester terakhir (diambil dari `v_student_cumulative.ip_semester` terbaru).
 *       - `courses_passed` (array<string>): daftar **kode** mata kuliah yang lulus (unik), join `enrollments` -> `courses.kode`.
 *
 *       Catatan:
 *       - Endpoint **memerlukan sesi Supabase**.
 *       - Jika user **admin**, query dijalankan dengan service-role (bypass RLS).
 *       - Jika user **student**, hanya dapat mengakses prediksi dirinya sendiri.
 *       - Tambahkan query `?cache=0` untuk memaksa hitung ulang (bypass cache).
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
 *                   description: "Posisi aman. Beban ringan, sisa (~16.0 SKS yang perlu dipenuhi tiap semester. Pertahankan performa tiap semester!"
 *                   stats:
 *                     sks_needed: 144
 *                     semesters_left: 9
 *                     required_pace: 16
 *                     student_capacity: 20
 *       400:
 *         description: Parameter path tidak valid (ID bukan UUID).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalid_id:
 *                 value: { error: "Invalid student id" }
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
 *         description: Forbidden (student mencoba mengakses data milik mahasiswa lain).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               forbidden:
 *                 value: { error: "Forbidden" }
 *       502:
 *         description: Bad Gateway — gagal memanggil AI service atau respons tidak valid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               ai_error:
 *                 value: { error: "AI service error (502): Bad Gateway" }
 *               invalid_payload:
 *                 value: { error: "AI service returned invalid payload" }
 *       500:
 *         description: Kesalahan server (gagal query Supabase atau AI_BASE_URL tidak diset).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               server_error:
 *                 value: { error: "AI_BASE_URL is not configured" }
 *
 * components:
 *   schemas:
 *     AiPredictGraduationResponse:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         status:
 *           type: string
 *           description: Label status prediksi (mis. Aman/Warning/Unsafe)
 *           example: "🟢 Aman"
 *         color:
 *           type: string
 *           description: Warna indikator status (untuk UI)
 *           example: "green"
 *         description:
 *           type: string
 *           description: Penjelasan singkat hasil prediksi
 *           example: "Posisi aman. Beban ringan..."
 *         stats:
 *           type: object
 *           additionalProperties: false
 *           properties:
 *             sks_needed:
 *               type: integer
 *               example: 144
 *             semesters_left:
 *               type: integer
 *               example: 9
 *             required_pace:
 *               type: integer
 *               example: 16
 *             student_capacity:
 *               type: integer
 *               example: 20
 *           required: [sks_needed, semesters_left, required_pace, student_capacity]
 *       required: [status, color, description, stats]
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

import { type NextRequest, NextResponse } from 'next/server';
import { joinUrl, fetchWithTimeout, isUuidLike } from '@/utils/api';
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

type ComputeResult =
  | { status: 200; body: AiPredictGraduationResponse }
  | { status: number; body: { error: string } };

// ---------- 1) PURE compute ----------
async function computePredictGraduationPure(studentId: string): Promise<ComputeResult> {
  const showDebugConsole = process.env.NEXT_PUBLIC_DEBUG_CONSOLE === '1';

  try {
    const db = createAdminClient();

    // A) Ambil semester terakhir + IPS terakhir dari v_student_cumulative
    const { data: lastCum, error: cumErr } = await db
      .from('v_student_cumulative')
      .select('semester_no, ip_semester')
      .eq('student_id', studentId)
      .order('semester_no', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cumErr) return { status: 500, body: { error: cumErr.message } };

    const current_semester = (Number(lastCum?.semester_no ?? 1) || 1) + 1;
    const ipk_last_semester = Number(lastCum?.ip_semester ?? 0) || 0;

    // B) Ambil MK lulus (status FINAL) untuk total_sks_passed + courses_passed
    const { data: passedRows, error: passedErr } = await db
      .from('enrollments')
      .select('sks, course:courses!inner(kode)')
      .eq('student_id', studentId)
      .eq('status', 'FINAL')
      .eq('kelulusan', 'Lulus');

    if (passedErr) return { status: 500, body: { error: passedErr.message } };

    let total_sks_passed = 0;
    const uniqueCodes = new Set<string>();

    for (const r of passedRows ?? []) {
      total_sks_passed += Number((r as any)?.sks ?? 0) || 0;
      const kode = String((r as any)?.course?.kode ?? '').trim();
      if (kode) uniqueCodes.add(kode);
    }

    const courses_passed = Array.from(uniqueCodes);

    // C) Call AI
    const base = process.env.AI_BASE_URL;
    if (!base) return { status: 500, body: { error: 'AI_BASE_URL is not configured' } };

    const payload: AiPredictGraduationPayload = {
      current_semester,
      total_sks_passed,
      ipk_last_semester,
      courses_passed,
    };

    if (showDebugConsole) {
      console.log('[AI PREDICT GRADUATION] Sending payload:', payload);
    }

    const res = await fetchWithTimeout(joinUrl(base, '/predict-graduation/'), {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(payload),
      timeoutMs: 15_000,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return {
        status: 502,
        body: { error: `AI service error (${res.status}): ${text || res.statusText}` },
      };
    }

    const data = await res.json().catch(() => null);
    if (!data || typeof data !== 'object') {
      return { status: 502, body: { error: 'AI service returned invalid payload' } };
    }

    return { status: 200, body: data as AiPredictGraduationResponse };
  } catch (e: any) {
    return { status: 500, body: { error: e?.message || 'Internal Server Error' } };
  }
}

// ---------- 2) Cached wrapper ----------
function cachedPredictGraduation(studentId: string) {
  return unstable_cache(
    async () => computePredictGraduationPure(studentId),
    ['ai:predict-graduation', studentId],
    {
      revalidate: 900,
      tags: ['ai:predict-graduation', `student:${studentId}`],
    },
  );
}

// ---------- 3) Handler: auth & guard DI LUAR cache ----------
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: studentId } = await context.params;

  if (!studentId || !isUuidLike(studentId)) {
    return NextResponse.json({ error: 'Invalid student id' }, { status: 400 });
  }

  const supabaseUser = await createSupabaseServerClient();
  const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 });
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile, error: profErr } = await supabaseUser
    .from('profiles')
    .select('role, nim')
    .eq('id', user.id)
    .single();
  if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 });

  const isAdmin = profile?.role === 'admin';
  if (!isAdmin) {
    const { data: selfStudent, error: selfErr } = await supabaseUser
      .from('students')
      .select('id')
      .eq('id', studentId)
      .eq('nim', profile?.nim ?? '')
      .maybeSingle();
    if (selfErr) return NextResponse.json({ error: selfErr.message }, { status: 500 });
    if (!selfStudent) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const useCache = new URL(req.url).searchParams.get('cache') !== '0';

  const result = useCache
    ? await cachedPredictGraduation(studentId)()
    : await computePredictGraduationPure(studentId);

  if (!useCache) revalidateTag(`student:${studentId}`);

  return NextResponse.json(result.body, { status: result.status });
}
