/**
 * @swagger
 * /upload/grades:
 *   post:
 *     summary: Upload grades.csv lalu upsert ke tabel enrollments
 *     tags: [deprecated]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV header wajib: nim,kode,semester_no,tahun_ajaran,grade_index,sks
 *     responses:
 *       200:
 *         description: Hasil parsing & upsert
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean, example: true }
 *                 parsed: { type: integer, example: 12 }
 *                 inserted: { type: integer, example: 12 }
 *                 skipped_students: { type: integer, example: 0 }
 *                 skipped_courses: { type: integer, example: 1 }
 *                 samples:
 *                   type: object
 *                   properties:
 *                     missing_students: { type: array, items: { type: object } }
 *                     missing_courses:  { type: array, items: { type: object } }
 *       400:
 *         description: File/format tidak valid
 *       500:
 *         description: Error saat proses
 */


import { NextResponse } from "next/server";
import { parse } from "csv-parse/sync";
import { createAdminClient } from "@/lib/supabase";
import { GradeRow } from "@/models/types/upload/upload";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (!file.name.endsWith(".csv")) {
      return NextResponse.json({ error: "File must be .csv" }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const rows = parse(buf, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as GradeRow[];

    // Validasi header minimal
    const required = ["nim","kode","semester_no","tahun_ajaran","grade_index","sks"];
    const first = rows[0];
    if (!first || !required.every(k => Object.prototype.hasOwnProperty.call(first, k))) {
      return NextResponse.json({
        error: "CSV headers must be: nim,kode,semester_no,tahun_ajaran,grade_index,sks"
      }, { status: 400 });
    }

    // Normalisasi & kumpulkan set unik
    const clean: GradeRow[] = rows.map(r => ({
      nim: String(r.nim).trim(),
      kode: String(r.kode).trim(),
      semester_no: Number(r.semester_no),
      tahun_ajaran: String(r.tahun_ajaran).trim(),
      grade_index: String(r.grade_index).toUpperCase() as any,
      sks: Number(r.sks),
    }));

    // Filter grade_index invalid
    const validGrades = new Set(["A","B","C","D","E"]);
    const invalid = clean.filter(r => !validGrades.has(r.grade_index));
    if (invalid.length > 0) {
      return NextResponse.json({
        error: `Found invalid grade_index in ${invalid.length} row(s). Allowed: A,B,C,D,E`,
        samples: invalid.slice(0,5)
      }, { status: 400 });
    }

    const nims = Array.from(new Set(clean.map(r => r.nim)));
    const kodes = Array.from(new Set(clean.map(r => r.kode)));
    const semPairs = Array.from(
      new Set(clean.map(r => `${r.semester_no}|||${r.tahun_ajaran}`))
    ).map(s => {
      const [no, ta] = s.split("|||");
      return { semester_no: Number(no), tahun_ajaran: ta };
    });

    const supabase = createAdminClient();

    // Ambil map students & courses
    const [{ data: students, error: sErr }, { data: courses, error: cErr }] = await Promise.all([
      supabase.from("students").select("id,nim").in("nim", nims),
      supabase.from("courses").select("id,kode").in("kode", kodes),
    ]);
    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });
    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

    const studentMap = new Map((students ?? []).map(s => [s.nim, s.id]));
    const courseMap = new Map((courses ?? []).map(c => [c.kode, c.id]));

    // Pastikan semesters ada (pakai RPC helper fn_get_or_create_semester)
    // Jalankan untuk pasangan unik
    const createdSemIds: Array<{ key: string; id: string }> = [];
    for (const sp of semPairs) {
      const { data, error } = await supabase.rpc("fn_get_or_create_semester", {
        p_nomor: sp.semester_no,
        p_tahun_ajaran: sp.tahun_ajaran,
      });
      if (error) {
        return NextResponse.json({ error: `Create semester failed: ${error.message}` }, { status: 500 });
      }
      createdSemIds.push({ key: `${sp.semester_no}|||${sp.tahun_ajaran}`, id: data as unknown as string });
    }
    const semMap = new Map(createdSemIds.map(x => [x.key, x.id]));

    // Siapkan rows enrollments
    const notFoundStudents: GradeRow[] = [];
    const notFoundCourses: GradeRow[] = [];
    const toInsert: any[] = [];

    for (const r of clean) {
      const sid = studentMap.get(r.nim);
      if (!sid) { notFoundStudents.push(r); continue; }
      const cid = courseMap.get(r.kode);
      if (!cid) { notFoundCourses.push(r); continue; }
      const semId = semMap.get(`${r.semester_no}|||${r.tahun_ajaran}`);
      if (!semId) { 
        return NextResponse.json({ error: "Semester mapping missing (unexpected)" }, { status: 500 });
      }
      toInsert.push({
        student_id: sid,
        course_id: cid,
        semester_id: semId,
        grade_index: r.grade_index,
        sks: r.sks,
      });
    }

    // Upsert enrollments (butuh index unik)
    // Pastikan kamu sudah membuat unique index:
    // create unique index if not exists ux_enroll_unique on enrollments(student_id, course_id, semester_id);
    let inserted = 0;
    if (toInsert.length > 0) {
      const { error: iErr, count } = await supabase.from("enrollments")
        .upsert(toInsert, { onConflict: "student_id,course_id,semester_id", ignoreDuplicates: false, count: "exact" });
      if (iErr) return NextResponse.json({ error: iErr.message }, { status: 500 });
      inserted = count ?? toInsert.length;
    }

    return NextResponse.json({
      ok: true,
      parsed: rows.length,
      inserted,
      skipped_students: notFoundStudents.length,
      skipped_courses: notFoundCourses.length,
      samples: {
        missing_students: notFoundStudents.slice(0, 5),
        missing_courses: notFoundCourses.slice(0, 5),
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unexpected error" }, { status: 500 });
  }
}
