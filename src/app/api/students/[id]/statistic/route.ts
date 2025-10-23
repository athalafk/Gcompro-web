/**
 * @swagger
 * /api/students/{id}/statistic:
 *   post:
 *     summary: Statistik mahasiswa per semester (IPS saat itu, IPK kumulatif, dan progres SKS)
 *     description: |
 *       Mengembalikan statistik untuk seorang mahasiswa pada semester tertentu.
 *       - Body menerima `semester` dalam format **"Ganjil YYYY/YYYY"** atau **"Genap YYYY/YYYY"**.
 *       - Backend akan mengubahnya menjadi `nomor` (1=Ganjil, 2=Genap) dan `tahun_ajaran`,
 *         lalu memanggil RPC `fn_get_or_create_semester` untuk memperoleh `semester_id`.
 *       - Data diambil dari:
 *         - `semester_stats.ips` (IPS semester tersebut)
 *         - `cumulative_stats.gpa_cum` dan `cumulative_stats.sks_lulus`
 *       - Target SKS default: **144** (konstanta `DEFAULT_TARGET_SKS`).
 *       - Endpoint **memerlukan sesi Supabase yang valid**. Jika user **admin**, query dijalankan dengan admin client.
 *     tags: [Students]
 *     operationId: getStudentStatistic
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: UUID mahasiswa (kolom `students.id`)
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StatsRequest'
 *           examples:
 *             ganjil_ok:
 *               summary: Ganjil
 *               value: { semester: "Ganjil 2021/2022" }
 *             genap_ok:
 *               summary: Genap
 *               value: { semester: "Genap 2023/2024" }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatsResponse'
 *             examples:
 *               sample:
 *                 value:
 *                   semester: "Ganjil 2021/2022"
 *                   ips: 3.25
 *                   ipk: 3.10
 *                   total_sks: 144
 *                   sks_selesai: 72
 *                   sks_tersisa: 72
 *       400:
 *         description: Body/format semester tidak valid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               bad_json:
 *                 value: { error: "Body JSON invalid" }
 *               bad_format:
 *                 value: { error: "Format semester harus 'Ganjil YYYY/YYYY' atau 'Genap YYYY/YYYY'." }
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
 *         description: Forbidden (bukan admin saat meminta akses admin-only; saat ini logika hanya mempromosikan admin client).
 *       500:
 *         description: Error server (RPC/queri Supabase).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               rpc_fail:
 *                 value: { error: "function fn_get_or_create_semester(...) does not exist" }
 *
 * components:
 *   schemas:
 *     StatsRequest:
 *       type: object
 *       additionalProperties: false
 *       required: [semester]
 *       properties:
 *         semester:
 *           type: string
 *           description: "Format harus 'Ganjil YYYY/YYYY' atau 'Genap YYYY/YYYY'."
 *           example: "Ganjil 2021/2022"
 *
 *     StatsResponse:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         semester:
 *           type: string
 *           description: Semester yang sudah dinormalisasi dari input.
 *           example: "Ganjil 2021/2022"
 *         ips:
 *           type: number
 *           format: float
 *           nullable: true
 *           description: IPS pada semester tersebut (dari `semester_stats.ips`).
 *         ipk:
 *           type: number
 *           format: float
 *           nullable: true
 *           description: IPK kumulatif (dari `cumulative_stats.gpa_cum`).
 *         total_sks:
 *           type: integer
 *           description: Target total SKS (default 144).
 *           example: 144
 *         sks_selesai:
 *           type: integer
 *           description: Total SKS lulus (dari `cumulative_stats.sks_lulus`).
 *           example: 72
 *         sks_tersisa:
 *           type: integer
 *           description: Sisa SKS = total_sks - sks_selesai (min 0).
 *           example: 72
 *       required: [semester, total_sks, sks_selesai, sks_tersisa]
 *
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

const DEFAULT_TARGET_SKS = 144;

// === Helpers
function isValidSemesterFormat(v: unknown): v is string {
  if (typeof v !== "string") return false;
  return /^ *(Ganjil|Genap) +\d{4}\/\d{4} *$/i.test(v.trim());
}

function parseSemester(input: string): { nomor: 1 | 2; tahun_ajaran: string } {
  const raw = input.trim();
  const isGanjil = /^Ganjil/i.test(raw);
  const isGenap  = /^Genap/i.test(raw);
  const tahun = raw.match(/(\d{4}\/\d{4})/)?.[1];
  if (!tahun || (!isGanjil && !isGenap)) {
    throw new Error("Format semester tidak valid (contoh: 'Ganjil 2021/2022' atau 'Genap 2021/2022').");
  }
  return { nomor: isGanjil ? 1 : 2, tahun_ajaran: tahun };
}

type StatsResponse = {
  semester: string;
  ips: number | null;
  ipk: number | null;
  total_sks: number;
  sks_selesai: number;
  sks_tersisa: number;
};

export async function POST(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id: studentId } = await context.params;
  // --- Auth (pakai sesi Supabase)
  const supabaseUser = await createClient();
  const {
    data: { user },
    error: userErr,
  } = await supabaseUser.auth.getUser();

  if (userErr) return NextResponse.json({ error: userErr.message }, { status: 500 });
  if (!user)   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // --- Role check
  const { data: profile, error: profErr } = await supabaseUser
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profErr) return NextResponse.json({ error: profErr.message }, { status: 500 });

  const isAdmin = profile?.role === "admin";
  const db = isAdmin ? await createAdminClient() : supabaseUser;

  // --- Parse body & semester
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON invalid" }, { status: 400 });
  }

  const semesterStr = body?.semester;
  if (!isValidSemesterFormat(semesterStr)) {
    return NextResponse.json(
      { error: "Format semester harus 'Ganjil YYYY/YYYY' atau 'Genap YYYY/YYYY'." },
      { status: 400 }
    );
  }

  let nomor: 1 | 2, tahun_ajaran: string;
  try {
    ({ nomor, tahun_ajaran } = parseSemester(semesterStr));
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Semester tidak valid" }, { status: 400 });
  }

  // 1) Dapatkan/buat semester_id via RPC
  const { data: semesterIdRaw, error: semErr } = await db.rpc("fn_get_or_create_semester", {
    p_nomor: nomor,
    p_tahun_ajaran: tahun_ajaran,
  });
  if (semErr) return NextResponse.json({ error: semErr.message }, { status: 500 });
  const semesterId = semesterIdRaw as string | null;
  if (!semesterId) {
    return NextResponse.json({ error: "semester_id tidak ditemukan/terbuat" }, { status: 500 });
  }

  // 2) Ambil IPS dari semester_stats
  const { data: semStat, error: statErr } = await db
    .from("semester_stats")
    .select("ips")
    .eq("student_id", studentId)
    .eq("semester_id", semesterId)
    .maybeSingle();

  if (statErr) return NextResponse.json({ error: statErr.message }, { status: 500 });
  const ips: number | null = semStat?.ips ?? null;

  // 3) Ambil IPK & SKS lulus dari cumulative_stats
  const { data: cumu, error: cumErr } = await db
    .from("cumulative_stats")
    .select("gpa_cum, sks_lulus")
    .eq("student_id", studentId)
    .maybeSingle();

  if (cumErr) return NextResponse.json({ error: cumErr.message }, { status: 500 });

  const ipk = (cumu?.gpa_cum ?? null) as number | null;
  const sks_selesai = Number(cumu?.sks_lulus ?? 0);
  const total_sks = DEFAULT_TARGET_SKS;
  const sks_tersisa = Math.max(0, total_sks - sks_selesai);

  const result: StatsResponse = {
    semester: `${nomor === 1 ? "Ganjil" : "Genap"} ${tahun_ajaran}`,
    ips,
    ipk,
    total_sks,
    sks_selesai,
    sks_tersisa,
  };

  return NextResponse.json(result, { status: 200 });
}
