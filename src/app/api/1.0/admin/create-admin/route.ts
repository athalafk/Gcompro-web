/**
 * @swagger
 * /admin/bootstrap:
 *   post:
 *     tags:
 *       - debug
 *     summary: Bootstrap akun ADMIN (idempotent)
 *     description: >
 *       Membuat (atau memastikan keberadaan) user **ADMIN** di Supabase dan
 *       record terkait di tabel `students` serta `profiles`.
 *       
 *       **Mode otorisasi:**
 *       1) **Bootstrap (service role)** — kirim `Authorization: Bearer {SUPABASE_SERVICE_ROLE_KEY}`.  
 *       2) **Normal** — user harus login dan memiliki `profiles.role = "admin"`.
 *       
 *       Operasi ini idempotent: aman dipanggil berulang kali.
 *     security:
 *       - bearerAuth: []           # untuk mode normal (JWT user)
 *       - ServiceRoleAuth: []      # alternatif: service role key untuk bootstrap
 *     requestBody:
 *       required: false
 *     responses:
 *       200:
 *         description: Berhasil / idempotent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BootstrapResponse'
 *             examples:
 *               ok:
 *                 value: { ok: true }
 *       401:
 *         description: Unauthorized (tidak ada session user pada mode normal)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               unauthorized:
 *                 value: { error: "Unauthorized" }
 *       403:
 *         description: Forbidden (role user bukan admin pada mode normal)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               forbidden:
 *                 value: { error: "Forbidden" }
 *       500:
 *         description: Kesalahan server (mis. Supabase admin.createUser gagal)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               serverError:
 *                 value: { error: "some error message" }
 *
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: >
 *         Token akses user (mode normal). Wajib login; server akan cek `profiles.role = "admin"`.
 *     ServiceRoleAuth:
 *       type: apiKey
 *       in: header
 *       name: Authorization
 *       description: >
 *         **Hanya untuk bootstrap**. Gunakan format `Bearer {SUPABASE_SERVICE_ROLE_KEY}`.
 *         **Jangan** gunakan di klien publik.
 *   schemas:
 *     BootstrapResponse:
 *       type: object
 *       properties:
 *         ok:
 *           type: boolean
 *       required: [ok]
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *       required: [error]
 */

export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { jsonNoStore } from '@/utils/api';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const url    = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!url || !svcKey) {
    return jsonNoStore({ error: 'Missing SUPABASE envs' }, 500);
  }

  // --- Mode bootstrap? (Authorization: Bearer <service_key>)
  const authz = req.headers.get('authorization') || '';
  const isBootstrap = authz === `Bearer ${svcKey}`;

  if (!isBootstrap) {
    // Jalur normal: harus login & admin
    const sb = await createSupabaseServerClient();
    const { data: { user }, error: userErr } = await sb.auth.getUser();
    if (userErr) return jsonNoStore({ error: userErr.message }, 500);
    if (!user)   return jsonNoStore({ error: 'Unauthorized' }, 401);

    const { data: me, error: meErr } = await sb
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    if (meErr)                 return jsonNoStore({ error: meErr.message }, 500);
    if (me?.role !== 'admin')  return jsonNoStore({ error: 'Forbidden' }, 403);
  }

  // Service client (role: service) untuk admin ops
  const admin = createServiceClient(url, svcKey);

  // 1) Pastikan anchor student untuk ADMIN ada (idempotent)
  {
    const { error } = await admin
      .from('students')
      .upsert(
        {
          nim: 'ADMIN',
          nama: 'Administrator',
          prodi: 'STAFF',
          angkatan: 0,
          email: 'ADMIN@campus.ac.id',
        },
        { onConflict: 'nim' }
      );
    if (error) return jsonNoStore({ error: error.message }, 500);
  }

  // 2) Create auth user (idempotent)
  let createdUserId: string | undefined;
  {
    const { data, error } = await admin.auth.admin.createUser({
      email: 'ADMIN@campus.ac.id',
      password: 'ADMIN321!!!',
      email_confirm: true,
      user_metadata: { nim: 'ADMIN', full_name: 'Administrator' },
      app_metadata: { provider: 'email', providers: ['email'] },
    });

    if (error && !/exists|registered/i.test(error.message)) {
      return jsonNoStore({ error: error.message }, 500);
    }
    createdUserId = data?.user?.id;
  }

  // 3) Pastikan profile ada & role=admin (idempotent)
  if (createdUserId) {
    const { error } = await admin
      .from('profiles')
      .upsert(
        { id: createdUserId, nim: 'ADMIN', full_name: 'Administrator', role: 'admin' },
        { onConflict: 'id' }
      );
    if (error) return jsonNoStore({ error: error.message }, 500);
  }

  return jsonNoStore({ ok: true }, 200);
}
