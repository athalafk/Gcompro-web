import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { extractFeatures } from "@/lib/features";

/**
 * @swagger
 * /api/students/{id}/risk/latest:
 *   get:
 *     summary: Ambil hasil AI terbaru + fitur, beserta metadata waktu pembuatan
 *     description: |
 *       Mengembalikan payload setara `/analyze` namun **tanpa memanggil AI lagi**:
 *       - `feat`: dihitung ulang via `extractFeatures(studentId)`
 *       - `ai`: dibentuk dari record `advice` terbaru (bisa `null` jika belum ada)
 *       - `meta`: informasi `semester_id` & `created_at` dari `advice` terbaru (bisa `null`)
 *     tags: [Students, AI]
 *     operationId: getLatestRisk
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
 *               type: object
 *               additionalProperties: false
 *               properties:
 *                 feat:
 *                   $ref: '#/components/schemas/Features'
 *                 ai:
 *                   oneOf:
 *                     - $ref: '#/components/schemas/AiResponse'
 *                     - type: "null"
 *                 meta:
 *                   type: object
 *                   nullable: true
 *                   additionalProperties: false
 *                   properties:
 *                     semester_id:
 *                       type: string
 *                       format: uuid
 *                       nullable: true
 *                     created_at:
 *                       type: string
 *                       format: date-time
 *             examples:
 *               with_advice:
 *                 summary: Ada advice terbaru
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
 *                     created_at: "2025-10-10T08:20:10.456Z"
 *               no_advice_yet:
 *                 summary: Belum ada advice tersimpan
 *                 value:
 *                   feat:
 *                     IPK_Terakhir: 3.00
 *                     IPS_Terakhir: 3.20
 *                     Jumlah_MK_Gagal: 0
 *                     Total_SKS_Gagal: 0
 *                   ai: null
 *                   meta: null
 *       500:
 *         description: Error mengambil data atau menghitung fitur.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               db_error:
 *                 value: { error: "relation advice does not exist" }
 */


export const dynamic = "force-dynamic";

type AiResponse = { prediction: string; probabilities?: Record<string, number> };

function normalizeProbabilities(raw: unknown): Record<string, number> | undefined {
  if (Array.isArray(raw)) {
    const pairs = (raw as any[])
      .filter((p) => Array.isArray(p) && p.length === 2 && typeof p[0] === "string" && typeof p[1] === "number") as [
      string,
      number
    ][];
    if (pairs.length) return Object.fromEntries(pairs);
  }
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (typeof (obj as any).probabilities === "object") return normalizeProbabilities((obj as any).probabilities);
    if (typeof (obj as any).probs === "object") return normalizeProbabilities((obj as any).probs);
    const m: Record<string, number> = {};
    let any = false;
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "number") {
        m[k] = v;
        any = true;
      }
    }
    if (any) return m;
  }
  return undefined;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const studentId = params.id;
  const supabase = createAdminClient();

  try {
    const feat = await extractFeatures(studentId);

    const { data: adv, error: advErr } = await supabase
      .from("advice")
      .select("semester_id, risk_level, reasons, created_at")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (advErr) return NextResponse.json({ error: advErr.message }, { status: 500 });

    let ai: AiResponse | null = null;
    let meta: { semester_id: string | null; created_at: string } | null = null;

    if (adv) {
      ai = {
        prediction: String(adv.risk_level ?? ""),
        probabilities: normalizeProbabilities(adv.reasons),
      };
      meta = {
        semester_id: (adv.semester_id as string | null) ?? null,
        created_at: adv.created_at as string,
      };
    }

    return NextResponse.json({ feat, ai, meta });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Internal Server Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
