/**
 * @swagger
 * /api/students/{id}/overview:
 *   get:
 *     summary: Overview mahasiswa (tren IPS & IPK, distribusi grade, dan risk terkini)
 *     tags: [Students]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 trend:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       semester_no: { type: integer }
 *                       ips: { type: number, format: float, example: 3.12 }
 *                 cum:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       semester_no: { type: integer }
 *                       ipk_cum: { type: number, format: float, example: 3.01 }
 *                 dist:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/GradeBucket'
 *                 risk_level:
 *                   type: string
 *                   enum: [LOW, MED, HIGH]
 *       500:
 *         description: Error query Supabase
 */


import { NextResponse, NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: studentId } = await ctx.params;
  const supabase = createAdminClient();

  // Tren IPS
  const { data: trend, error: e1 } = await supabase
    .from("v_student_semester_scores")
    .select("semester_no, ips")
    .eq("student_id", studentId)
    .order("semester_no", { ascending: true });

  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

  // IPK kumulatif
  const { data: cum, error: e2 } = await supabase
    .from("v_student_cumulative")
    .select("semester_no, ipk_cum")
    .eq("student_id", studentId)
    .order("semester_no", { ascending: true });

  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

  // Distribusi grade (hitungan di server JS biar aman dari syntax group PostgREST)
  const { data: grades, error: e3 } = await supabase
    .from("enrollments")
    .select("grade_index")
    .eq("student_id", studentId);

  if (e3) return NextResponse.json({ error: e3.message }, { status: 500 });

  const dist = ["A","B","C","D","E"].map((g) => ({
    grade_index: g,
    count: (grades ?? []).filter(x => x.grade_index === g).length
  }));

  // Risk level (ambil yang terbaru)
  const { data: riskRow } = await supabase
    .from("ml_features")
    .select("risk_level")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    trend, cum, dist,
    risk_level: riskRow?.risk_level ?? "LOW"
  });
}
