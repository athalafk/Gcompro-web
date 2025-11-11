/**
 * @swagger
 * /_debug-project:
 *   get:
 *     summary: Debug konfigurasi Supabase proyek (hanya untuk troubleshooting).
 *     description: >
 *       **Wajib login sebagai admin**. Mengembalikan info dasar URL/keys yang
 *       termuat di runtime (dengan masking) serta uji panggilan Admin API `listUsers`.
 *       **Jangan expose di production** tanpa pembatasan akses.
 *     tags: [Debug]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Informasi debug.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DebugProjectInfo'
 *             examples:
 *               ok:
 *                 value:
 *                   url: "https://xxxxxxx.supabase.co"
 *                   url_project_ref_hint: "xxxxxxx"
 *                   anon_key_mask: "eyJhbG...QQb9t4"
 *                   service_key_mask: "eyJhbG...UmKbk0"
 *                   anon_iss: "supabase"
 *                   service_iss: "supabase"
 *                   rest_listUsers_count: 5
 *                   rest_error: null
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
 *         description: Terjadi kesalahan saat memanggil Admin API.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               serverError:
 *                 value: { error: "fetch failed" }
 *
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *       description: >
 *         Token akses Supabase (JWT). Server sebaiknya memverifikasi session dan memastikan `profiles.role = "admin"`.
 *   schemas:
 *     DebugProjectInfo:
 *       type: object
 *       properties:
 *         url: { type: string, example: "https://xxxxxxx.supabase.co" }
 *         url_project_ref_hint: { type: string, nullable: true, example: "xxxxxxx" }
 *         anon_key_mask: { type: string, nullable: true, example: "eyJhbG...QQb9t4" }
 *         service_key_mask: { type: string, nullable: true, example: "eyJhbG...UmKbk0" }
 *         anon_iss: { type: string, nullable: true, example: "supabase" }
 *         service_iss: { type: string, nullable: true, example: "supabase" }
 *         rest_listUsers_count: { type: integer, nullable: true, example: 5 }
 *         rest_error: { type: object, nullable: true }
 *       required:
 *         - url
 *         - url_project_ref_hint
 *         - anon_key_mask
 *         - service_key_mask
 *         - anon_iss
 *         - service_iss
 *         - rest_listUsers_count
 *         - rest_error
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error: { type: string }
 *       required: [error]
 */

export const dynamic = 'force-dynamic';

import { createSupabaseServerClient } from '@/utils/supabase/server';
import { jsonNoStore, fetchWithTimeout } from '@/utils/api';

function mask(s?: string) {
  if (!s) return null;
  if (s.length <= 12) return s;
  return `${s.slice(0, 6)}...${s.slice(-6)}`;
}

function b64urlDecodeJson(part?: string) {
  if (!part) return null;
  const pad = (x: string) => x + '='.repeat((4 - (x.length % 4)) % 4);
  try {
    const json = Buffer
      .from(pad(part).replace(/-/g, '+').replace(/_/g, '/'), 'base64')
      .toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function GET() {
  const sb = await createSupabaseServerClient();

  const { data: { user }, error: userErr } = await sb.auth.getUser();
  if (userErr) return jsonNoStore({ error: userErr.message }, 500);
  if (!user)   return jsonNoStore({ error: 'Unauthorized' }, 401);

  const { data: me, error: profErr } = await sb
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profErr)     return jsonNoStore({ error: profErr.message }, 500);
  if (me?.role !== 'admin') return jsonNoStore({ error: 'Forbidden' }, 403);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const svc  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  // 1) Info dasar runtime
  const urlRef =
    url.match(/https?:\/\/([^.]+)\.supabase\.co/i)?.[1] ?? null;

  const anonIss = anon ? b64urlDecodeJson(anon.split('.')[1])?.iss ?? null : null;
  const svcIss  =  svc ? b64urlDecodeJson(svc.split('.')[1])?.iss  ?? null : null;

  // 2) Tes endpoint Admin Auth (bypass SDK)
  let restCount: number | null = null;
  let restErr: unknown = null;

  try {
    const r = await fetchWithTimeout(`${url}/auth/v1/admin/users?page=1&per_page=5`, {
      headers: {
        apikey: svc,
        Authorization: `Bearer ${svc}`,
        accept: 'application/json',
      },
      cache: 'no-store',
      timeoutMs: 10_000,
    });

    const j = await r.json().catch(() => ({}));
    if (r.ok && Array.isArray((j as any).users)) {
      restCount = (j as any).users.length;
    } else {
      restErr = j || { status: r.status, statusText: r.statusText };
    }
  } catch (e: any) {
    restErr = { message: e?.message || 'fetch failed' };
  }

  return jsonNoStore({
    url,
    url_project_ref_hint: urlRef,
    anon_key_mask: mask(anon),
    service_key_mask: mask(svc),
    anon_iss: anonIss,
    service_iss: svcIss,
    rest_listUsers_count: restCount,
    rest_error: restErr,
  }, 200);
}
