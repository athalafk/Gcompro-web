/**
 * @swagger
 * /api/students/{id}/analyze:
 *   post:
 *     summary: Analisis risiko untuk 1 mahasiswa (jalankan AI, simpan hasil, lalu kembalikan ringkasan)
 *     tags: [AI]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Student UUID
 *     responses:
 *       200:
 *         description: Hasil analisis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 feat:
 *                   $ref: '#/components/schemas/Features'
 *                 ai:
 *                   $ref: '#/components/schemas/AIResult'
 *       502:
 *         description: Gagal memanggil service AI
 */


import { NextRequest, NextResponse } from "next/server";
import { extractFeatures, toVector } from "@/lib/features";
import { createAdminClient } from "@/lib/supabase";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: studentId } = await ctx.params;

  const feat = await extractFeatures(studentId);
  const payload = {
    rows: [{ student_id: studentId, features: toVector(feat) }],
  };

  const res = await fetch(`${process.env.AI_BASE_URL}/predict`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "x-api-key": process.env.AI_API_KEY!,
     },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return NextResponse.json({ error: "AI service error" }, { status: 502 });

  const [out] = await res.json();

  // simpan ke ml_features + advice
  const supabase = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: lastSem } = await supabase
    .from("v_student_semester_scores")
    .select("semester_no")
    .eq("student_id", studentId)
    .order("semester_no", { ascending: false })
    .limit(1).maybeSingle();

  // temukan semester_id dari semester_no terakhir (opsional)
  const { data: sem } = await supabase
    .from("semesters")
    .select("id, nomor, tahun_ajaran")
    .order("nomor", { ascending: false })
    .limit(1).maybeSingle();

  await supabase.from("ml_features").upsert({
    student_id: studentId,
    semester_id: sem?.id ?? null,
    ...feat,
    cluster_label: out.cluster_label,
    risk_level: out.risk_level,
    distance: out.distance,
  }, { onConflict: "student_id,semester_id" });

  await supabase.from("advice").insert({
    student_id: studentId,
    semester_id: sem?.id ?? null,
    risk_level: out.risk_level,
    reasons: out.reasons,
    actions: out.actions,
  });

  return NextResponse.json({ feat, ai: out });
}
