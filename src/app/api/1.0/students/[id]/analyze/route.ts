/**
 * @swagger
 * /students/{id}/analyze:
 *   post:
 *     summary: Analisis risiko 1 mahasiswa (run AI, simpan hasil, lalu kembalikan ringkasan)
 *     description: |
 *       Server akan:
 *       1) Mengekstrak fitur internal dari database (DB-driven).
 *       2) Memanggil service AI eksternal untuk prediksi risiko.
 *       3) Menyimpan ringkasan hasil ke tabel `ml_features` dan `advice`.
 *       4) Mengembalikan payload ringkasan (fitur + hasil AI + metadata penyimpanan).
 *
 *       Caching:
 *       - Secara default hasil analisis **menggunakan cache server** (revalidate 900 detik).
 *       - Tambahkan `?cache=0` untuk memaksa hitung ulang dan menginvalisasi cache `student:{id}`.
 *
 *       Catatan data:
 *       - IPK diambil dari `cumulative_stats.ipk_cum` (source of truth).
 *       - Riwayat IPS diambil dari `semester_stats` (berdasarkan `semester_no`).
 *       - MK gagal dihitung dari enrollments `status=FINAL` dan `kelulusan='Tidak Lulus'`.
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
 *         description: |
 *           Kontrol cache:
 *           - '0' menonaktifkan cache untuk request ini (force recompute)
 *           - nilai lain / omit memakai cache
 *         schema:
 *           type: string
 *           enum: ["0", "1"]
 *           default: "1"
 *     requestBody:
 *       required: false
 *     responses:
 *       200:
 *         description: OK (hasil analisis berhasil dibuat dan/atau tersimpan)
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
 *                     Total_SKS: 90
 *                     IPS_Tertinggi: 3.75
 *                     IPS_Terendah: 2.10
 *                     Rentang_IPS: 1.65
 *                     Jumlah_MK_Gagal: 1
 *                     Total_SKS_Gagal: 3
 *                     Tren_IPS_Slope: -0.08
 *                     Profil_Tren: "Menurun"
 *                     Perubahan_Kinerja_Terakhir: -0.24
 *                     IPK_Ternormalisasi_SKS: 1.95
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
 *         description: Parameter path tidak valid (student id bukan UUID).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               invalid_id:
 *                 value: { error: "Invalid student id" }
 *       502:
 *         description: Gagal memanggil service AI (bad gateway ke model server).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               ai_bad_gateway:
 *                 value: { error: "AI service error (405): Method Not Allowed" }
 *               ai_invalid_json:
 *                 value: { error: "AI response is not valid JSON" }
 *       500:
 *         description: Kesalahan server internal (mis-konfigurasi env, error Supabase, dsb).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorWithDetails' }
 *             examples:
 *               env_not_set:
 *                 value:
 *                   error: "Internal Server Error"
 *                   details: "AI_BASE_URL is not set"
 *
 *   get:
 *     summary: (Mirror) Analisis risiko 1 mahasiswa via querystring (private cache)
 *     description: |
 *       Versi **GET** dari endpoint yang sama.
 *       - Mengembalikan struktur response yang sama dengan POST.
 *       - Secara default response dapat di-cache secara privat.
 *       - Gunakan `?cache=0` untuk memaksa hitung ulang (force recompute).
 *     tags: [Students, AI]
 *     operationId: analyzeStudentViaQuery
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
 *         description: |
 *           Kontrol cache:
 *           - '0' menonaktifkan cache untuk request ini (force recompute)
 *           - nilai lain / omit memakai cache
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
 *               $ref: '#/components/schemas/AnalyzeResponse'
 *       400:
 *         description: Parameter path tidak valid (student id bukan UUID).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       502:
 *         description: Gagal memanggil service AI.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       500:
 *         description: Kesalahan server internal.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorWithDetails' }
 *
 * components:
 *   schemas:
 *     AnalyzeResponse:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         feat:
 *           $ref: '#/components/schemas/AnalyzeFeatures'
 *         ai:
 *           $ref: '#/components/schemas/AiResponse'
 *         meta:
 *           $ref: '#/components/schemas/AnalyzeMeta'
 *       required: [feat, ai]
 *
 *     AnalyzeFeatures:
 *       type: object
 *       additionalProperties: false
 *       description: Fitur yang diekstrak dari database untuk input model AI.
 *       properties:
 *         IPK_Terakhir: { type: number, example: 3.12 }
 *         IPS_Terakhir: { type: number, example: 2.88 }
 *         Total_SKS: { type: integer, example: 90 }
 *         IPS_Tertinggi: { type: number, example: 3.75 }
 *         IPS_Terendah: { type: number, example: 2.10 }
 *         Rentang_IPS: { type: number, example: 1.65 }
 *         Jumlah_MK_Gagal: { type: integer, example: 1 }
 *         Total_SKS_Gagal: { type: integer, example: 3 }
 *         Tren_IPS_Slope: { type: number, example: -0.08 }
 *         Profil_Tren:
 *           type: string
 *           enum: ["Menaik", "Menurun", "Stabil"]
 *           example: "Menurun"
 *         Perubahan_Kinerja_Terakhir:
 *           type: number
 *           description: IPS_Terakhir - IPK_Terakhir
 *           example: -0.24
 *         IPK_Ternormalisasi_SKS:
 *           type: number
 *           description: (Total_SKS/144) * IPK_Terakhir
 *           example: 1.95
 *       required:
 *         - IPK_Terakhir
 *         - IPS_Terakhir
 *         - Total_SKS
 *         - IPS_Tertinggi
 *         - IPS_Terendah
 *         - Rentang_IPS
 *         - Jumlah_MK_Gagal
 *         - Total_SKS_Gagal
 *         - Tren_IPS_Slope
 *         - Profil_Tren
 *         - Perubahan_Kinerja_Terakhir
 *         - IPK_Ternormalisasi_SKS
 *
 *     AiResponse:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         prediction:
 *           type: string
 *           description: Label risiko hasil prediksi AI (label mentah dari service).
 *           example: "HIGH"
 *         probabilities:
 *           type: object
 *           nullable: true
 *           description: Peta probabilitas per label (key-value).
 *           additionalProperties:
 *             type: number
 *           example:
 *             HIGH: 0.72
 *             MED: 0.20
 *             LOW: 0.08
 *       required: [prediction]
 *
 *     AnalyzeMeta:
 *       type: object
 *       nullable: true
 *       additionalProperties: false
 *       description: Metadata record `advice` yang baru di-upsert.
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
 *       additionalProperties: false
 *       properties:
 *         error:
 *           type: string
 *       required: [error]
 *
 *     ErrorWithDetails:
 *       allOf:
 *         - $ref: '#/components/schemas/ErrorResponse'
 *         - type: object
 *           additionalProperties: false
 *           properties:
 *             details:
 *               type: string
 */


export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { jsonNoStore, jsonPrivate, joinUrl, fetchWithTimeout, isUuidLike } from '@/utils/api';
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
  const { feat: featuresForApi, meta } = await extractFeatures(studentId);

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

  const semesterIdForSave = meta.semesterIdForSave;
  const deltaIps = meta.deltaIps;

  const riskEnum = mapRiskForDb(aiResult.prediction);
  const cluster = mapRiskToCluster(aiResult.prediction);

  // write ml_features (sementara mapping lama)
  await supabase.from('ml_features').upsert(
    {
      student_id: studentId,
      semester_id: semesterIdForSave,
      gpa_cum: featuresForApi.IPK_Terakhir ?? null,
      ips_last: featuresForApi.IPS_Terakhir ?? null,
      delta_ips: deltaIps,
      mk_gagal_total: featuresForApi.Jumlah_MK_Gagal ?? null,
      sks_tunda: featuresForApi.Total_SKS_Gagal ?? null,
      pct_d: 0,
      pct_e: 0,
      repeat_count: 0,
      mk_prasyarat_gagal: 0,
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

  const metaOut = adviceRow
    ? { semester_id: (adviceRow.semester_id as string | null) ?? null, created_at: adviceRow.created_at as string }
    : null;

  return { status: 200, body: { feat: featuresForApi, ai: aiResult, meta: metaOut } };
}

// cache per studentId + tag per studentId
function cachedAnalyze(studentId: string) {
  return unstable_cache(
    async () => computeAnalyze(studentId),
    ['ai:analyze', studentId],
    { revalidate: 900, tags: ['ai', `student:${studentId}`] }
  )();
}

// POST (no-store)
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: studentId } = await context.params;

  if (!studentId || !isUuidLike(studentId)) {
    return jsonNoStore({ error: 'Invalid student id' }, 400);
  }

  const useCache = new URL(req.url).searchParams.get('cache') !== '0';

  const result = useCache
    ? await cachedAnalyze(studentId)
    : await computeAnalyze(studentId);

  if (!useCache) revalidateTag(`student:${studentId}`);

  return jsonNoStore(result.body, result.status);
}


// GET mirror (private cache)
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: studentId } = await context.params;

  if (!studentId || !isUuidLike(studentId)) {
    return jsonPrivate({ error: 'Invalid student id' }, 400);
  }

  const useCache = new URL(req.url).searchParams.get('cache') !== '0';

  try {
    const result = useCache
      ? await cachedAnalyze(studentId)
      : await computeAnalyze(studentId);

    if (!useCache) revalidateTag(`student:${studentId}`);

    return jsonPrivate(result.body, result.status);

  } catch (err: any) {
    return jsonPrivate(
      { error: err?.message || 'Internal Server Error' },
      500
    );
  }
}
