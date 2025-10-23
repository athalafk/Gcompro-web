import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { extractFeatures } from "@/lib/features";

/**
 * @swagger
 * /api/students/{id}/analyze:
 *   post:
 *     summary: Analisis risiko untuk 1 mahasiswa (jalankan AI, simpan hasil, lalu kembalikan ringkasan)
 *     description: |
 *       Server akan mengekstrak fitur internal, memanggil service AI eksternal untuk prediksi,
 *       menyimpan ringkasan ke tabel `ml_features` dan `advice`, lalu mengembalikan hasil (fitur + AI + metadata).
 *     tags: [Students, AI]
 *     operationId: analyzeStudent
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
 *     responses:
 *       200:
 *         description: Hasil analisis berhasil dibuat dan disimpan.
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
 *       502:
 *         description: Gagal memanggil service AI (bad gateway ke model server).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               ai_bad_gateway:
 *                 value:
 *                   error: "AI service error: Status 405"
 *       500:
 *         description: Kesalahan server internal (mis-konfigurasi env, error Supabase, dll).
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


function mapRiskForDb(label: string): "HIGH" | "MED" | "LOW" {
  const L = (label || "").toLowerCase();
  if (L.includes("tinggi")) return "HIGH";
  if (L.includes("sedang")) return "MED";
  return "LOW";
}

function mapRiskToCluster(label: string): number {
  const L = (label || "").toLowerCase();
  if (L.includes("tinggi")) return 2;
  if (L.includes("sedang")) return 1;
  return 0;
}
type AiResponse = { prediction: string; probabilities?: Record<string, number> };

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const studentId = params.id;

  try {
    const featuresForApi = await extractFeatures(studentId);

    const base = process.env.AI_BASE_URL;
    if (!base) return NextResponse.json({ error: "AI_BASE_URL is not set" }, { status: 500 });

    const res = await fetch(`${base}/predict/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(featuresForApi),
    });

    if (!res.ok) {
      const bodyText = await res.text().catch(() => "");
      console.error("AI service error:", res.status, bodyText);
      return NextResponse.json({ error: `AI service error: Status ${res.status}` }, { status: 502 });
    }

    const aiResult = (await res.json()) as AiResponse;

    const supabase = createAdminClient();

    const { data: vsss } = await supabase
      .from("v_student_semester_scores")
      .select("semester_id, semester_no, ips")
      .eq("student_id", studentId)
      .order("semester_no", { ascending: true });

    const ipsList = (vsss ?? []).map((r) => Number(r.ips ?? 0));
    const deltaIps = ipsList.length >= 2 ? ipsList.at(-1)! - ipsList.at(-2)! : 0;

    const lastRow = (vsss ?? []).at(-1);
    const semesterIdForSave: string | null = (lastRow?.semester_id as any) ?? null;

    const { error: upsertErr } = await supabase.from("ml_features").upsert(
      {
        student_id: studentId,
        semester_id: semesterIdForSave,
        gpa_cum: (featuresForApi as any).IPK_Terakhir,
        ips_last: (featuresForApi as any).IPS_Terakhir,
        delta_ips: deltaIps,
        mk_gagal_total: (featuresForApi as any).Jumlah_MK_Gagal,
        sks_tunda: (featuresForApi as any).Total_SKS_Gagal,

        pct_d: 0,
        pct_e: 0,
        repeat_count: 0,
        mk_prasyarat_gagal: 0,

        cluster_label: mapRiskToCluster(aiResult.prediction),
        risk_level: mapRiskForDb(aiResult.prediction),
        distance: 0,
      },
      { onConflict: "student_id,semester_id" }
    );
    if (upsertErr) console.error("ml_features upsert error:", upsertErr);

    const { data: adviceRow, error: adviceErr } = await supabase
      .from("advice")
      .insert({
        student_id: studentId,
        semester_id: semesterIdForSave,
        risk_level: aiResult.prediction,
        reasons: { source_label: aiResult.prediction, note: "Mapped to enum for ml_features" },
        actions: { info: "To be generated by separate logic" },
      })
      .select("id, semester_id, created_at")
      .single();

    if (adviceErr) console.error("advice insert error:", adviceErr);

    const meta = adviceRow
      ? {
          semester_id: (adviceRow.semester_id as string | null) ?? null,
          created_at: adviceRow.created_at as string,
        }
      : null;

    return NextResponse.json({ feat: featuresForApi, ai: aiResult, meta });
  } catch (error) {
    console.error("Unexpected error:", error);
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: "Internal Server Error", details: msg }, { status: 500 });
  }
}
