/**
 * @swagger
 * /students/{id}/courses-maps:
 *   get:
 *     summary: Peta mata kuliah (course map) per mahasiswa
 *     description: |
 *       Mengembalikan peta mata kuliah berisi **nodes** (mata kuliah & placeholder pilihan)
 *       dan **edges** (prasyarat & corequisit) untuk seorang mahasiswa.
 *
 *       **Aturan Kelulusan per Node:**
 *       - `"Lulus"` → `enrollments.kelulusan = 'Lulus'` (atau lulus berdasar perbandingan `grade_index` vs `min_index`)
 *       - `"Tidak Lulus"` → `enrollments.kelulusan = 'Tidak Lulus'`
 *       - `"Belum Lulus"` → belum pernah diambil/sedang diambil/tidak ada record enrollment
 *
 *       **Placeholder MK Pilihan (Fixed Layout + Rename):**
 *       - Jumlah placeholder **tetap** per semester (mengikuti konfigurasi layout kurikulum).
 *       - Jika mahasiswa mengambil MK pilihan sebenarnya pada semester terkait, **kode & nama placeholder**
 *         diubah menjadi kode/nama MK sebenarnya (misal: kode **AZK7XYZ3**, nama **"Broadband Optical Network"**),
 *         dan status kelulusan mengikuti MK tersebut.
 *       - Jika belum ada MK pilihan yang diambil untuk slot tersebut, placeholder tetap
 *         bernama "Mata Kuliah Pilihan #n" dan berstatus `"Belum Lulus"`.
 *
 *       **Arah Edges:**
 *       - `from` = kode MK prasyarat/coreq
 *       - `to`   = kode MK target
 *
 *       Endpoint **memerlukan sesi Supabase yang valid**.
 *       Jika user **admin**, dapat mengakses data lintas mahasiswa (bypass RLS).
 *     tags: [deprecated]
 *     operationId: getStudentCoursesMap
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: UUID mahasiswa (`students.id`)
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CoursesMapResponse'
 *       400:
 *         description: Parameter path tidak valid (student id bukan UUID).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               invalid_id:
 *                 value: { error: "Invalid student id" }
 *       401:
 *         description: Unauthorized (tidak ada sesi Supabase).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               no_session:
 *                 value: { error: "Unauthorized" }
 *       403:
 *         description: Forbidden (student mencoba mengakses data milik mahasiswa lain).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               forbidden:
 *                 value: { error: "Forbidden" }
 *       500:
 *         description: Kesalahan server saat query ke Supabase/tabel terkait.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *
 *   schemas:
 *     CoursesMapResponse:
 *       type: object
 *       additionalProperties: false
 *       required: [curriculum_id, version, meta, nodes, edges]
 *       properties:
 *         curriculum_id:
 *           type: string
 *           example: "KUR-FTE"
 *         version:
 *           type: integer
 *           example: 1
 *         meta:
 *           type: object
 *           additionalProperties: false
 *           properties:
 *             name:
 *               type: string
 *               example: "Course Map"
 *             note:
 *               type: string
 *               example: "Kelulusan 3-status + MK Pilihan fixed layout (rename jika diambil)"
 *         nodes:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CourseNode'
 *         edges:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CourseEdge'
 *
 *     CourseNode:
 *       type: object
 *       additionalProperties: false
 *       required: [code, name, sks, semester_plan, corereq, kelulusan]
 *       properties:
 *         code:
 *           type: string
 *           description: Kode unik mata kuliah atau placeholder pilihan (mis. MK_PILIHAN1)
 *           example: "AZK1AAB3"
 *         name:
 *           type: string
 *           example: "Kalkulus 1"
 *         sks:
 *           type: integer
 *           minimum: 1
 *           example: 3
 *         semester_plan:
 *           type: integer
 *           nullable: true
 *           description: Semester rencana kurikulum (bisa null)
 *           example: 1
 *         corereq:
 *           type: array
 *           items:
 *             type: string
 *           description: Daftar kode mata kuliah corequisit (hanya untuk node reguler)
 *           example: []
 *         kelulusan:
 *           type: string
 *           description: Status kelulusan node untuk mahasiswa ini
 *           enum: ["Lulus", "Tidak Lulus", "Belum Lulus"]
 *           example: "Belum Lulus"
 *         mk_pilihan:
 *           type: boolean
 *           description: True jika node adalah placeholder MK pilihan
 *           example: false
 *         min_index:
 *           type: string
 *           nullable: true
 *           description: Indeks nilai minimal untuk lulus (hanya pada node reguler)
 *           enum: ["A", "AB", "B", "BC", "C", "D", "E"]
 *           example: "D"
 *         attributes:
 *           type: object
 *           additionalProperties: false
 *           properties:
 *             kategori:
 *               type: string
 *               enum: ["Wajib", "Pilihan"]
 *               example: "Wajib"
 *
 *     CourseEdge:
 *       type: object
 *       additionalProperties: false
 *       required: [from, to, type]
 *       properties:
 *         from:
 *           type: string
 *           description: Kode mata kuliah prasyarat/coreq
 *           example: "AZK1AAB3"
 *         to:
 *           type: string
 *           description: Kode mata kuliah target
 *           example: "AZK1FAB3"
 *         type:
 *           type: string
 *           enum: ["prereq", "coreq"]
 *
 *     ErrorResponse:
 *       type: object
 *       additionalProperties: false
 *       required: [error]
 *       properties:
 *         error:
 *           type: string
 */

export const dynamic = "force-dynamic";

import { type NextRequest } from "next/server";
import { jsonPrivate, isUuidLike } from "@/utils/api";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/lib/supabase";

type Kelulusan = "Lulus" | "Tidak Lulus" | "Belum Lulus";

type CourseNode = {
  code: string;
  name: string;
  sks: number;
  semester_plan: number | null;
  corereq: string[];
  kelulusan: Kelulusan;
  mk_pilihan?: boolean;
  min_index?: "A" | "AB" | "B" | "BC" | "C" | "D" | "E";
  attributes?: { kategori: "Wajib" | "Pilihan" };
};

type Edge = { from: string; to: string; type: "prereq" | "coreq" };

type CoursesMapResponse = {
  curriculum_id: string;
  version: number;
  meta: { name: string; note?: string };
  nodes: CourseNode[];
  edges: Edge[];
};

const GRADE_RANK: Record<string, number> = {
  A: 7,
  AB: 6,
  B: 5,
  BC: 4,
  C: 3,
  D: 2,
  E: 1,
};

// === CONFIG: layout fixed untuk placeholder MK Pilihan ===
const ELECTIVE_LAYOUT: Array<{
  semester: number;
  count: number;
  sks?: number;
}> = [
  { semester: 7, count: 4, sks: 3 },
  { semester: 8, count: 2, sks: 3 },
];

function passedByGrade(
  grade: string | null | undefined,
  minIndex: string | null | undefined
) {
  if (!grade || !minIndex) return false;
  const g = GRADE_RANK[String(grade).toUpperCase()] ?? -1;
  const m = GRADE_RANK[String(minIndex).toUpperCase()] ?? 99;
  return g >= m;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: studentId } = await context.params;
  if (!studentId || !isUuidLike(studentId))
    return jsonPrivate({ error: "Invalid student id" }, 400);

  try {
    // auth + role
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

    // courses
    const { data: courses, error: cErr } = await db
      .from("courses")
      .select("id, kode, nama, sks, mk_pilihan, min_index, semester_no")
      .order("semester_no", { ascending: true, nullsFirst: true })
      .order("kode", { ascending: true });
    if (cErr) return jsonPrivate({ error: cErr.message }, 500);

    // peta id<->kode + trim min_index dari CHAR(2)
    const idToCourse = new Map<string, any>();
    const idToCode = new Map<string, string>();
    const codeToId = new Map<string, string>();
    for (const c of courses ?? []) {
      idToCourse.set(c.id, c);
      idToCode.set(c.id, c.kode);
      codeToId.set(String(c.kode).toUpperCase(), c.id);
      if (typeof c.min_index === "string")
        c.min_index = c.min_index.trim() as any;
    }

    // enrollments
    const { data: enr, error: eErr } = await db
      .from("enrollments")
      .select("course_id, grade_index, kelulusan, semester_no")
      .eq("student_id", studentId);
    if (eErr) return jsonPrivate({ error: eErr.message }, 500);

    // status & best grade (untuk node reguler)
    const statusByCourseId = new Map<string, Kelulusan>();
    const bestGradeByCourseId = new Map<string, string>();
    for (const row of enr ?? []) {
      const cid = row.course_id as string | null;
      if (!cid) continue;

      const k = row.kelulusan as Kelulusan | null;
      if (k === "Lulus" || k === "Tidak Lulus" || k === "Belum Lulus") {
        statusByCourseId.set(cid, k);
      }
      const g = row.grade_index as string | null;
      if (g) {
        const up = g.toUpperCase();
        const prev = bestGradeByCourseId.get(cid);
        if (!prev || GRADE_RANK[up] > (GRADE_RANK[prev] ?? -1))
          bestGradeByCourseId.set(cid, up);
      }
    }

    // edges (prereq & coreq)
    const { data: prereqRaw, error: prErr } = await db
      .from("course_prereq")
      .select("course_id, prereq_course_id");
    if (prErr) return jsonPrivate({ error: prErr.message }, 500);

    const coreqRes = await db
      .from("course_coreq")
      .select("course_id, coreq_course_id");
    const coreqRaw = coreqRes.error ? [] : coreqRes.data ?? [];

    const prereqEdges: Edge[] = (prereqRaw ?? [])
      .map((r) => {
        const to = idToCode.get(r.course_id!);
        const from = idToCode.get(r.prereq_course_id!);
        if (!to || !from) return null;
        return { from, to, type: "prereq" as const };
      })
      .filter(Boolean) as Edge[];

    const coreqEdges: Edge[] = (coreqRaw ?? [])
      .map((r: any) => {
        const to = idToCode.get(r.course_id!);
        const from = idToCode.get(r.coreq_course_id!);
        if (!to || !from) return null;
        return { from, to, type: "coreq" as const };
      })
      .filter(Boolean) as Edge[];

    // coreq map: kode course -> array kode coreq
    const coreqMap = new Map<string, string[]>();
    for (const e of coreqEdges) {
      const arr = coreqMap.get(e.to) ?? [];
      arr.push(e.from);
      coreqMap.set(e.to, arr);
    }

    // nodes reguler (Wajib)
    const regularNodes: CourseNode[] = (courses ?? [])
      .filter((c) => !c.mk_pilihan)
      .map((c) => {
        const cid = c.id as string;
        const minI = (c.min_index ?? "D") as CourseNode["min_index"];

        let status = statusByCourseId.get(cid);
        if (!status) {
          status = "Belum Lulus";
          const best = bestGradeByCourseId.get(cid) ?? null;
          if (passedByGrade(best, minI)) status = "Lulus";
        }

        const rawCoreq = coreqMap.get(c.kode) ?? [];
        const filteredCoreq = rawCoreq.filter((k) => {
          const id = codeToId.get(String(k).toUpperCase());
          if (!id) return false;
          const course = (courses ?? []).find((x) => x.id === id);
          return course ? !course.mk_pilihan : false;
        });

        return {
          code: c.kode,
          name: c.nama,
          sks: Number(c.sks),
          semester_plan: c.semester_no ?? null,
          corereq: filteredCoreq,
          kelulusan: status,
          mk_pilihan: false,
          min_index: minI,
          attributes: { kategori: "Wajib" },
        };
      });

    // ==== Kumpulkan MK pilihan per semester (prefer enrollments.semester_no) ====
    const takenElectivesBySem: Map<
      number,
      Array<{ code: string; name: string; status: Kelulusan }>
    > = new Map();

    const rank = (s: Kelulusan) =>
      s === "Lulus" ? 3 : s === "Tidak Lulus" ? 2 : 1;

    for (const row of enr ?? []) {
      const cid = row.course_id as string | null;
      if (!cid) continue;

      const course = idToCourse.get(cid);
      if (!course || !course.mk_pilihan) continue;

      const enrSem = row.semester_no != null ? Number(row.semester_no) : null;
      const courseSem =
        course.semester_no != null ? Number(course.semester_no) : null;

      const preferSem =
        enrSem != null
          ? enrSem
          : courseSem != null
          ? courseSem
          : ELECTIVE_LAYOUT[0]?.semester ?? 7;

      const status = (row.kelulusan as Kelulusan) || "Belum Lulus";

      const list = takenElectivesBySem.get(preferSem) ?? [];
      const idx = list.findIndex((x) => x.code === course.kode);
      if (idx >= 0) {
        if (rank(status) > rank(list[idx].status)) list[idx].status = status;
      } else {
        list.push({ code: course.kode, name: course.nama, status });
      }
      takenElectivesBySem.set(preferSem, list);
    }

    for (const [sem, list] of takenElectivesBySem.entries()) {
      list.sort((a, b) => a.name.localeCompare(b.name));
      takenElectivesBySem.set(sem, list);
    }

    // ==== Placeholder MK Pilihan (fixed layout + rename jika ada data riil) ====
    let runningIdx = 1;
    const electiveNodes: CourseNode[] = [];

    for (const { semester, count, sks = 3 } of ELECTIVE_LAYOUT) {
      const taken = takenElectivesBySem.get(semester) ?? [];

      for (let i = 1; i <= count; i++, runningIdx++) {
        const takenItem = taken[i - 1];

        const code = takenItem ? takenItem.code : `MK_PILIHAN${runningIdx}`;
        const name = takenItem
          ? takenItem.name
          : `Mata Kuliah Pilihan #${runningIdx}`;
        const status: Kelulusan = takenItem ? takenItem.status : "Belum Lulus";

        electiveNodes.push({
          code,
          name,
          sks,
          semester_plan: semester,
          corereq: [],
          kelulusan: status,
          mk_pilihan: true,
          attributes: { kategori: "Pilihan" },
        });
      }
    }

    // edges hanya untuk node reguler
    const regularCodes = new Set<string>(regularNodes.map((n) => n.code));
    const edges: Edge[] = [...prereqEdges, ...coreqEdges].filter(
      (e) => regularCodes.has(e.from) && regularCodes.has(e.to)
    );

    const payload: CoursesMapResponse = {
      curriculum_id: "KUR-FTE",
      version: 1,
      meta: {
        name: "Course Map",
        note: "Kelulusan 3-status + MK Pilihan fixed layout (rename jika diambil)",
      },
      nodes: [...regularNodes, ...electiveNodes],
      edges,
    };

    return jsonPrivate(payload, 200);
  } catch (e: any) {
    return jsonPrivate({ error: e?.message ?? "Internal Server Error" }, 500);
  }
}
