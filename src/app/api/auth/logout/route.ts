import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST() {
  const supabase = createClient();
  
  await (await supabase).auth.signOut();
  
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL
  
  const redirectUrl = new URL("/login", baseUrl);

  return NextResponse.redirect(redirectUrl, { status: 302 });
}