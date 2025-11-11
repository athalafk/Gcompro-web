/**
 * @swagger
 * /students/{id}/analyze:
 *   post:
 *     summary: Analisis risiko untuk 1 mahasiswa (jalankan AI, simpan hasil, lalu kembalikan ringkasan)
 *     description: |
 *       Server akan mengekstrak fitur internal, memanggil service AI eksternal untuk prediksi,
 *       menyimpan ringkasan ke tabel `ml_features` dan `advice`, lalu mengembalikan hasil (fitur + AI + metadata).
 *       - Caching: secara default hasil dianalisis dengan cache. Tambahkan `?cache=0` untuk memaksa hitung ulang.
 *     tags: [Students, AI]
 *     operationId: analyzeStudent
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: UUID mahasiswa (kolom `students.id`).
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: cache
 *         required: false
 *         description: "Kontrol cache: '0' menonaktifkan cache untuk request ini; nilai lain/omit menggunakan cache."
 *         schema:
 *           type: string
 *           enum: ["0", "1"]
 *           default: "1"
 *     requestBody:
 *       required: false
 *     responses:
 *       200:
 *         description: Hasil analisis berhasil dibuat dan (jika perlu) disimpan.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AnalyzeResponse'
 *             examples:
 *               success:
 *                 summary: Contoh hasil sukses
 *                 value:
 *                   feat:
 *                     IPK_Terakhir: 3.12
 *                     IPS_Terakhir: 2.88
 *                     Jumlah_MK_Gagal: 1
 *                     Total_SKS_Gagal: 3
 *                   ai:
 *                     prediction: "HIGH"
 *                     probabilities:
 *                       HIGH: 0.72
 *                       MED: 0.20
 *                       LOW: 0.08
 *                   meta:
 *                     semester_id: "8d8b3a3e-1a9a-4dcd-9b9f-5b0f7d7a1b2c"
 *                     created_at: "2025-10-17T10:25:43.321Z"
 *       400:
 *         description: Parameter path tidak valid (mis. student id bukan UUID).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalid_id:
 *                 value:
 *                   error: "Invalid student id"
 *       502:
 *         description: Gagal memanggil service AI (bad gateway ke model server).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               ai_bad_gateway:
 *                 value:
 *                   error: "AI service error (405): Method Not Allowed"
 *       500:
 *         description: Kesalahan server internal (mis-konfigurasi env, error Supabase, dsb).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorWithDetails'
 *             examples:
 *               internal_error:
 *                 value:
 *                   error: "Internal Server Error"
 *                   details: "AI_BASE_URL is not set"
 *
 * components:
 *   schemas:
 *     AnalyzeResponse:
 *       type: object
 *       properties:
 *         feat:
 *           $ref: '#/components/schemas/Features'
 *         ai:
 *           $ref: '#/components/schemas/AiResponse'
 *         meta:
 *           $ref: '#/components/schemas/Meta'
 *       required: [feat, ai]
 *
 *     Features:
 *       type: object
 *       description: Output dari extractFeatures(studentId). Tambahkan field lain bila ada.
 *       properties:
 *         IPK_Terakhir:
 *           type: number
 *         IPS_Terakhir:
 *           type: number
 *         Jumlah_MK_Gagal:
 *           type: integer
 *         Total_SKS_Gagal:
 *           type: integer
 *       additionalProperties: true
 *       example:
 *         IPK_Terakhir: 3.12
 *         IPS_Terakhir: 2.88
 *         Jumlah_MK_Gagal: 1
 *         Total_SKS_Gagal: 3
 *
 *     AiResponse:
 *       type: object
 *       properties:
 *         prediction:
 *           type: string
 *           description: Label risiko hasil prediksi AI (label mentah dari service).
 *         probabilities:
 *           type: object
 *           description: Peta probabilitas per label (key-value).
 *           additionalProperties:
 *             type: number
 *       required: [prediction]
 *
 *     Meta:
 *       type: object
 *       nullable: true
 *       description: Metadata record `advice` yang baru disimpan.
 *       properties:
 *         semester_id:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         created_at:
 *           type: string
 *           format: date-time
 *       example:
 *         semester_id: "8d8b3a3e-1a9a-4dcd-9b9f-5b0f7d7a1b2c"
 *         created_at: "2025-10-17T10:25:43.321Z"
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *       required: [error]
 *
 *     ErrorWithDetails:
 *       allOf:
 *         - $ref: '#/components/schemas/ErrorResponse'
 *         - type: object
 *           properties:
 *             details:
 *               type: string
 */


export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';
import { joinUrl, fetchWithTimeout, isUuidLike } from '@/utils/api';
import { createAdminClient } from '@/lib/supabase';
import { extractFeatures } from '@/lib/features';
import { unstable_cache, revalidateTag } from '@/utils/cache';

type AiResponse = { prediction: string; probabilities?: Record<string, number> };

function mapRiskForDb(label: string): 'HIGH' | 'MED' | 'LOW' {
  const L = (label || '').toLowerCase();
  if (L.includes('tinggi')) return 'HIGH';
  if (L.includes('sedang')) return 'MED';
  return 'LOW';
}
function mapRiskToCluster(label: string): number {
  const L = (label || '').toLowerCase();
  if (L.includes('tinggi')) return 2;
  if (L.includes('sedang')) return 1;
  return 0;
}

async function computeAnalyze(studentId: string) {
  const featuresForApi = await extractFeatures(studentId);

  const base = process.env.AI_BASE_URL;
  if (!base) return { status: 500, body: { error: 'AI_BASE_URL is not set' } };

  const res = await fetchWithTimeout(joinUrl(base, '/predict/'), {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(featuresForApi),
    timeoutMs: 10_000,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return { status: 502, body: { error: `AI service error (${res.status}): ${text || res.statusText}` } };
  }
  const aiResult = (await res.json().catch(() => null)) as AiResponse | null;
  if (!aiResult || typeof aiResult.prediction !== 'string') {
    return { status: 502, body: { error: 'AI response is not valid JSON' } };
  }

  const supabase = createAdminClient();
  const { data: vsss, error: vErr } = await supabase
    .from('v_student_semester_scores')
    .select('semester_id, semester_no, ips')
    .eq('student_id', studentId)
    .order('semester_no', { ascending: true });

  if (vErr) return { status: 500, body: { error: vErr.message } };

  const ipsList = (vsss ?? []).map(r => Number(r.ips ?? 0));
  const deltaIps = ipsList.length >= 2 ? ipsList.at(-1)! - ipsList.at(-2)! : 0;
  const lastRow = (vsss ?? []).at(-1);
  const semesterIdForSave: string | null = (lastRow?.semester_id as string) ?? null;

  const riskEnum = mapRiskForDb(aiResult.prediction);
  const cluster  = mapRiskToCluster(aiResult.prediction);

  await supabase.from('ml_features').upsert(
    {
      student_id: studentId,
      semester_id: semesterIdForSave,
      gpa_cum: (featuresForApi as any).IPK_Terakhir ?? null,
      ips_last: (featuresForApi as any).IPS_Terakhir ?? null,
      delta_ips: deltaIps,
      mk_gagal_total: (featuresForApi as any).Jumlah_MK_Gagal ?? null,
      sks_tunda: (featuresForApi as any).Total_SKS_Gagal ?? null,
      pct_d: 0, pct_e: 0, repeat_count: 0, mk_prasyarat_gagal: 0,
      cluster_label: cluster,
      risk_level: riskEnum,
      distance: 0,
    },
    { onConflict: 'student_id,semester_id' }
  );

  const { data: adviceRow } = await supabase
    .from('advice')
    .upsert(
      {
        student_id: studentId,
        semester_id: semesterIdForSave,
        risk_level: riskEnum,
        reasons: { source_label: aiResult.prediction, probabilities: aiResult.probabilities ?? null },
        actions: { info: 'To be generated by separate logic' },
      },
      { onConflict: 'student_id,semester_id' }
    )
    .select('semester_id, created_at')
    .single();

  const meta = adviceRow
    ? { semester_id: (adviceRow.semester_id as string | null) ?? null, created_at: adviceRow.created_at as string }
    : null;

  return { status: 200, body: { feat: featuresForApi, ai: aiResult, meta } };
}

const cachedAnalyze = unstable_cache(
  async (studentId: string) => computeAnalyze(studentId),
  ['ai:analyze'],
  { revalidate: 900, tags: ['ai'] }
);


export async function POST(req: NextRequest, context: { params: { id: string } }) {
  const studentId = context.params.id;
  if (!studentId || !isUuidLike(studentId)) {
    return NextResponse.json({ error: 'Invalid student id' }, { status: 400 });
  }

  const useCache = new URL(req.url).searchParams.get('cache') !== '0';

  const result = useCache
    ? await cachedAnalyze(studentId)
    : await computeAnalyze(studentId);

  if (!useCache) {
    revalidateTag(`student:${studentId}`);
  }

  return NextResponse.json(result.body, { status: result.status });
}