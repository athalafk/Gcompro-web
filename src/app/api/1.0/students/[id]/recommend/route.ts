/**
 * @swagger
 * /students/{id}/recommend:
 *   post:
 *     summary: Ambil rekomendasi mata kuliah dari AI untuk mahasiswa tertentu
 *     description: |
 *       Endpoint ini menyiapkan payload untuk layanan AI berdasarkan data akademik mahasiswa,
 *       lalu **meneruskan** (proxy) respons rekomendasi dari AI ke frontend.
 *
 *       Payload yang dikirim ke AI:
 *       - `current_semester` (integer): semester terkini untuk AI, dihitung oleh function database
 *         `public.get_student_current_semester_for_ai(p_student_id)` (active semester + cek FINAL).
 *       - `courses_passed` (array<string>): daftar **kode** mata kuliah yang berstatus **Lulus**,
 *         unik, dari `enrollments` dengan `status='FINAL'` dan `kelulusan='Lulus'`.
 *         Untuk mata kuliah pilihan (courses.mk_pilihan=true), kodenya **dinormalisasi** menjadi:
 *         `MK_PILIHAN1`, `MK_PILIHAN2`, dst sesuai jumlah MK pilihan yang lulus.
 *       - `mk_pilihan_failed` (array<string>): daftar kode MK pilihan yang **Tidak Lulus** (FINAL),
 *         unik. (Tetap dikirim sesuai kontrak AI yang kamu pakai sekarang.)
 *
 *       Catatan:
 *       - Endpoint **memerlukan sesi Supabase**.
 *       - Jika user **admin**, query dijalankan dengan service-role (bypass RLS).
 *       - Jika user **student**, hanya dapat mengakses rekomendasi dirinya sendiri.
 *       - Tambahkan query `?cache=0` untuk memaksa hitung ulang (bypass cache) dan invalidasi tag `student:{id}`.
 *       - Tidak membutuhkan request body.
 *     tags: [Students, AI]
 *     operationId: getStudentCourseRecommendations
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
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AiRecommendationItem'
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
 *         description: Kesalahan server (gagal query Supabase atau AI_BASE_URL tidak diset).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *
 *   get:
 *     summary: (Mirror) Ambil rekomendasi mata kuliah via querystring (private cache)
 *     description: |
 *       Versi **GET** dari endpoint yang sama.
 *       - Response sama seperti POST.
 *       - Gunakan `?cache=0` untuk force recompute.
 *     tags: [Students, AI]
 *     operationId: getStudentCourseRecommendationsViaQuery
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
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AiRecommendationItem'
 *       400:
 *         description: Parameter path tidak valid.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       401:
 *         description: Unauthorized.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Forbidden.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       502:
 *         description: Bad Gateway.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       500:
 *         description: Server error.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *
 * components:
 *   schemas:
 *     AiRecommendationItem:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         rank: { type: integer, example: 1 }
 *         code: { type: string, example: "AAK3BAB3" }
 *         name: { type: string, example: "Sistem Komunikasi 1" }
 *         sks: { type: integer, example: 3 }
 *         semester_plan: { type: integer, example: 5 }
 *         reason: { type: string, example: "Rekomendasi semester ini" }
 *         is_tertinggal: { type: boolean, example: false }
 *         priority_score: { type: number, example: 0.6 }
 *         prerequisites:
 *           type: array
 *           items:
 *             type: object
 *             additionalProperties: false
 *             properties:
 *               code: { type: string, example: "AZK2AAB3" }
 *               name: { type: string, example: "Probabilitas dan Statistika" }
 *       required: [rank, code, name, sks, semester_plan, reason, is_tertinggal, priority_score]
 *
 *     ErrorResponse:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         error: { type: string }
 *       required: [error]
 */

export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';
import { joinUrl, fetchWithTimeout, isUuidLike, jsonPrivate, jsonNoStore } from '@/utils/api';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/lib/supabase';
import { unstable_cache, revalidateTag } from '@/utils/cache';

type AiRecommendationItem = {
  rank: number;
  code: string;
  name: string;
  sks: number;
  semester_plan: number;
  reason: string;
  is_tertinggal: boolean;
  priority_score: number;
  prerequisites?: Array<{ code: string; name: string }>;
};

type ComputeResult =
  | { status: 200; body: AiRecommendationItem[] }
  | { status: number; body: { error: string } };

// ---- DB row typings (no any) ----
type PassedRow = {
  course: { kode: string | null; mk_pilihan: boolean | null } | null;
};
type FailedRow = {
  course: { kode: string | null; mk_pilihan: boolean | null } | null;
};

// ---------- 1) PURE compute ----------
async function computeRecommendPure(studentId: string): Promise<ComputeResult> {
  const showDebugConsole = process.env.NEXT_PUBLIC_DEBUG_CONSOLE === '1';

  try {
    const db = createAdminClient();

    // A) current_semester: source of truth via function DB
    const { data: currentSem, error: curErr } = await db.rpc(
      'get_student_current_semester_for_ai',
      { p_student_id: studentId },
    );
    if (curErr) return { status: 500, body: { error: curErr.message } };

    const current_semester = Number(currentSem ?? 1) || 1;

    // B) MK lulus unik (FINAL & Lulus)
    const { data: passedRows, error: passedErr } = await db
      .from('enrollments')
      .select('course:courses!inner(kode, mk_pilihan)')
      .eq('student_id', studentId)
      .eq('status', 'FINAL')
      .eq('kelulusan', 'Lulus')
      .returns<PassedRow[]>();

    if (passedErr) return { status: 500, body: { error: passedErr.message } };

    // C) MK pilihan yang tidak lulus (FINAL & Tidak Lulus) — tetap dikirim ke AI
    const { data: failedRows, error: failedErr } = await db
      .from('enrollments')
      .select('course:courses!inner(kode, mk_pilihan)')
      .eq('student_id', studentId)
      .eq('status', 'FINAL')
      .eq('kelulusan', 'Tidak Lulus')
      .returns<FailedRow[]>();

    if (failedErr) return { status: 500, body: { error: failedErr.message } };

    // ---- Normalisasi courses_passed untuk AI ----
    // - Regular: pakai kode asli (trim)
    // - Elective (mk_pilihan=true): ganti jadi MK_PILIHAN1..n sesuai jumlah elective yang lulus
    const passedRegularCodes = new Set<string>();
    const passedElectiveCodes: string[] = [];

    for (const r of passedRows ?? []) {
      const kode = String(r?.course?.kode ?? '').trim();
      if (!kode) continue;

      const isPilihan = r?.course?.mk_pilihan === true;
      if (isPilihan) passedElectiveCodes.push(kode);
      else passedRegularCodes.add(kode);
    }

    // bikin deterministik (biar cache stabil)
    const regularSorted = Array.from(passedRegularCodes).sort((a, b) => a.localeCompare(b));
    const electiveSorted = Array.from(new Set(passedElectiveCodes)).sort((a, b) => a.localeCompare(b));

    const courses_passed_for_ai: string[] = [
      ...regularSorted,
      ...electiveSorted.map((_, idx) => `MK_PILIHAN${idx + 1}`),
    ];

    // ---- mk_pilihan_failed deterministik ----
    const mk_pilihan_failed = Array.from(
      new Set(
        (failedRows ?? [])
          .filter((r) => r?.course?.mk_pilihan === true)
          .map((r) => String(r?.course?.kode ?? '').trim())
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b));

    // D) Call AI
    const base = process.env.AI_BASE_URL;
    if (!base) return { status: 500, body: { error: 'AI_BASE_URL is not configured' } };

    const payload = {
      current_semester,
      courses_passed: courses_passed_for_ai,
      mk_pilihan_failed,
    };

    if (showDebugConsole) {
      console.log('[AI RECOMMEND] Sending payload:', {
        studentId,
        current_semester,
        courses_passed_count: courses_passed_for_ai.length,
        mk_pilihan_failed_count: mk_pilihan_failed.length,
      });
    }

    const res = await fetchWithTimeout(joinUrl(base, '/recommend/'), {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify(payload),
      timeoutMs: 15_000,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { status: 502, body: { error: `AI service error (${res.status}): ${text || res.statusText}` } };
    }

    const data = await res.json().catch(() => null);
    if (!Array.isArray(data)) {
      return { status: 502, body: { error: 'AI service returned non-array payload' } };
    }

    return { status: 200, body: data as AiRecommendationItem[] };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Internal Server Error';
    return { status: 500, body: { error: msg } };
  }
}

// ---------- 2) Cached wrapper (key+tag per student) ----------
function cachedRecommend(studentId: string) {
  return unstable_cache(
    async () => computeRecommendPure(studentId),
    ['ai:recommend', studentId],
    {
      revalidate: 900,
      tags: ['ai:recommend', `student:${studentId}`],
    },
  );
}

// ---------- 3) Handler: auth & guard DI LUAR cache ----------
async function ensureAuthAndOwnership(studentId: string) {
  const supabaseUser = await createSupabaseServerClient();
  const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr) return { error: NextResponse.json({ error: userErr.message }, { status: 500 }) };
  if (!user)   return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const { data: profile, error: profErr } = await supabaseUser
    .from('profiles')
    .select('role, nim')
    .eq('id', user.id)
    .single();

  if (profErr) return { error: NextResponse.json({ error: profErr.message }, { status: 500 }) };

  const isAdmin = profile?.role === 'admin';
  if (!isAdmin) {
    const { data: selfStudent, error: selfErr } = await supabaseUser
      .from('students')
      .select('id')
      .eq('id', studentId)
      .eq('nim', profile?.nim ?? '')
      .maybeSingle();

    if (selfErr) return { error: NextResponse.json({ error: selfErr.message }, { status: 500 }) };
    if (!selfStudent) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { ok: true as const };
}

// POST (no-store)
export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: studentId } = await context.params;

  if (!studentId || !isUuidLike(studentId)) {
    return NextResponse.json({ error: 'Invalid student id' }, { status: 400 });
  }

  const auth = await ensureAuthAndOwnership(studentId);
  if ('error' in auth) return auth.error;

  const useCache = new URL(req.url).searchParams.get('cache') !== '0';

  const result = useCache
    ? await cachedRecommend(studentId)()
    : await computeRecommendPure(studentId);

  if (!useCache) revalidateTag(`student:${studentId}`);

    return jsonNoStore(result.body, result.status);
}

// GET mirror (private cache)
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: studentId } = await context.params;

  if (!studentId || !isUuidLike(studentId)) {
    return NextResponse.json({ error: 'Invalid student id' }, { status: 400 });
  }

  const auth = await ensureAuthAndOwnership(studentId);
  if ('error' in auth) return auth.error;

  const useCache = new URL(req.url).searchParams.get('cache') !== '0';

  const result = useCache
    ? await cachedRecommend(studentId)()
    : await computeRecommendPure(studentId);

  if (!useCache) revalidateTag(`student:${studentId}`);

  return jsonPrivate(result.body, result.status);
}
