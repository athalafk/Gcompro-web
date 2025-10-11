import { createAdminClient } from "./supabase";
import { Features } from "@/models/types/students/risk";

export async function extractFeatures(studentId: string): Promise<Features> {
  const supabase = createAdminClient();

  // IPS per semester
  const { data: trend } = await supabase
    .from("v_student_semester_scores")
    .select("semester_no, ips, sks_diambil, sks_lulus")
    .eq("student_id", studentId)
    .order("semester_no");

  const last = trend?.at(-1);
  const prev = trend && trend.length > 1 ? trend.at(-2) : null;

  // IPK kumulatif
  const { data: cum } = await supabase
    .from("v_student_cumulative")
    .select("semester_no, ipk_cum")
    .eq("student_id", studentId)
    .order("semester_no");
  const ipk_last = cum?.at(-1)?.ipk_cum ?? 0;

  // Enrollments detail
  const { data: enr } = await supabase
    .from("enrollments")
    .select("course_id, grade_index, sks")
    .eq("student_id", studentId);

  const total = enr?.length ?? 0;
  const dCnt = enr?.filter(e => e.grade_index === "D").length ?? 0;
  const eCnt = enr?.filter(e => e.grade_index === "E").length ?? 0;
  const gagalCnt = dCnt + eCnt;
  const sksTunda = enr?.filter(e => ["D","E"].includes(e.grade_index)).reduce((a,b)=>a+(b.sks||0),0) ?? 0;

  // repeat count (ambil course yg diambil >1x)
  const map = new Map<string, number>();
  enr?.forEach(e => map.set(e.course_id, (map.get(e.course_id)||0)+1));
  const repeat = Array.from(map.values()).filter(v => v>1).length;

  return {
    gpa_cum: Number(ipk_last || 0),
    ips_last: Number(last?.ips || 0),
    delta_ips: Number((last?.ips ?? 0) - (prev?.ips ?? last?.ips ?? 0)),
    mk_gagal_total: gagalCnt,
    sks_tunda: sksTunda,
    pct_d: total ? (dCnt/total*100) : 0,
    pct_e: total ? (eCnt/total*100) : 0,
    repeat_count: repeat,
  };
}

export function toVector(feat: Features): number[] {
  return [
    feat.gpa_cum, feat.ips_last, feat.delta_ips, feat.mk_gagal_total,
    feat.sks_tunda, feat.pct_d, feat.pct_e, feat.repeat_count
  ];
}
