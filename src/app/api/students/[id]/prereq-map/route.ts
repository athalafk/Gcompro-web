/**
 * @swagger
 * /api/students/{id}/prereq-map:
 *   get:
 *     summary: Peta prasyarat dan status setiap mata kuliah untuk mahasiswa
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
 *                 nodes:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PrereqNode'
 *                 links:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PrereqLink'
 */


import { NextResponse, NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: studentId } = await ctx.params;
  const supabase = createAdminClient();
  
  const [{ data: courses }, { data: edges }, { data: enr }] = await Promise.all([
    supabase.from("courses").select("id,kode,nama,sks,min_index"),
    supabase.from("course_prereq").select("course_id,prereq_course_id"),
    supabase.from("enrollments").select("course_id,grade_index,is_current").eq("student_id", studentId),
  ]);

  const passed = new Set(enr?.filter(e => ["A","B","C"].includes(e.grade_index)).map(e => e.course_id));
  const failed = new Set(enr?.filter(e => ["D","E"].includes(e.grade_index)).map(e => e.course_id));
  const current = new Set(enr?.filter(e => e.is_current).map(e => e.course_id));

  const nodes = (courses ?? []).map(c => ({
    id: c.id,
    data: { label: `${c.nama} (${c.sks} SKS)` },
    status: passed.has(c.id) ? "passed" : failed.has(c.id) ? "failed" : current.has(c.id) ? "current" : "none"
  }));

  const links = (edges ?? []).map(e => ({ source: e.prereq_course_id, target: e.course_id }));
  return NextResponse.json({ nodes, links });
}
