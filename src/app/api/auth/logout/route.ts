/**
 * @swagger
 * /api/auth/logout:
 * post:
 * summary: Melakukan logout pengguna dan menghapus sesi.
 * tags: [Auth]
 * responses:
 * 302:
 * description: Redirects to the /login page after successful sign out.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST() {
  const supabase = createClient();
  
  await (await supabase).auth.signOut();
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  
  const redirectUrl = new URL("/login", baseUrl);

  return NextResponse.redirect(redirectUrl, { status: 302 });
}