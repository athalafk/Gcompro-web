/**
 * @swagger
 * /students:
 *   post:
 *     summary: Daftar Mahasiswa (admin only, filter prodi + search nama/nim + angkatan)
 *     description: |
 *       Mengambil daftar mahasiswa berdasarkan filter `prodi`, `search`, dan/atau `angkatan`.
 *       - Endpoint ini **hanya dapat diakses oleh role=admin** (dicek melalui `profiles.role`).
 *       - Query dijalankan menggunakan **service-role Supabase**.
 *       - Field yang dapat difilter:
 *         - `prodi`: pencarian partial pada nama program studi (case-insensitive).
 *         - `search`: pencarian pada nama atau NIM mahasiswa (case-insensitive).
 *         - `angkatan`: filter exact match tahun angkatan (integer).
 *       - Mendukung **pagination** (`page`, `pageSize`) dan **sorting** (`sortBy`, `sortDir`), termasuk sort by `angkatan`.
 *     tags: [Admin, Students]
 *     operationId: searchStudentsAdmin
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             allOf:
 *               - $ref: '#/components/schemas/StudentSearchRequest'
 *               - $ref: '#/components/schemas/PaginationAndSort'
 *           examples:
 *             all:
 *               summary: Get All Students
 *               value: {}
 *             by_prodi:
 *               summary: Filter berdasarkan prodi
 *               value: { prodi: "Informatika" }
 *             by_search:
 *               summary: Pencarian kata kunci nama/NIM
 *               value: { search: "13519" }
 *             by_angkatan:
 *               summary: Filter angkatan 2022
 *               value: { angkatan: 2022 }
 *             combined:
 *               summary: Prodi + angkatan + sorting
 *               value: { prodi: "Teknik", search: "Alice", angkatan: 2022, page: 2, pageSize: 10, sortBy: "angkatan", sortDir: "desc" }
 *     responses:
 *       200:
 *         description: OK (daftar mahasiswa ditemukan)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminStudentListResponse'
 *             examples:
 *               sample:
 *                 value:
 *                   items:
 *                     - id: "9f9a4212-0761-482d-8b01-a20c35f2010d"
 *                       nim: "13519001"
 *                       nama: "Alice Rahmawati"
 *                       prodi: "Teknik Telekomunikasi"
 *                       angkatan: 2019
 *                     - id: "b11b4212-0761-482d-8b01-a20c35f2010e"
 *                       nim: "13519002"
 *                       nama: "Budi Santoso"
 *                       prodi: "Teknik Informatika"
 *                       angkatan: 2020
 *                   page: 1
 *                   pageSize: 20
 *                   total: 2
 *                   sortBy: "angkatan"
 *                   sortDir: "asc"
 *                   filters: { prodi: null, search: null, angkatan: 2020 }
 *       401:
 *         description: Unauthorized (tidak ada sesi Supabase aktif)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               no_session: { value: { error: "Unauthorized" } }
 *       403:
 *         description: Forbidden (bukan admin)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               forbidden: { value: { error: "Forbidden" } }
 *       500:
 *         description: Kesalahan server (gagal query Supabase)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               db_error: { value: { error: "relation students does not exist" } }
 *
 *   get:
 *     summary: (Mirror) Daftar Mahasiswa via querystring (admin only)
 *     description: |
 *       Versi **GET** dari endpoint yang sama menggunakan querystring.
 *       - Mendukung filter `prodi`, `search`, `angkatan`, serta `page`, `pageSize`, `sortBy`, `sortDir`.
 *       - **Admin only**.
 *     tags: [Admin, Students]
 *     operationId: searchStudentsAdminViaQuery
 *     parameters:
 *       - in: query
 *         name: prodi
 *         required: false
 *         schema: { type: string, example: "Informatika" }
 *         description: Pencarian partial pada nama program studi (case-insensitive).
 *       - in: query
 *         name: search
 *         required: false
 *         schema: { type: string, example: "13519" }
 *         description: Kata kunci untuk mencari nama atau NIM mahasiswa (case-insensitive).
 *       - in: query
 *         name: angkatan
 *         required: false
 *         description: Filter exact match tahun angkatan (integer).
 *         schema: { type: integer, example: 2022, minimum: 1 }
 *       - in: query
 *         name: page
 *         required: false
 *         schema: { type: integer, minimum: 1, default: 1, example: 1 }
 *       - in: query
 *         name: pageSize
 *         required: false
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20, example: 20 }
 *       - in: query
 *         name: sortBy
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["nim", "nama", "prodi", "angkatan"]
 *           default: "nim"
 *       - in: query
 *         name: sortDir
 *         required: false
 *         schema:
 *           type: string
 *           enum: ["asc", "desc"]
 *           default: "asc"
 *     responses:
 *       200:
 *         description: OK (daftar mahasiswa ditemukan)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminStudentListResponse'
 *       401:
 *         description: Unauthorized (tidak ada sesi Supabase aktif)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       403:
 *         description: Forbidden (bukan admin)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       500:
 *         description: Kesalahan server (gagal query Supabase)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *
 * components:
 *   schemas:
 *     StudentSearchRequest:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         prodi:
 *           type: string
 *           description: Pencarian partial pada nama program studi (case-insensitive)
 *           example: "Informatika"
 *         search:
 *           type: string
 *           description: Kata kunci untuk mencari nama atau NIM mahasiswa (case-insensitive)
 *           example: "13519"
 *         angkatan:
 *           type: integer
 *           description: Filter exact match tahun angkatan (integer).
 *           example: 2022
 *
 *     PaginationAndSort:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         page:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *           example: 1
 *         pageSize:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *           example: 20
 *         sortBy:
 *           type: string
 *           enum: ["nim", "nama", "prodi", "angkatan"]
 *           default: "nim"
 *         sortDir:
 *           type: string
 *           enum: ["asc", "desc"]
 *           default: "asc"
 *
 *     StudentSummary:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         nim:
 *           type: string
 *           nullable: true
 *         nama:
 *           type: string
 *         prodi:
 *           type: string
 *           nullable: true
 *         angkatan:
 *           type: integer
 *           nullable: true
 *           example: 2020
 *       required: [id, nama]
 *
 *     AdminStudentListResponse:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         items:
 *           type: array
 *           items: { $ref: '#/components/schemas/StudentSummary' }
 *         page:
 *           type: integer
 *         pageSize:
 *           type: integer
 *         total:
 *           type: integer
 *         sortBy:
 *           type: string
 *           enum: ["nim", "nama", "prodi", "angkatan"]
 *         sortDir:
 *           type: string
 *           enum: ["asc", "desc"]
 *         filters:
 *           type: object
 *           additionalProperties: false
 *           properties:
 *             prodi: { type: string, nullable: true }
 *             search: { type: string, nullable: true }
 *             angkatan: { type: integer, nullable: true, example: 2022 }
 *       required: [items, page, pageSize, total, sortBy, sortDir, filters]
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
import { jsonNoStore, jsonPrivate, parsePagination, parseSorting } from '@/utils/api';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/lib/supabase';

const ALLOWED_SORT = ['nim', 'nama', 'prodi', 'angkatan'] as const;

async function handleList(req: NextRequest, useQueryString: boolean) {
  const supabaseUser = await createSupabaseServerClient();
  const { data: { user }, error: userErr } = await supabaseUser.auth.getUser();
  if (userErr) return { res: jsonNoStore({ error: userErr.message }, 500) };
  if (!user)   return { res: jsonNoStore({ error: 'Unauthorized' }, 401) };

  const { data: profile, error: profErr } = await supabaseUser
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profErr) return { res: jsonNoStore({ error: profErr.message }, 500) };
  if (profile?.role !== 'admin') return { res: jsonNoStore({ error: 'Forbidden' }, 403) };

  let prodi = '', search = '';
  let page: unknown = 1, pageSize: unknown = 20, sortBy: unknown = 'nim', sortDir: unknown = 'asc';
  let angkatanRaw: unknown = undefined;

  if (useQueryString) {
    const q = new URL(req.url).searchParams;
    prodi      = (q.get('prodi')    ?? '').trim();
    search     = (q.get('search')   ?? '').trim();
    page       =  q.get('page')     ?? 1;
    pageSize   =  q.get('pageSize') ?? 20;
    sortBy     =  q.get('sortBy')   ?? 'nim';
    sortDir    =  q.get('sortDir')  ?? 'asc';
    angkatanRaw = q.get('angkatan');
  } else {
    let body: any = {};
    try { body = await req.json(); } catch { /* optional */ }
    prodi      = typeof body.prodi    === 'string' ? body.prodi.trim()  : '';
    search     = typeof body.search   === 'string' ? body.search.trim() : '';
    page       = body.page;
    pageSize   = body.pageSize;
    sortBy     = body.sortBy;
    sortDir    = body.sortDir;
    angkatanRaw = body.angkatan;
  }

  const angkatan = Number(angkatanRaw);
  const hasAngkatan = Number.isFinite(angkatan) && angkatan > 0;

  const { page: p, pageSize: s, from, to } = parsePagination(page, pageSize, { page: 1, pageSize: 20, maxPageSize: 100 });
  const { sortBy: f, sortDir: d } = parseSorting(sortBy, sortDir, ALLOWED_SORT, 'nim', 'asc');

  const db = createAdminClient();

  let query = db
    .from('students')
    .select('id, nim, nama, prodi, angkatan', { count: 'exact' })
    .order(f, { ascending: d === 'asc' })
    .range(from, to);

  if (prodi) {
    query = query.ilike('prodi', `%${prodi}%`);
  }
  if (search) {
    const pattern = `%${search}%`;
    query = query.or(`nama.ilike.${pattern},nim.ilike.${pattern}`);
  }
  if (hasAngkatan) {
    query = query.eq('angkatan', angkatan);
  }

  const { data, count, error } = await query;
  if (error) return { res: jsonNoStore({ error: error.message }, 500) };

  const payload = {
    items: data ?? [],
    page: p,
    pageSize: s,
    total: count ?? 0,
    sortBy: f,
    sortDir: d,
    filters: { prodi: prodi || null, search: search || null, angkatan: hasAngkatan ? angkatan : null }, // ← NEW
  };

  return { payload };
}

// POST (compat, tidak di-cache)
export async function POST(req: NextRequest) {
  const { res, payload } = await handleList(req, false);
  if (res) return res;
  return jsonNoStore(payload, 200);
}

// GET mirror (admin-only, bisa di-cache privat)
export async function GET(req: NextRequest) {
  const { res, payload } = await handleList(req, true);
  if (res) return res;
  return jsonPrivate(payload, 200);
}