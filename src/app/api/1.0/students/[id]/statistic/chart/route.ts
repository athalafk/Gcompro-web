/**
 * @swagger
 * /students/{id}/statistic/chart:
 *   get:
 *     summary: Data chart IPS/IPK dan distribusi nilai kumulatif untuk seorang mahasiswa
 *     description: |
 *       Mengembalikan dua set data untuk visualisasi:
 *       - **line**: tren **IPK kumulatif** dan **IPS** per semester (sinkron pada domain `semester_no`)
 *       - **pie**: distribusi indeks nilai kumulatif terbaru (A, AB, B, BC, C, D, E)
 *
 *       Sumber data:
 *       - `v_student_semester_scores` → (semester_no, ips)
 *       - `v_student_cumulative` → (semester_no, ipk_cum)
 *       - `v_student_grade_distribution` → (dist_a, dist_ab, dist_b, dist_bc, dist_c, dist_d, dist_e) pada `semester_no` terakhir
 *
 *       Endpoint **memerlukan sesi Supabase yang valid**.
 *       Jika user **admin**, pembacaan dilakukan dengan service-role (bypass RLS) untuk akses lintas mahasiswa.
 *     tags: [Students]
 *     operationId: getStudentStatisticChart
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
 *               $ref: '#/components/schemas/ChartResponse'
 *             examples:
 *               sample:
 *                 value:
 *                   line:
 *                     categories: [1, 2, 3, 4]
 *                     series:
 *                       - name: "IPK"
 *                         data: [3.12, 3.10, 3.15, 3.18]
 *                       - name: "IPS"
 *                         data: [3.12, 3.08, 3.30, 3.22]
 *                   pie:
 *                     labels: ["A", "AB", "B", "BC", "C", "D", "E"]
 *                     series: [10, 4, 8, 2, 3, 0, 0]
 *       400:
 *         description: Parameter path tidak valid (student id bukan UUID).
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
 *       500:
 *         description: Kesalahan server saat query ke Supabase/view terkait.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               db_error:
 *                 value: { error: "relation v_student_semester_scores does not exist" }
 *
 * components:
 *   schemas:
 *     ChartResponse:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         line:
 *           $ref: '#/components/schemas/LinePayload'
 *         pie:
 *           $ref: '#/components/schemas/PiePayload'
 *       required: [line, pie]
 *
 *     LinePayload:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         categories:
 *           type: array
 *           items:
 *             type: integer
 *           description: Daftar `semester_no` terurut naik.
 *         series:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/LineSeriesItem'
 *       required: [categories, series]
 *
 *     LineSeriesItem:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         name:
 *           type: string
 *           enum: ["IPK", "IPS"]
 *         data:
 *           type: array
 *           items:
 *             type: number
 *             nullable: true
 *           description: Nilai per `semester_no` yang selaras dengan `categories`.
 *       required: [name, data]
 *
 *     PiePayload:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         labels:
 *           type: array
 *           items:
 *             type: string
 *           example: ["A", "AB", "B", "BC", "C", "D", "E"]
 *         series:
 *           type: array
 *           items:
 *             type: number
 *           description: Banyaknya matakuliah per label nilai dengan urutan sama seperti `labels`.
 *       required: [labels, series]
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
import { jsonPrivate, isUuidLike } from '@/utils/api';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/lib/supabase';

type LinePayload = {
  categories: number[];
  series: Array<{ name: string; data: (number | null)[] }>;
};
type PiePayload = { labels: string[]; series: number[] };
type ChartResponse = { line: LinePayload; pie: PiePayload };

export async function GET(_req: NextRequest, context: { params: { id: string } }) {
  const { id: studentId } = await context.params;
  if (!studentId || !isUuidLike(studentId)) return jsonPrivate({ error: 'Invalid student id' }, 400);

  try {
    const supabaseUser = await createSupabaseServerClient();
    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr) return jsonPrivate({ error: userErr.message }, 500);
    if (!user)   return jsonPrivate({ error: 'Unauthorized' }, 401);

    const { data: profile, error: profErr } = await supabaseUser
      .from('profiles').select('role, nim').eq('id', user.id).single();
    if (profErr) return jsonPrivate({ error: profErr.message }, 500);

    const isAdmin = profile?.role === 'admin';
    if (!isAdmin) {
      const { data: own, error: ownErr } = await supabaseUser
        .from('students').select('id').eq('id', studentId).eq('nim', profile?.nim ?? '').maybeSingle();
      if (ownErr) return jsonPrivate({ error: ownErr.message }, 500);
      if (!own)   return jsonPrivate({ error: 'Forbidden' }, 403);
    }

    const db = isAdmin ? createAdminClient() : supabaseUser;

    // 1) IPS trend
    const { data: ipsRows, error: ipsErr } = await db
      .from('v_student_semester_scores')
      .select('semester_no, ips')
      .eq('student_id', studentId)
      .order('semester_no', { ascending: true });
    if (ipsErr) return jsonPrivate({ error: ipsErr.message }, 500);

    const ipsTrend = (ipsRows ?? []).map((r: any) => ({
      semester_no: Number(r.semester_no),
      ips: r.ips == null ? null : Number(r.ips),
    }));

    // 2) IPK kumulatif
    const { data: cumRows, error: cumErr } = await db
      .from('v_student_cumulative')
      .select('semester_no, ipk_cum')
      .eq('student_id', studentId)
      .order('semester_no', { ascending: true });
    if (cumErr) return jsonPrivate({ error: cumErr.message }, 500);

    const allSemNos = Array.from(new Set([
      ...ipsTrend.map((x) => x.semester_no),
      ...((cumRows ?? []).map((x: any) => Number(x.semester_no))),
    ])).sort((a, b) => a - b);

    const seriesIPS = allSemNos.map((no) => ipsTrend.find((x) => x.semester_no === no)?.ips ?? null);
    const seriesIPK = allSemNos.map((no) => {
      const hit = (cumRows ?? []).find((x: any) => Number(x.semester_no) === no);
      return hit?.ipk_cum == null ? null : Number(hit.ipk_cum);
    });

    const line: LinePayload = {
      categories: allSemNos,
      series: [
        { name: 'IPK', data: seriesIPK },
        { name: 'IPS', data: seriesIPS },
      ],
    };

    // 3) Pie distribusi nilai terakhir
    const { data: lastDist, error: distErr } = await db
      .from('v_student_grade_distribution')
      .select('semester_no, dist_a, dist_ab, dist_b, dist_bc, dist_c, dist_d, dist_e')
      .eq('student_id', studentId)
      .order('semester_no', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (distErr) return jsonPrivate({ error: distErr.message }, 500);

    const pie: PiePayload = {
      labels: ['A', 'AB', 'B', 'BC', 'C', 'D', 'E'],
      series: [
        Number(lastDist?.dist_a ?? 0),
        Number(lastDist?.dist_ab ?? 0),
        Number(lastDist?.dist_b ?? 0),
        Number(lastDist?.dist_bc ?? 0),
        Number(lastDist?.dist_c ?? 0),
        Number(lastDist?.dist_d ?? 0),
        Number(lastDist?.dist_e ?? 0),
      ],
    };

    const payload: ChartResponse = { line, pie };
    return jsonPrivate(payload, 200);
  } catch (e: any) {
    return jsonPrivate({ error: e?.message || 'Internal Server Error' }, 500);
  }
}
