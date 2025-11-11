/**
 * @swagger
 * /students/{id}/statistic:
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
 *       - Target SKS default: **144**.
 *       - Endpoint **memerlukan sesi Supabase**. Jika user **admin**, query dijalankan dengan admin client (bypass RLS).
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
 *         description: Parameter path tidak valid (student id bukan UUID).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               invalid_id: { value: { error: "Invalid student id" } }
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
 *       422:
 *         description: Format `semester` tidak valid.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               bad_format:
 *                 value: { error: "Format semester harus 'Ganjil YYYY/YYYY' atau 'Genap YYYY/YYYY'." }
 *       500:
 *         description: Error server (RPC/kueri Supabase).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               rpc_fail:
 *                 value: { error: "function fn_get_or_create_semester(...) does not exist" }
 *
 *   get:
 *     summary: (Mirror) Statistik mahasiswa per semester via querystring
 *     description: |
 *       Versi **GET** dari endpoint yang sama. Menggunakan query `semester`:
 *       **"Ganjil YYYY/YYYY"** atau **"Genap YYYY/YYYY"**.
 *       - Output sama dengan metode **POST**.
 *       - Memerlukan sesi Supabase yang valid.
 *     tags: [Students]
 *     operationId: getStudentStatisticViaQuery
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: UUID mahasiswa (kolom `students.id`)
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: semester
 *         required: true
 *         description: "Format harus 'Ganjil YYYY/YYYY' atau 'Genap YYYY/YYYY'."
 *         schema:
 *           type: string
 *           example: "Genap 2023/2024"
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StatsResponse'
 *       400:
 *         description: Parameter path tidak valid (student id bukan UUID).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               invalid_id: { value: { error: "Invalid student id" } }
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
 *       422:
 *         description: Format `semester` tidak valid.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               bad_format:
 *                 value: { error: "Format semester harus 'Ganjil YYYY/YYYY' atau 'Genap YYYY/YYYY'." }
 *       500:
 *         description: Error server (RPC/kueri Supabase).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
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


export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { jsonNoStore, jsonPrivate, isUuidLike, isValidSemesterFormat, parseSemester } from '@/utils/api';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/lib/supabase';

const DEFAULT_TARGET_SKS = 144 as const;

type StatsResponse = {
  semester: string;
  ips: number | null;
  ipk: number | null;
  total_sks: number;
  sks_selesai: number;
  sks_tersisa: number;
};

async function computeStats(studentId: string, semesterStr: string, supabaseUser: any, isAdmin: boolean) {
  const { nomor, tahun_ajaran } = parseSemester(semesterStr);
  const db = isAdmin ? createAdminClient() : supabaseUser;

  const { data: semesterIdRaw, error: semErr } = await db.rpc('fn_get_or_create_semester', {
    p_nomor: nomor, p_tahun_ajaran: tahun_ajaran,
  });
  if (semErr) throw new Error(semErr.message);
  const semesterId = semesterIdRaw as string | null;
  if (!semesterId) throw new Error('semester_id tidak ditemukan/terbuat');

  const { data: semStat, error: statErr } = await db
    .from('semester_stats')
    .select('ips')
    .eq('student_id', studentId)
    .eq('semester_id', semesterId)
    .maybeSingle();
  if (statErr) throw new Error(statErr.message);
  const ips = semStat?.ips == null ? null : Number(semStat.ips);

  const { data: cumu, error: cumErr } = await db
    .from('cumulative_stats')
    .select('gpa_cum, sks_lulus')
    .eq('student_id', studentId)
    .maybeSingle();
  if (cumErr) throw new Error(cumErr.message);

  const ipk = cumu?.gpa_cum == null ? null : Number(cumu.gpa_cum);
  const sks_selesai = Number(cumu?.sks_lulus ?? 0);
  const total_sks = DEFAULT_TARGET_SKS;
  const sks_tersisa = Math.max(0, total_sks - sks_selesai);

  const result: StatsResponse = {
    semester: `${nomor === 1 ? 'Ganjil' : 'Genap'} ${tahun_ajaran}`,
    ips, ipk, total_sks, sks_selesai, sks_tersisa,
  };
  return result;
}

async function ensureAuthAndOwnership(req: NextRequest, studentId: string) {
  const supabaseUser = await createSupabaseServerClient();
  const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr) return { error: jsonNoStore({ error: userErr.message }, 500) };
  if (!user)   return { error: jsonNoStore({ error: 'Unauthorized' }, 401) };

  const { data: profile, error: profErr } = await supabaseUser
    .from('profiles').select('role, nim').eq('id', user.id).single();
  if (profErr) return { error: jsonNoStore({ error: profErr.message }, 500) };

  const isAdmin = profile?.role === 'admin';
  if (!isAdmin) {
    const { data: own, error: ownErr } = await supabaseUser
      .from('students').select('id').eq('id', studentId).eq('nim', profile?.nim ?? '').maybeSingle();
    if (ownErr) return { error: jsonNoStore({ error: ownErr.message }, 500) };
    if (!own)   return { error: jsonNoStore({ error: 'Forbidden' }, 403) };
  }

  return { supabaseUser, isAdmin };
}

// POST (compat)
export async function POST(req: NextRequest, context: { params: { id: string } }) {
  const studentId = context.params.id;
  if (!studentId || !isUuidLike(studentId)) return jsonNoStore({ error: 'Invalid student id' }, 400);

  const auth = await ensureAuthAndOwnership(req, studentId);
  if ('error' in auth) return auth.error;

  let body: any = {};
  try { body = await req.json(); } catch { /* ignore */ }
  const semesterStr = body?.semester;
  if (!isValidSemesterFormat(semesterStr)) {
    return jsonNoStore({ error: "Format semester harus 'Ganjil YYYY/YYYY' atau 'Genap YYYY/YYYY'." }, 422);
  }

  try {
    const result = await computeStats(studentId, semesterStr, auth.supabaseUser, auth.isAdmin);
    return jsonNoStore(result, 200);
  } catch (e: any) {
    return jsonNoStore({ error: e?.message || 'Internal Server Error' }, 500);
  }
}

// GET mirror (cachable privat)
export async function GET(req: NextRequest, context: { params: { id: string } }) {
  const studentId = context.params.id;
  if (!studentId || !isUuidLike(studentId)) return jsonPrivate({ error: 'Invalid student id' }, 400);

  const { searchParams } = new URL(req.url);
  const semesterStr = searchParams.get('semester') || '';
  if (!isValidSemesterFormat(semesterStr)) {
    return jsonPrivate({ error: "Format semester harus 'Ganjil YYYY/YYYY' atau 'Genap YYYY/YYYY'." }, 422);
  }

  const auth = await ensureAuthAndOwnership(req, studentId);
  if ('error' in auth) {
    const r = auth.error;
    try { return jsonPrivate(await r?.json(), r?.status); } catch { return jsonPrivate({ error: 'Auth error' }, 401); }
  }

  try {
    const result = await computeStats(studentId, semesterStr, auth.supabaseUser, auth.isAdmin);
    return jsonPrivate(result, 200);
  } catch (e: any) {
    return jsonPrivate({ error: e?.message || 'Internal Server Error' }, 500);
  }
}

