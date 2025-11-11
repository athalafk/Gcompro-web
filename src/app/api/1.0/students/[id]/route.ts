/**
 * @swagger
 * /students/{id}:
 *   get:
 *     summary: Detail mahasiswa berdasarkan ID
 *     description: |
 *       Mengambil data lengkap 1 mahasiswa berdasarkan `id`.
 *       Endpoint ini memerlukan sesi Supabase yang valid (autentikasi).
 *     tags: [Students]
 *     operationId: getStudentById
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
 *         description: Data mahasiswa ditemukan.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StudentDetail'
 *             examples:
 *               sample:
 *                 value:
 *                   id: "9f9a4212-0761-482d-8b01-a20c35f2010d"
 *                   nim: "13519001"
 *                   nama: "Alice Rahmawati"
 *                   prodi: "Teknik Telekomunikasi"
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
 *       404:
 *         description: Mahasiswa tidak ditemukan.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               not_found:
 *                 value: { error: "Not Found" }
 *       500:
 *         description: Kesalahan query Supabase.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               db_error:
 *                 value: { error: "relation students does not exist" }
 *
 * components:
 *   schemas:
 *     StudentDetail:
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
 *       required: [id, nama]
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
import { jsonPrivate, isUuidLike } from '@/utils/api';
import { createSupabaseServerClient } from '@/utils/supabase/server';

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!id || !isUuidLike(id)) return jsonPrivate({ error: 'Invalid student id' }, 400);

  const supabase = await createSupabaseServerClient();

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr) return jsonPrivate({ error: userErr.message }, 500);
  if (!user)   return jsonPrivate({ error: 'Unauthorized' }, 401);

  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('role, nim')
    .eq('id', user.id)
    .single();
  if (profErr) return jsonPrivate({ error: profErr.message }, 500);

  const isAdmin = profile?.role === 'admin';
  if (!isAdmin) {
    const { data: own, error: ownErr } = await supabase
      .from('students')
      .select('id')
      .eq('id', id)
      .eq('nim', profile?.nim ?? '')
      .maybeSingle();
    if (ownErr) return jsonPrivate({ error: ownErr.message }, 500);
    if (!own)   return jsonPrivate({ error: 'Forbidden' }, 403);
  }

  const { data, error } = await supabase
    .from('students')
    .select('id, nama, nim, prodi')
    .eq('id', id)
    .single();

  if (error) return jsonPrivate({ error: error.message }, 500);
  if (!data)  return jsonPrivate({ error: 'Not Found' }, 404);

  return jsonPrivate(data, 200);
}