/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Sign out the active Supabase session.
 *     description: |
 *       Mengakhiri sesi login Supabase yang aktif pada pengguna saat ini.
 *       Endpoint ini akan menghapus semua token otentikasi aktif (scope global),
 *       memastikan pengguna benar-benar keluar dari semua perangkat dan tab browser.
 *     tags: [Auth]
 *     operationId: logoutUser
 *     responses:
 *       200:
 *         description: Logout berhasil. Session pengguna telah dihapus dari Supabase.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LogoutSuccess'
 *             examples:
 *               ok:
 *                 value:
 *                   message: "Logout successful"
 *       500:
 *         description: Terjadi kesalahan saat logout (misalnya koneksi Supabase gagal).
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             examples:
 *               unexpected:
 *                 value: { error: "Unexpected error occurred." }
 *
 * components:
 *   schemas:
 *     LogoutSuccess:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         message:
 *           type: string
 *           example: "Logout successful"
 *       required: [message]
 *     ErrorResponse:
 *       type: object
 *       additionalProperties: false
 *       properties:
 *         error:
 *           type: string
 *       required: [error]
 */


export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from 'next/server';
import { withSupabaseRouteCarrier, jsonNoStore } from '@/utils/api';

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ message: 'Logout successful' }, { status: 200 });
  res.headers.set('Cache-Control', 'no-store');
  res.headers.set('Allow', 'POST');

  try {
    const { supabase } = withSupabaseRouteCarrier(req, res);

    await supabase.auth.signOut({ scope: 'global' });

    req.cookies.getAll().forEach((cookie) => {
      if (cookie.name.startsWith('sb-')) {
        res.cookies.set(cookie.name, '', {
          path: '/',
          maxAge: 0,
        });
      }
    });

    return res;
  } catch (e: any) {
    return jsonNoStore(
      { error: e?.message || 'Unexpected error occurred.' },
      500
    );
  }
}
