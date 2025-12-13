/**
 * @swagger
 * /students/{id}/courses-map:
 *   get:
 *     summary: Peta mata kuliah (course map) per mahasiswa
 *     description: |
 *       Mengembalikan peta mata kuliah berisi **nodes** (mata kuliah & placeholder pilihan),
 *       di mana setiap node menyimpan langsung **prereq** dan **corereq** (bukan lagi via edges).
 *
 *       **Aturan Kelulusan per Node:**
 *       - `"Lulus"` → `enrollments.kelulusan = 'Lulus'`
 *       - `"Tidak Lulus"` → `enrollments.kelulusan = 'Tidak Lulus'`
 *       - `"Belum Lulus"` → belum pernah lulus/tidak ada record FINAL
 *
 *       **Placeholder MK Pilihan (Fixed Layout + Rename):**
 *       - Jumlah placeholder **tetap** per semester (mengikuti konfigurasi layout kurikulum).
 *       - Course pilihan adalah course **real** (`courses.mk_pilihan=true`).
 *       - Jika mahasiswa mengambil MK pilihan (FINAL), slot placeholder akan **di-rename** menjadi kode/nama MK real.
 *       - Pengisian slot dilakukan **berurutan** mengikuti layout (mis: 4 slot semester 7 diisi dulu, baru 2 slot semester 8),
 *         tidak mengikuti `enrollments.semester_no` (karena frontend layout fixed).
 *
 *       Endpoint **memerlukan sesi Supabase yang valid**.
 *       Jika user **admin**, dapat mengakses data lintas mahasiswa (bypass RLS).
 *     tags: [Students]
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
 *       required: [curriculum_id, version, meta, nodes]
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
 *               example: "Kelulusan 3-status + MK Pilihan fixed layout (slot berurutan)"
 *         nodes:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CourseNode'
 *
 *     RequisiteItem:
 *       type: object
 *       additionalProperties: false
 *       required: [code, name]
 *       properties:
 *         code:
 *           type: string
 *           example: "AZK1AAB3"
 *         name:
 *           type: string
 *           example: "Kalkulus 1"
 *
 *     CourseNode:
 *       type: object
 *       additionalProperties: false
 *       required: [code, name, sks, semester_plan, prereq, corereq, kelulusan]
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
 *         prereq:
 *           type: array
 *           description: Daftar prasyarat (masing-masing berisi {code, name})
 *           items:
 *             $ref: '#/components/schemas/RequisiteItem'
 *         corereq:
 *           type: array
 *           description: Daftar corequisit (masing-masing berisi {code, name})
 *           items:
 *             $ref: '#/components/schemas/RequisiteItem'
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
 *     ErrorResponse:
 *       type: object
 *       additionalProperties: false
 *       required: [error]
 *       properties:
 *         error:
 *           type: string
 */

export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { jsonPrivate, isUuidLike } from '@/utils/api';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/lib/supabase';

type Kelulusan = 'Lulus' | 'Tidak Lulus' | 'Belum Lulus';
type RequisiteItem = { code: string; name: string };

type CourseNode = {
  code: string;
  name: string;
  sks: number;
  semester_plan: number | null;
  prereq: RequisiteItem[];
  corereq: RequisiteItem[];
  kelulusan: Kelulusan;
  mk_pilihan?: boolean;
  min_index?: 'A' | 'AB' | 'B' | 'BC' | 'C' | 'D' | 'E';
  attributes?: { kategori: 'Wajib' | 'Pilihan' };
};

type CoursesMapResponse = {
  curriculum_id: string;
  version: number;
  meta: { name: string; note?: string };
  nodes: CourseNode[];
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
const ELECTIVE_LAYOUT: Array<{ semester: number; count: number; sks?: number }> = [
  { semester: 7, count: 4, sks: 3 },
  { semester: 8, count: 2, sks: 3 },
];

function passedByGrade(grade: string | null | undefined, minIndex: string | null | undefined) {
  if (!grade || !minIndex) return false;
  const g = GRADE_RANK[String(grade).toUpperCase()] ?? -1;
  const m = GRADE_RANK[String(minIndex).toUpperCase()] ?? 99;
  return g >= m;
}

const statusRank = (s: Kelulusan) => (s === 'Lulus' ? 3 : s === 'Tidak Lulus' ? 2 : 1);

type CourseRow = {
  id: string;
  kode: string;
  nama: string;
  sks: number;
  mk_pilihan: boolean;
  min_index: string | null;
  semester_no: number | null;
};

type EnrollmentRow = {
  course_id: string | null;
  grade_index: string | null;
  kelulusan: string | null;
};

type CourseRelRow = { course_id: string | null; prereq_course_id?: string | null; coreq_course_id?: string | null };

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: studentId } = await context.params;
  if (!studentId || !isUuidLike(studentId)) return jsonPrivate({ error: 'Invalid student id' }, 400);

  try {
    // auth + role
    const supabaseUser = await createSupabaseServerClient();
    const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
    if (userErr) return jsonPrivate({ error: userErr.message }, 500);
    if (!user) return jsonPrivate({ error: 'Unauthorized' }, 401);

    const { data: profile, error: profErr } = await supabaseUser
      .from('profiles')
      .select('role, nim')
      .eq('id', user.id)
      .single();
    if (profErr) return jsonPrivate({ error: profErr.message }, 500);

    const isAdmin = profile?.role === 'admin';
    if (!isAdmin) {
      const { data: own, error: ownErr } = await supabaseUser
        .from('students')
        .select('id')
        .eq('id', studentId)
        .eq('nim', profile?.nim ?? '')
        .maybeSingle();

      if (ownErr) return jsonPrivate({ error: ownErr.message }, 500);
      if (!own) return jsonPrivate({ error: 'Forbidden' }, 403);
    }

    const db = isAdmin ? createAdminClient() : supabaseUser;

    // courses
    const { data: coursesRaw, error: cErr } = await db
      .from('courses')
      .select('id, kode, nama, sks, mk_pilihan, min_index, semester_no')
      .order('semester_no', { ascending: true, nullsFirst: true })
      .order('kode', { ascending: true });
    if (cErr) return jsonPrivate({ error: cErr.message }, 500);

    const courses = (coursesRaw ?? []) as CourseRow[];

    // peta id<->course + trim min_index dari CHAR(2)
    const idToCourse = new Map<string, CourseRow>();
    for (const c of courses) {
      if (typeof c.min_index === 'string') c.min_index = c.min_index.trim();
      idToCourse.set(c.id, c);
    }

    // enrollments (FINAL only -> status kelulusan)
    const { data: enrRaw, error: eErr } = await db
      .from('enrollments')
      .select('course_id, grade_index, kelulusan')
      .eq('student_id', studentId)
      .eq('status', 'FINAL');
    if (eErr) return jsonPrivate({ error: eErr.message }, 500);

    const enr = (enrRaw ?? []) as EnrollmentRow[];

    // status & best grade (untuk node reguler)
    const statusByCourseId = new Map<string, Kelulusan>();
    const bestGradeByCourseId = new Map<string, string>();

    for (const row of enr) {
      const cid = row.course_id;
      if (!cid) continue;

      const k = row.kelulusan as Kelulusan | null;
      if (k === 'Lulus' || k === 'Tidak Lulus' || k === 'Belum Lulus') {
        const prev = statusByCourseId.get(cid);
        if (!prev || statusRank(k) > statusRank(prev)) statusByCourseId.set(cid, k);
      }

      const g = row.grade_index;
      if (g) {
        const up = g.toUpperCase();
        const prev = bestGradeByCourseId.get(cid);
        if (!prev || (GRADE_RANK[up] ?? -1) > (GRADE_RANK[prev] ?? -1)) bestGradeByCourseId.set(cid, up);
      }
    }

    // ambil relasi prereq & coreq
    const { data: prereqRaw, error: prErr } = await db
      .from('course_prereq')
      .select('course_id, prereq_course_id');
    if (prErr) return jsonPrivate({ error: prErr.message }, 500);

    const coreqRes = await db
      .from('course_coreq')
      .select('course_id, coreq_course_id');
    const coreqRaw = coreqRes.error ? [] : coreqRes.data ?? [];

    const prereqMap = new Map<string, RequisiteItem[]>();
    for (const r of (prereqRaw ?? []) as CourseRelRow[]) {
      const targetId = r.course_id ?? null;
      const preId = r.prereq_course_id ?? null;
      if (!targetId || !preId) continue;

      const target = idToCourse.get(targetId);
      const pre = idToCourse.get(preId);
      if (!target || !pre) continue;
      if (pre.mk_pilihan) continue; // hanya tampilkan prasyarat reguler

      const key = target.kode.toUpperCase();
      const list = prereqMap.get(key) ?? [];
      list.push({ code: pre.kode, name: pre.nama });
      prereqMap.set(key, list);
    }

    const coreqMap = new Map<string, RequisiteItem[]>();
    for (const r of (coreqRaw ?? []) as CourseRelRow[]) {
      const targetId = r.course_id ?? null;
      const coId = r.coreq_course_id ?? null;
      if (!targetId || !coId) continue;

      const target = idToCourse.get(targetId);
      const co = idToCourse.get(coId);
      if (!target || !co) continue;
      if (co.mk_pilihan) continue; // hanya tampilkan coreq reguler

      const key = target.kode.toUpperCase();
      const list = coreqMap.get(key) ?? [];
      list.push({ code: co.kode, name: co.nama });
      coreqMap.set(key, list);
    }

    // nodes reguler (Wajib = bukan mk_pilihan)
    const regularNodes: CourseNode[] = courses
      .filter((c) => !c.mk_pilihan)
      .map((c) => {
        const cid = c.id;
        const minI = (c.min_index ?? 'D') as CourseNode['min_index'];

        // status: prefer kelulusan FINAL; fallback by grade vs min_index (safety)
        let status = statusByCourseId.get(cid);
        if (!status) {
          status = 'Belum Lulus';
          const best = bestGradeByCourseId.get(cid) ?? null;
          if (passedByGrade(best, minI)) status = 'Lulus';
        }

        const key = c.kode.toUpperCase();
        const prereq = (prereqMap.get(key) ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
        const corereq = (coreqMap.get(key) ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));

        return {
          code: c.kode,
          name: c.nama,
          sks: Number(c.sks),
          semester_plan: c.semester_no ?? null,
          prereq,
          corereq,
          kelulusan: status,
          mk_pilihan: false,
          min_index: minI,
          attributes: { kategori: 'Wajib' },
        };
      });

    // ==== MK pilihan yang diambil (course real) -> isi slot berurutan mengikuti layout (fixed) ====
    // Kumpulkan electives unik + status terbaik
    const takenElectives = new Map<string, { code: string; name: string; status: Kelulusan }>();

    for (const row of enr) {
      const cid = row.course_id;
      if (!cid) continue;

      const course = idToCourse.get(cid);
      if (!course || !course.mk_pilihan) continue;

      const status = (row.kelulusan as Kelulusan) || 'Belum Lulus';
      const key = course.kode.toUpperCase();

      const prev = takenElectives.get(key);
      if (!prev || statusRank(status) > statusRank(prev.status)) {
        takenElectives.set(key, { code: course.kode, name: course.nama, status });
      }
    }

    const takenElectivesList = Array.from(takenElectives.values())
      .sort((a, b) => a.name.localeCompare(b.name));

    // Placeholder nodes fixed + rename by taken list
    let runningIdx = 1;
    let takenIdx = 0;
    const electiveNodes: CourseNode[] = [];

    for (const { semester, count, sks = 3 } of ELECTIVE_LAYOUT) {
      for (let i = 1; i <= count; i++, runningIdx++) {
        const takenItem = takenElectivesList[takenIdx];
        if (takenItem) takenIdx++;

        const code = takenItem ? takenItem.code : `MK_PILIHAN${runningIdx}`;
        const name = takenItem ? takenItem.name : `Mata Kuliah Pilihan #${runningIdx}`;
        const status: Kelulusan = takenItem ? takenItem.status : 'Belum Lulus';

        electiveNodes.push({
          code,
          name,
          sks,
          semester_plan: semester,
          prereq: [],
          corereq: [],
          kelulusan: status,
          mk_pilihan: true,
          attributes: { kategori: 'Pilihan' },
        });
      }
    }

    const payload: CoursesMapResponse = {
      curriculum_id: 'KUR-FTE',
      version: 1,
      meta: {
        name: 'Course Map',
        note: 'Kelulusan 3-status + MK Pilihan fixed layout (slot berurutan)',
      },
      nodes: [...regularNodes, ...electiveNodes],
    };

    return jsonPrivate(payload, 200);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Internal Server Error';
    return jsonPrivate({ error: msg }, 500);
  }
}
