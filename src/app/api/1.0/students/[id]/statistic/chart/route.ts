/**
 * @swagger
 * /students/{id}/statistic/chart:
 *   get:
 *     summary: Data chart IPS/IPK dan distribusi nilai kumulatif untuk seorang mahasiswa
 *     description: |
 *       Mengembalikan dua set data untuk visualisasi:
 *       - **line**: tren **IPK kumulatif** dan **IPS** per semester (sinkron pada domain `semester_no`)
 *       - **pie**: distribusi indeks nilai kumulatif (A, AB, B, BC, C, D, E)
 *
 *       Sumber data:
 *       - `v_student_semester_scores` → (semester_no, ips)
 *       - `v_student_cumulative` → (semester_no, ipk_cum)
 *       - `v_student_grade_distribution` → (dist_a, dist_ab, dist_b, dist_bc, dist_c, dist_d, dist_e)
 *
 *       Catatan:
 *       - Endpoint **memerlukan sesi Supabase**.
 *       - Jika user **admin**, pembacaan dilakukan dengan service-role (bypass RLS).
 *     tags: [Students]
 *     operationId: getStudentStatisticChart
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: UUID mahasiswa (kolom `students.id`)
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: semester_no
 *         required: false
 *         description: |
 *           - **Tidak diisi** → **agregasi seluruh semester** (menjumlah distribusi setiap semester).
 *           - **Angka ≥ 1** → gunakan semester tertentu.
 *           - **"ALL"** (case-insensitive) → sama seperti tidak diisi (agregasi seluruh semester).
 *         schema:
 *           oneOf:
 *             - type: integer
 *               minimum: 1
 *               example: 5
 *             - type: string
 *               enum: ["ALL"]
 *               example: "ALL"
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChartResponse'
 *             examples:
 *               all_semesters_default:
 *                 summary: Tanpa query → agregasi seluruh semester
 *                 value:
 *                   line:
 *                     categories: [1, 2, 3, 4, 5]
 *                     series:
 *                       - name: "IPK"
 *                         data: [3.12, 3.10, 3.15, 3.18, 3.20]
 *                       - name: "IPS"
 *                         data: [3.12, 3.08, 3.30, 3.22, 3.25]
 *                   pie:
 *                     labels: ["A", "AB", "B", "BC", "C", "D", "E"]
 *                     series: [42, 18, 33, 7, 11, 1, 0]
 *                     selected_semester_no: "ALL"
 *               filtered_semester:
 *                 summary: Dengan query semester_no=5 (hanya semester 5)
 *                 value:
 *                   line:
 *                     categories: [1, 2, 3, 4, 5]
 *                     series:
 *                       - name: "IPK"
 *                         data: [3.12, 3.10, 3.15, 3.18, 3.20]
 *                       - name: "IPS"
 *                         data: [3.12, 3.08, 3.30, 3.22, 3.25]
 *                   pie:
 *                     labels: ["A", "AB", "B", "BC", "C", "D", "E"]
 *                     series: [7, 6, 9, 1, 2, 0, 0]
 *                     selected_semester_no: 5
 *               no_distribution:
 *                 summary: Tidak ada distribusi untuk filter yang diminta (series kosong)
 *                 value:
 *                   line:
 *                     categories: [1, 2]
 *                     series:
 *                       - name: "IPK"
 *                         data: [3.1, 3.2]
 *                       - name: "IPS"
 *                         data: [3.0, 3.3]
 *                   pie:
 *                     labels: ["A", "AB", "B", "BC", "C", "D", "E"]
 *                     series: []
 *                     selected_semester_no: 9
 *       400:
 *         description: Parameter tidak valid (student id bukan UUID / nilai `semester_no` tidak valid).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               invalid_id:
 *                 value: { error: "Invalid student id" }
 *               invalid_semester_no:
 *                 value: { error: "Invalid semester_no" }
 *       401:
 *         description: Unauthorized (tidak ada sesi Supabase).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               no_session: { value: { error: "Unauthorized" } }
 *       403:
 *         description: Forbidden (student mencoba mengakses data milik mahasiswa lain).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               forbidden: { value: { error: "Forbidden" } }
 *       500:
 *         description: Kesalahan server saat query ke Supabase/view terkait.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               db_error: { value: { error: "relation v_student_semester_scores does not exist" } }
 *
 * components:
 *   schemas:
 *     ChartResponse:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         line:
 *           $ref: '#/components/schemas/LinePayload'
 *         pie:
 *           $ref: '#/components/schemas/PiePayload'
 *       required: [line, pie]
 *
 *     LinePayload:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         categories:
 *           type: array
 *           items: { type: integer }
 *           description: Daftar `semester_no` terurut naik.
 *         series:
 *           type: array
 *           items: { $ref: '#/components/schemas/LineSeriesItem' }
 *       required: [categories, series]
 *
 *     LineSeriesItem:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         name:
 *           type: string
 *           enum: ["IPK", "IPS"]
 *         data:
 *           type: array
 *           items:
 *             type: number
 *             nullable: true
 *           description: Nilai per `semester_no` yang selaras dengan `categories`.
 *       required: [name, data]
 *
 *     PiePayload:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         labels:
 *           type: array
 *           items: { type: string }
 *           example: ["A", "AB", "B", "BC", "C", "D", "E"]
 *         series:
 *           type: array
 *           items: { type: number }
 *           description: Banyaknya matakuliah per label nilai; bisa kosong jika tidak ada data.
 *         selected_semester_no:
 *           oneOf:
 *             - type: integer
 *               minimum: 1
 *             - type: string
 *               enum: ["ALL"]
 *           description: Semester yang dipakai untuk pie (angka spesifik atau "ALL" untuk agregasi).
 *       required: [labels, series]
 *
 *     ErrorResponse:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         error: { type: string }
 *       required: [error]
 */


export const dynamic = "force-dynamic";

import { type NextRequest } from "next/server";
import { jsonPrivate, isUuidLike } from "@/utils/api";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/lib/supabase";

type LinePayload = {
  categories: number[];
  series: Array<{ name: string; data: (number | null)[] }>;
};
type PiePayload = {
  labels: string[];
  series: number[];
  selected_semester_no?: number | "ALL";
};
type ChartResponse = { line: LinePayload; pie: PiePayload };

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: studentId } = await context.params;
  if (!studentId || !isUuidLike(studentId)) return jsonPrivate({ error: "Invalid student id" }, 400);

  try {
    const supabaseUser = await createSupabaseServerClient();
    const {
      data: { user },
      error: userErr,
    } = await supabaseUser.auth.getUser();
    if (userErr) return jsonPrivate({ error: userErr.message }, 500);
    if (!user) return jsonPrivate({ error: "Unauthorized" }, 401);

    const { data: profile, error: profErr } = await supabaseUser
      .from("profiles")
      .select("role, nim")
      .eq("id", user.id)
      .single();
    if (profErr) return jsonPrivate({ error: profErr.message }, 500);

    const isAdmin = profile?.role === "admin";
    if (!isAdmin) {
      const { data: own, error: ownErr } = await supabaseUser
        .from("students")
        .select("id")
        .eq("id", studentId)
        .eq("nim", profile?.nim ?? "")
        .maybeSingle();
      if (ownErr) return jsonPrivate({ error: ownErr.message }, 500);
      if (!own) return jsonPrivate({ error: "Forbidden" }, 403);
    }

    const db = isAdmin ? createAdminClient() : supabaseUser;

    // =============== 1. Line (IPS & IPK kumulatif) ===============
    const { data: ipsRows, error: ipsErr } = await db
      .from("v_student_semester_scores")
      .select("semester_no, ips")
      .eq("student_id", studentId)
      .order("semester_no", { ascending: true });
    if (ipsErr) return jsonPrivate({ error: ipsErr.message }, 500);

    const { data: cumRows, error: cumErr } = await db
      .from("v_student_cumulative")
      .select("semester_no, ipk_cum")
      .eq("student_id", studentId)
      .order("semester_no", { ascending: true });
    if (cumErr) return jsonPrivate({ error: cumErr.message }, 500);

    const allSemNos = Array.from(
      new Set([
        ...(ipsRows ?? []).map((x: any) => Number(x.semester_no)),
        ...(cumRows ?? []).map((x: any) => Number(x.semester_no)),
      ])
    ).sort((a, b) => a - b);

    const seriesIPS = allSemNos.map(
      (no) => ipsRows?.find((x: any) => Number(x.semester_no) === no)?.ips ?? null
    );
    const seriesIPK = allSemNos.map(
      (no) => cumRows?.find((x: any) => Number(x.semester_no) === no)?.ipk_cum ?? null
    );

    const line: LinePayload = {
      categories: allSemNos,
      series: [
        { name: "IPK", data: seriesIPK },
        { name: "IPS", data: seriesIPS },
      ],
    };

    // =============== 2. Pie (distribusi nilai) ===============
    const { searchParams } = new URL(req.url);
    const semRaw = (searchParams.get("semester_no") ?? "").trim();

    const isAll = semRaw !== "" && semRaw.toUpperCase() === "ALL";
    const semNo =
      semRaw === ""            ? null
      : isAll                  ? null
      : Number.isFinite(Number(semRaw)) && Number(semRaw) >= 1
        ? Number(semRaw)
        : NaN;

    if (Number.isNaN(semNo)) {
      return jsonPrivate({ error: "Invalid semester_no" }, 400);
    }

    let distRows: any[] = [];
    if (semNo != null) {
      const { data, error } = await db
        .from("v_student_grade_distribution")
        .select(
          "semester_no, dist_a, dist_ab, dist_b, dist_bc, dist_c, dist_d, dist_e"
        )
        .eq("student_id", studentId)
        .eq("semester_no", semNo);
      if (error) return jsonPrivate({ error: error.message }, 500);
      distRows = data ?? [];
    } else {
      const { data, error } = await db
        .from("v_student_grade_distribution")
        .select(
          "semester_no, dist_a, dist_ab, dist_b, dist_bc, dist_c, dist_d, dist_e"
        )
        .eq("student_id", studentId)
        .order("semester_no", { ascending: true });
      if (error) return jsonPrivate({ error: error.message }, 500);
      distRows = data ?? [];
    }

    if (!distRows.length) {
      const pieEmpty: PiePayload = {
        labels: ["A", "AB", "B", "BC", "C", "D", "E"],
        series: [],
        selected_semester_no: semNo ?? "ALL",
      };
      return jsonPrivate({ line, pie: pieEmpty }, 200);
    }

    let distAgg = distRows;
    if (semNo == null) {
      const totals = distRows.reduce(
        (acc, cur) => {
          acc.dist_a += Number(cur.dist_a ?? 0);
          acc.dist_ab += Number(cur.dist_ab ?? 0);
          acc.dist_b += Number(cur.dist_b ?? 0);
          acc.dist_bc += Number(cur.dist_bc ?? 0);
          acc.dist_c += Number(cur.dist_c ?? 0);
          acc.dist_d += Number(cur.dist_d ?? 0);
          acc.dist_e += Number(cur.dist_e ?? 0);
          return acc;
        },
        { dist_a: 0, dist_ab: 0, dist_b: 0, dist_bc: 0, dist_c: 0, dist_d: 0, dist_e: 0 }
      );
      distAgg = [totals];
    }

    const d = distAgg[0];
    const pie: PiePayload = {
      labels: ["A", "AB", "B", "BC", "C", "D", "E"],
      series: [
        Number(d.dist_a ?? 0),
        Number(d.dist_ab ?? 0),
        Number(d.dist_b ?? 0),
        Number(d.dist_bc ?? 0),
        Number(d.dist_c ?? 0),
        Number(d.dist_d ?? 0),
        Number(d.dist_e ?? 0),
      ],
      selected_semester_no: semNo ?? "ALL",
    };

    const payload: ChartResponse = { line, pie };
    return jsonPrivate(payload, 200);
  } catch (e: any) {
    return jsonPrivate({ error: e?.message || "Internal Server Error" }, 500);
  }
}
