/**
 * @swagger
 * /admin/accounts/bulk:
 *   post:
 *     summary: Buat banyak akun sekaligus berdasarkan daftar NIM.
 *     description: >
 *       **Hanya admin** (ditentukan dari `profiles.role = "admin"`).  
 *       Autentikasi via Bearer JWT (Supabase) — atau session cookie yang
 *       dikonversi middleware ke header Authorization di server.
 *     tags: [debug]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [nims]
 *             properties:
 *               nims:
 *                 type: array
 *                 description: Daftar NIM yang sudah ada di tabel `students`.
 *                 items:
 *                   type: string
 *                 example: ["1301320001","1301320002","1301320003"]
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: Password default untuk akun yang dibuat. Jika kosong, default "123456".
 *                 example: "123456"
 *               role:
 *                 type: string
 *                 enum: [student, admin]
 *                 description: Role target di `profiles`. Default `student`. Jika `admin`, field `profiles.role` akan diupdate ke `admin` untuk user yang baru dibuat.
 *                 example: "student"
 *     responses:
 *       200:
 *         description: Ringkasan hasil pembuatan akun.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BulkCreateSummary'
 *             examples:
 *               ok:
 *                 value: { created: 2, skipped: 1, failed: 0, errors: [] }
 *       400:
 *         description: Payload tidak valid (misal `nims` kosong / JSON invalid).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               badRequest:
 *                 value: { error: "nims[] required" }
 *       401:
 *         description: Unauthorized (belum login).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               unauthorized:
 *                 value: { error: "Unauthorized" }
 *       403:
 *         description: Forbidden (bukan admin).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               forbidden:
 *                 value: { error: "Forbidden" }
 *       500:
 *         description: Kesalahan server/DB saat query/insert.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               serverError:
 *                 value: { error: "Database connection error" }
 *
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: >
 *         Token akses Supabase (JWT). Server akan memverifikasi session
 *         lalu memastikan `profiles.role = "admin"`.
 *   schemas:
 *     BulkCreateSummary:
 *       type: object
 *       properties:
 *         created: { type: integer, example: 2 }
 *         skipped:
 *           type: integer
 *           description: Jumlah NIM dilewati karena user sudah terdaftar.
 *           example: 1
 *         failed: { type: integer, example: 0 }
 *         errors:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               nim: { type: string, example: "1301320002" }
 *               error: { type: string, example: "NIM not found in students" }
 *       required: [created, skipped, failed, errors]
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error: { type: string }
 *       required: [error]
 */

export const dynamic = 'force-dynamic';

import { type NextRequest } from 'next/server';
import { jsonNoStore } from '@/utils/api';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

type Payload = {
  nims: string[];
  password?: string;
  role?: 'student' | 'admin';
};

export async function POST(req: NextRequest) {
  // --- Auth (admin only)
  const sb = await createSupabaseServerClient();
  const { data: { user }, error: userErr } = await sb.auth.getUser();
  if (userErr) return jsonNoStore({ error: userErr.message }, 500);
  if (!user)   return jsonNoStore({ error: 'Unauthorized' }, 401);

  const { data: myProfile, error: profErr } = await sb
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profErr)                   return jsonNoStore({ error: profErr.message }, 500);
  if (myProfile?.role !== 'admin') return jsonNoStore({ error: 'Forbidden' }, 403);

  // --- Parse body
  let body: Payload;
  try {
    body = await req.json();
  } catch {
    return jsonNoStore({ error: 'Invalid JSON' }, 400);
  }

  const nims = Array.isArray(body.nims)
    ? body.nims.map((s) => String(s).trim()).filter(Boolean)
    : [];
  if (!nims.length) return jsonNoStore({ error: 'nims[] required' }, 400);

  const password =
    body.password && String(body.password).length >= 6
      ? String(body.password)
      : '123456';

  const targetRole: 'student' | 'admin' =
    body.role === 'admin' ? 'admin' : 'student';

  const url    = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !svcKey) return jsonNoStore({ error: 'Missing SUPABASE envs' }, 500);

  const admin = createServiceClient(url, svcKey);
  const domain = process.env.NEXT_PUBLIC_STUDENT_EMAIL_DOMAIN || 'campus.ac.id';

  let created = 0, skipped = 0, failed = 0;
  const errors: Array<{ nim: string; error: string }> = [];

  // Ambil nama mahasiswa berdasar NIM sekali jalan
  const { data: students, error: stErr } = await admin
    .from('students')
    .select('nim, nama')
    .in('nim', nims);

  if (stErr) return jsonNoStore({ error: stErr.message }, 500);

  const nameByNim = new Map<string, string>(
    (students ?? []).map((s) => [String(s.nim), s.nama || ''])
  );

  // Proses per NIM
  for (const nim of nims) {
    if (!nameByNim.has(nim)) {
      failed++;
      errors.push({ nim, error: 'NIM not found in students' });
      continue;
    }

    const email = `${nim}@${domain}`;
    const fullName = nameByNim.get(nim) ?? '';

    const { data: createdUser, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nim, full_name: fullName },
      app_metadata: { provider: 'email', providers: ['email'] },
    });

    if (error) {
      const msg = error.message || '';
      if (/already registered|exists/i.test(msg)) {
        skipped++;
      } else {
        failed++;
        errors.push({ nim, error: msg });
        continue;
      }
    } else {
      created++;
    }

    // Upgrade role jika diminta admin
    if (targetRole === 'admin' && createdUser?.user?.id) {
      const { error: upErr } = await admin
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', createdUser.user.id);

      if (upErr) {
        // Tidak menggagalkan proses utama, tapi catat errornya
        errors.push({ nim, error: `profile update failed: ${upErr.message}` });
      }
    }
  }

  return jsonNoStore({ created, skipped, failed, errors }, 200);
}
