/**
 * @swagger
 * /students/{id}/recommend:
 *   post:
 *     summary: Ambil rekomendasi mata kuliah dari AI untuk mahasiswa tertentu
 *     description: |
 *       Endpoint ini menyiapkan payload untuk layanan AI berdasarkan data mahasiswa,
 *       lalu **meneruskan** (proxy) respons rekomendasi dari AI ke frontend.
 *
 *       Payload yang dikirim ke AI:
 *       - `current_semester` (integer): semester terakhir/terkini yang terdeteksi dari enrollments mahasiswa.
 *       - `courses_passed` (array<string>): daftar **kode** mata kuliah yang berstatus *Lulus*.
 *
 *       Catatan:
 *       - Endpoint **memerlukan sesi Supabase**.
 *       - Jika user **admin**, query dijalankan dengan service-role (bypass RLS).
 *       - Jika user **student**, hanya dapat mengakses rekomendasi dirinya sendiri.
 *       - Tambahkan query `?cache=0` untuk memaksa hitung ulang (bypass cache).
 *       - Tidak membutuhkan request body; `id` di path digunakan untuk membangun payload.
 *     tags: [Students, Recommendation]
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
 *             examples:
 *               sample:
 *                 summary: Contoh hasil rekomendasi
 *                 value:
 *                   - rank: 1
 *                     code: "AAK3BAB3"
 *                     name: "Sistem Komunikasi 1"
 *                     sks: 3
 *                     semester_plan: 5
 *                     reason: "Rekomendasi semester ini"
 *                     priority_score: 0.6
 *                     is_tertinggal: false
 *                     prerequisites:
 *                       - { code: "AZK2AAB3", name: "Probabilitas dan Statistika" }
 *                       - { code: "AZK2GAB3", name: "Pengolahan Sinyal Waktu Kontinyu" }
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
 *               ai_down:
 *                 value: { error: "AI service returned non-array payload" }
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
 *     AiRecommendationItem:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         rank:
 *           type: integer
 *           example: 1
 *         code:
 *           type: string
 *           example: "AAK3BAB3"
 *         name:
 *           type: string
 *           example: "Sistem Komunikasi 1"
 *         sks:
 *           type: integer
 *           example: 3
 *         semester_plan:
 *           type: integer
 *           example: 5
 *         reason:
 *           type: string
 *           example: "Rekomendasi semester ini"
 *         is_tertinggal:
 *           type: boolean
 *           description: Menunjukkan apakah mata kuliah ini termasuk yang tertinggal dari semester sebelumnya.
 *           example: false
 *         priority_score:
 *           type: number
 *           example: 0.6
 *         prerequisites:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               code:
 *                 type: string
 *                 example: "AZK2AAB3"
 *               name:
 *                 type: string
 *                 example: "Probabilitas dan Statistika"
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

// ---------- 1) PURE compute ----------
async function computeRecommendPure(studentId: string): Promise<ComputeResult> {
  try {
    const db = createAdminClient();

    // Ambil semester terakhir
    const { data: latestSem, error: latestErr } = await db
      .from('enrollments')
      .select('semester_no')
      .eq('student_id', studentId)
      .order('semester_no', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestErr) return { status: 500, body: { error: latestErr.message } };

    const current_semester = Number(latestSem?.semester_no ?? 1) || 1;

    // Ambil MK lulus unik
    const { data: passedRows, error: passedErr } = await db
      .from('enrollments')
      .select('kelulusan, course:courses!inner(kode)')
      .eq('student_id', studentId)
      .eq('kelulusan', 'Lulus');
    if (passedErr) return { status: 500, body: { error: passedErr.message } };

    const courses_passed = Array.from(
      new Set(
        (passedRows ?? [])
          .map((r: any) => (r?.course?.kode ?? '').toString().trim())
          .filter((k: string) => k.length > 0),
      ),
    );

    // Call AI
    const base = process.env.AI_BASE_URL;
    if (!base) return { status: 500, body: { error: 'AI_BASE_URL is not configured' } };

    const res = await fetchWithTimeout(joinUrl(base, '/recommend/'), {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ current_semester, courses_passed }),
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
    if (!Array.isArray(data)) {
      return { status: 502, body: { error: 'AI service returned non-array payload' } };
    }

    return { status: 200, body: data as AiRecommendationItem[] };
  } catch (e: any) {
    return { status: 500, body: { error: e?.message || 'Internal Server Error' } };
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
export async function POST(req: NextRequest, context: { params: { id: string } }) {
  const studentId = context.params.id;
  if (!studentId || !isUuidLike(studentId)) {
    return NextResponse.json({ error: 'Invalid student id' }, { status: 400 });
  }

  const supabaseUser = await createSupabaseServerClient();
  const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 });
  if (!user)   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
    ? await cachedRecommend(studentId)()
    : await computeRecommendPure(studentId);

  if (!useCache) {
    revalidateTag(`student:${studentId}`);
  }

  return NextResponse.json(result.body, { status: result.status });
}
