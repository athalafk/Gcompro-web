/**
 * @swagger
 * /api/students/{id}/recommend:
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
 *       - Endpoint **memerlukan sesi Supabase**. Jika user **admin**, query dijalankan dengan service-role (bypass RLS).
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
 *     responses:
 *       200:
 *         description: OK (respons langsung dari AI service)
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/AiRecommendationItem'
 *             examples:
 *               sample:
 *                 value:
 *                   - rank: 1
 *                     code: "AAK3BAB3"
 *                     name: "Sistem Komunikasi 1"
 *                     sks: 3
 *                     semester_plan: 5
 *                     reason: "Rekomendasi semester ini"
 *                     priority_score: 0.6
 *                     prerequisites:
 *                       - { code: "AZK2AAB3", name: "Probabilitas dan Statistika" }
 *                       - { code: "AZK2GAB3", name: "Pengolahan Sinyal Waktu Kontinyu" }
 *       401:
 *         description: Unauthorized (tidak ada sesi Supabase).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               no_session:
 *                 value: { error: "Unauthorized" }
 *       502:
 *         description: Bad Gateway (gagal memanggil AI service atau respons tidak valid)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               ai_down:
 *                 value: { error: "AI service unavailable" }
 *       500:
 *         description: Kesalahan server (gagal query ke Supabase atau error lain).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * components:
 *   schemas:
 *     AiRecommendationItem:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         rank: { type: integer }
 *         code: { type: string }
 *         name: { type: string }
 *         sks: { type: integer }
 *         semester_plan: { type: integer }
 *         reason: { type: string }
 *         priority_score: { type: number }
 *         prerequisites:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               code: { type: string }
 *               name: { type: string }
 *     ErrorResponse:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         error:
 *           type: string
 *       required: [error]
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/lib/supabase";

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

const AI_BASE_URL = process.env.AI_BASE_URL;

const AI_ENDPOINT_PATH = "/recommend/";

function buildAiUrl(base?: string | null): string | null {
  if (!base) return null;
  const trimmed = base.replace(/\/+$/, "");
  return `${trimmed}${AI_ENDPOINT_PATH}`;
}

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: studentId } = await context.params;
  const supabaseUser = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabaseUser.auth.getUser();

  if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile, error: profErr } = await supabaseUser
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 });

  const isAdmin = profile?.role === "admin";
  const db = isAdmin ? await createAdminClient() : supabaseUser;

  const { data: latestSem, error: latestErr } = await db
    .from("enrollments")
    .select("semester_no")
    .eq("student_id", studentId)
    .order("semester_no", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestErr) {
    return NextResponse.json({ error: latestErr.message }, { status: 500 });
  }

  const current_semester = Number(latestSem?.semester_no ?? 1) || 1;

  const { data: passedRows, error: passedErr } = await db
    .from("enrollments")
    .select("kelulusan, course:courses!inner(kode)")
    .eq("student_id", studentId)
    .eq("kelulusan", "Lulus");

  if (passedErr) {
    return NextResponse.json({ error: passedErr.message }, { status: 500 });
  }

  const courses_passed = Array.from(
    new Set(
      (passedRows ?? [])
        .map((r: any) => (r?.course?.kode ?? "").toString().trim())
        .filter((k: string) => k.length > 0)
    )
  );

  const aiPayload = {
    current_semester,
    courses_passed,
  };

  // Debug: tampilkan payload di console
  // if (true) {
  //   console.log(
  //     JSON.stringify(
  //       {
  //         event: "ai.payload.send",
  //         ts: new Date().toISOString(),
  //         payload: aiPayload,
  //       },
  //       null,
  //       2
  //     )
  //   );
  // }

  const aiUrl = buildAiUrl(AI_BASE_URL);
  if (!aiUrl) {
    return NextResponse.json(
      { error: "AI_BASE_URL is not configured" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(aiUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(aiPayload),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: `AI service error (${res.status}): ${text || res.statusText}` },
        { status: 502 }
      );
    }

    const data = (await res.json()) as unknown;

    if (!Array.isArray(data)) {
      return NextResponse.json(
        { error: "AI service returned non-array payload" },
        { status: 502 }
      );
    }

    const items = data as AiRecommendationItem[];
    
    return NextResponse.json(items, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: `AI service unavailable: ${e?.message || "unknown error"}` },
      { status: 502 }
    );
  }
}
