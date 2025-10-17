import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const { id: studentId } = ctx.params;
  const supabase = createAdminClient();

  const { data: adv, error: advErr } = await supabase
    .from("advice")
    .select("semester_id, risk_level, reasons, created_at")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (advErr) return NextResponse.json({ error: advErr.message }, { status: 500 });
  if (!adv) return NextResponse.json({ found: false });

  let ml: any = null;
  if (adv.semester_id) {
    const { data: m } = await supabase
      .from("ml_features")
      .select("risk_level, cluster_label, delta_ips, ips_last, gpa_cum, created_at")
      .eq("student_id", studentId)
      .eq("semester_id", adv.semester_id)
      .maybeSingle();
    ml = m;
  } else {
    const { data: m } = await supabase
      .from("ml_features")
      .select("risk_level, cluster_label, delta_ips, ips_last, gpa_cum, created_at")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    ml = m;
  }

  const probabilities = Array.isArray(adv.reasons?.probabilities)
    ? Object.fromEntries(adv.reasons.probabilities as [string, number][])
    : undefined;

  return NextResponse.json({
    found: true,
    ai: { prediction: adv.risk_level, probabilities },
    ml,
    meta: { semester_id: adv.semester_id, created_at: adv.created_at },
  });
}
