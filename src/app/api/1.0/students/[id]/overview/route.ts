/**
 * @swagger
 * /students/{id}/overview:
 *   get:
 *     summary: Overview mahasiswa (tren IPS & IPK, distribusi grade, dan risk terkini)
 *     tags: [Students]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID mahasiswa (kolom `students.id`)
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StudentOverviewResponse'
 *             examples:
 *               sample:
 *                 summary: Contoh respons
 *                 value:
 *                   trend:
 *                     - { semester_no: 1, ips: 3.12 }
 *                     - { semester_no: 2, ips: 2.98 }
 *                   cum:
 *                     - { semester_no: 1, ipk_cum: 3.12 }
 *                     - { semester_no: 2, ipk_cum: 3.05 }
 *                   dist:
 *                     - { grade_index: "A", count: 5 }
 *                     - { grade_index: "B", count: 3 }
 *                     - { grade_index: "C", count: 1 }
 *                     - { grade_index: "D", count: 0 }
 *                     - { grade_index: "E", count: 0 }
 *                   risk_level: "LOW"
 *       500:
 *         description: Error query Supabase
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               db_error:
 *                 value:
 *                   error: "relation v_student_semester_scores does not exist"
 *
 * components:
 *   schemas:
 *     StudentOverviewResponse:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         trend:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/TrendItem'
 *         cum:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CumulativeItem'
 *         dist:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/GradeBucket'
 *         risk_level:
 *           type: string
 *           description: Risk level terbaru dari `ml_features` (default LOW jika tidak ada record).
 *           enum: [LOW, MED, HIGH]
 *       required: [trend, cum, dist, risk_level]
 *
 *     TrendItem:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         semester_no:
 *           type: integer
 *         ips:
 *           type: number
 *           format: float
 *       required: [semester_no, ips]
 *
 *     CumulativeItem:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         semester_no:
 *           type: integer
 *         ipk_cum:
 *           type: number
 *           format: float
 *       required: [semester_no, ipk_cum]
 *
 *     GradeBucket:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         grade_index:
 *           type: string
 *           enum: [A, B, C, D, E]
 *         count:
 *           type: integer
 *           minimum: 0
 *       required: [grade_index, count]
 *
 *     ErrorResponse:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         error:
 *           type: string
 *       required: [error]
 */


import { NextResponse, NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: studentId } = await context.params;
  const supabase = createAdminClient();

  const { data: trend, error: e1 } = await supabase
    .from("v_student_semester_scores")
    .select("semester_no, ips")
    .eq("student_id", studentId)
    .order("semester_no", { ascending: true });
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

  const { data: cum, error: e2 } = await supabase
    .from("v_student_cumulative")
    .select("semester_no, ipk_cum")
    .eq("student_id", studentId)
    .order("semester_no", { ascending: true });
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

  const { data: grades, error: e3 } = await supabase
    .from("enrollments")
    .select("grade_index")
    .eq("student_id", studentId);
  if (e3) return NextResponse.json({ error: e3.message }, { status: 500 });

  const dist = ["A", "B", "C", "D", "E"].map((g) => ({
    grade_index: g,
    count: (grades ?? []).filter((x) => x.grade_index === g).length,
  }));

  const { data: riskRow } = await supabase
    .from("ml_features")
    .select("risk_level")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({
    trend,
    cum,
    dist,
    risk_level: riskRow?.risk_level ?? "LOW",
  });
}
