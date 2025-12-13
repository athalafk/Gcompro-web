/**
 * @swagger
 * /admin/set-semester:
 *   post:
 *     summary: Set semester aktif (admin only)
 *     description: |
 *       Mengaktifkan 1 semester dan menonaktifkan semester lain (menggunakan function DB `set_active_semester(uuid)`).
 *       - Endpoint **memerlukan sesi Supabase**
 *       - Hanya **admin** yang boleh akses
 *       - Tidak memakai cache (no-store)
 *     tags: [Admin]
 *     operationId: setActiveSemester
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SetSemesterRequest'
 *           examples:
 *             sample:
 *               value:
 *                 semester_id: "8d8b3a3e-1a9a-4dcd-9b9f-5b0f7d7a1b2c"
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SetSemesterResponse'
 *             examples:
 *               ok:
 *                 value:
 *                   success: true
 *                   semester_id: "8d8b3a3e-1a9a-4dcd-9b9f-5b0f7d7a1b2c"
 *       400:
 *         description: Payload tidak valid
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               invalid_payload:
 *                 value: { error: "Invalid semester_id" }
 *       401:
 *         description: Unauthorized (tidak ada sesi Supabase).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               no_session:
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
 *         description: Kesalahan server / DB (misalnya function melempar exception).
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *             examples:
 *               db_error:
 *                 value: { error: "Semester dengan id ... tidak ditemukan" }
 *
 * components:
 *   schemas:
 *     SetSemesterRequest:
 *       type: object
 *       additionalProperties: false
 *       required: [semester_id]
 *       properties:
 *         semester_id:
 *           type: string
 *           format: uuid
 *
 *     SetSemesterResponse:
 *       type: object
 *       additionalProperties: false
 *       required: [success, semester_id]
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         semester_id:
 *           type: string
 *           format: uuid
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
import { jsonNoStore, isUuidLike } from "@/utils/api";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/lib/supabase";

type SetSemesterRequest = { semester_id: string };

export async function POST(req: NextRequest) {
  // 1) auth: wajib login
  const supabaseUser = await createSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabaseUser.auth.getUser();

  if (userErr) return jsonNoStore({ error: userErr.message }, 500);
  if (!user) return jsonNoStore({ error: "Unauthorized" }, 401);

  // 2) cek role admin
  const { data: profile, error: profErr } = await supabaseUser
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profErr) return jsonNoStore({ error: profErr.message }, 500);
  if (profile?.role !== "admin") return jsonNoStore({ error: "Forbidden" }, 403);

  // 3) parse body
  let body: SetSemesterRequest | null = null;
  try {
    body = (await req.json()) as SetSemesterRequest;
  } catch {
    body = null;
  }

  const semesterId = body?.semester_id;
  if (!semesterId || !isUuidLike(semesterId)) {
    return jsonNoStore({ error: "Invalid semester_id" }, 400);
  }

  // 4) execute RPC dengan service-role (aman untuk bypass RLS)
  const adminDb = createAdminClient();
  const { error: rpcErr } = await adminDb.rpc("set_active_semester", {
    p_semester_id: semesterId,
  });

  if (rpcErr) {
    // biasanya message berisi exception dari function (mis. "Semester dengan id ... tidak ditemukan")
    return jsonNoStore({ error: rpcErr.message }, 500);
  }

  return jsonNoStore({ success: true, semester_id: semesterId }, 200);
}
