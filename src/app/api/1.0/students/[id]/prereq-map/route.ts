/**
 * @swagger
 * /students/{id}/prereq-map:
 *   get:
 *     summary: Peta prasyarat dan status setiap mata kuliah untuk mahasiswa
 *     description: |
 *       Mengembalikan graph prasyarat:
 *       - **nodes**: setiap mata kuliah dengan status kelulusan mahasiswa (passed/failed/current/none)
 *       - **links**: edge dari mata kuliah prasyarat (**source**) ke mata kuliah target (**target**)
 *     tags: [Students]
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
 *               $ref: '#/components/schemas/PrereqMapResponse'
 *             examples:
 *               sample:
 *                 summary: Contoh graph prasyarat
 *                 value:
 *                   nodes:
 *                     - id: "4e5a0c1b-7a4f-40b0-bc6d-3e7e3f0e9b21"
 *                       data: { label: "Kalkulus I (3 SKS)" }
 *                       status: "passed"
 *                     - id: "9f2b1a74-1c2d-4c0f-8a1b-2b8d3a5f9c11"
 *                       data: { label: "Kalkulus II (3 SKS)" }
 *                       status: "current"
 *                   links:
 *                     - source: "4e5a0c1b-7a4f-40b0-bc6d-3e7e3f0e9b21"
 *                       target: "9f2b1a74-1c2d-4c0f-8a1b-2b8d3a5f9c11"
 *       500:
 *         description: Error query Supabase
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               db_error:
 *                 value:
 *                   error: "relation enrollments does not exist"
 *
 * components:
 *   schemas:
 *     PrereqMapResponse:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         nodes:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PrereqNode'
 *         links:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PrereqLink'
 *       required: [nodes, links]
 *
 *     PrereqNode:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         data:
 *           type: object
 *           additionalProperties: false
 *           properties:
 *             label:
 *               type: string
 *               description: "Nama MK + SKS; misal: 'Kalkulus I (3 SKS)'."
 *           required: [label]
 *         status:
 *           type: string
 *           description: |
 *             - **passed**: grade A/B/C
 *             - **failed**: grade D/E
 *             - **current**: sedang diambil (`is_current = true`)
 *             - **none**: belum pernah diambil
 *           enum: [passed, failed, current, none]
 *       required: [id, data, status]
 *
 *     PrereqLink:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         source:
 *           type: string
 *           format: uuid
 *           description: ID MK prasyarat
 *         target:
 *           type: string
 *           format: uuid
 *           description: ID MK yang mensyaratkan
 *       required: [source, target]
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

  const [{ data: courses }, { data: edges }, { data: enr }] = await Promise.all([
    supabase.from("courses").select("id,kode,nama,sks,min_index"),
    supabase.from("course_prereq").select("course_id,prereq_course_id"),
    supabase.from("enrollments").select("course_id,grade_index,is_current").eq("student_id", studentId),
  ]);

  const passed = new Set(enr?.filter((e) => ["A", "B", "C"].includes(e.grade_index)).map((e) => e.course_id));
  const failed = new Set(enr?.filter((e) => ["D", "E"].includes(e.grade_index)).map((e) => e.course_id));
  const current = new Set(enr?.filter((e) => e.is_current).map((e) => e.course_id));

  const nodes = (courses ?? []).map((c) => ({
    id: c.id,
    data: { label: `${c.nama} (${c.sks} SKS)` },
    status: passed.has(c.id) ? "passed" : failed.has(c.id) ? "failed" : current.has(c.id) ? "current" : "none",
  }));

  const links = (edges ?? []).map((e) => ({ source: e.prereq_course_id, target: e.course_id }));
  return NextResponse.json({ nodes, links });
}
