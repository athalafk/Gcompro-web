import { createAdminClient } from "./supabase";

export interface Features {
  IPK_Terakhir: number;
  IPS_Terakhir: number;
  Total_SKS: number;
  IPS_Tertinggi: number;
  IPS_Terendah: number;
  Rentang_IPS: number;
  Jumlah_MK_Gagal: number;
  Total_SKS_Gagal: number;
  Tren_IPS_Slope: number;
  Profil_Tren: string; // "Menaik" | "Menurun" | "Stabil"
  Perubahan_Kinerja_Terakhir: number; // IPS_Terakhir - IPK_Terakhir
  IPK_Ternormalisasi_SKS: number;     // (Total_SKS/144) * IPK_Terakhir
}

/**
 * Regresi linier sederhana untuk slope (m) dari titik (x,y).
 * Formula: m = (n*Σxy - Σx*Σy) / (n*Σx^2 - (Σx)^2)
 */
function calculateSlope(points: { x: number; y: number }[]): number {
  if (!points || points.length < 2) return 0;

  const n = points.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumX2 += p.x * p.x;
  }

  const numerator = n * sumXY - sumX * sumY;
  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return 0;
  return numerator / denominator;
}

/**
 * Ekstraksi fitur dari Supabase sesuai logika notebook Python.
 * Sumber data:
 * - cumulative_stats (gpa_cum, sks_total)
 * - v_student_semester_scores (semester_no, ips)
 * - enrollments (grade_index in D/E) → count & sum(sks)
 */
export async function extractFeatures(studentId: string): Promise<Features> {
  const supabase = createAdminClient();

  const { data: cumStats, error: cumErr } = await supabase
    .from("cumulative_stats")
    .select("gpa_cum, sks_total")
    .eq("student_id", studentId)
    .maybeSingle();

  if (cumErr) {
    console.warn("cumulative_stats error:", cumErr);
  }

  const { data: vsss, error: vsssErr } = await supabase
    .from("v_student_semester_scores")
    .select("semester_no, ips")
    .eq("student_id", studentId)
    .order("semester_no", { ascending: true });

  if (vsssErr) {
    console.warn("v_student_semester_scores error:", vsssErr);
  }

  const ipsVals = (vsss ?? [])
    .map(r => Number(r.ips ?? 0))
    .filter(Number.isFinite);

  const ipkTerakhir = Number(cumStats?.gpa_cum ?? 0);
  const ipsTerakhir = ipsVals.length ? ipsVals[ipsVals.length - 1] : 0;
  const totalSKS = Number(cumStats?.sks_total ?? 0);

  const ipsTertinggi = ipsVals.length ? Math.max(...ipsVals) : 0;
  const ipsTerendah = ipsVals.length ? Math.min(...ipsVals) : 0;

  const { data: failedCourses, count: failedCount } = await supabase
    .from("enrollments")
    .select("sks", { count: "exact" })
    .eq("student_id", studentId)
    .in("grade_index", ["D", "E"]);

  const jumlahMkGagal = failedCount ?? 0;
  const totalSksGagal = (failedCourses ?? []).reduce((s, r) => s + Number(r.sks ?? 0), 0);

  const semesterPoints =
    (vsss ?? [])
      .filter(r => Number.isFinite(r.semester_no) && Number.isFinite(r.ips))
      .map(r => ({ x: Number(r.semester_no), y: Number(r.ips) }));

  const trenIpsSlope = calculateSlope(semesterPoints);

  const profilTren = trenIpsSlope > 0.01 ? "Menaik" : (trenIpsSlope < -0.01 ? "Menurun" : "Stabil");

  const perubahanKinerjaTerakhir = ipsTerakhir - ipkTerakhir;
  const TARGET_SKS = 144;
  const ipkTernormalisasiSKS = totalSKS ? (totalSKS / TARGET_SKS) * ipkTerakhir : 0;

  return {
    IPK_Terakhir: ipkTerakhir,
    IPS_Terakhir: ipsTerakhir,
    Total_SKS: totalSKS,
    IPS_Tertinggi: ipsTertinggi,
    IPS_Terendah: ipsTerendah,
    Rentang_IPS: ipsTertinggi - ipsTerendah,
    Jumlah_MK_Gagal: jumlahMkGagal,
    Total_SKS_Gagal: totalSksGagal,
    Tren_IPS_Slope: trenIpsSlope,
    Profil_Tren: profilTren,
    Perubahan_Kinerja_Terakhir: perubahanKinerjaTerakhir,
    IPK_Ternormalisasi_SKS: ipkTernormalisasiSKS,
  };
}
