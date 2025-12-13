import { createAdminClient } from './supabase';

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
  Profil_Tren: string;
  Perubahan_Kinerja_Terakhir: number;
  IPK_Ternormalisasi_SKS: number;
}

export type FeatureBundle = {
  feat: Features;
  meta: {
    semesterIdForSave: string | null;
    deltaIps: number;
  };
};

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

type SemRow = { semester_no: number | null; ips: number | null };
type FailedRow = { sks: number | null };
type CumRow = {
  ipk_cum: number | null;
  sks_total: number | null;
  last_semester_id: string | null;
};

/**
 * Ekstraksi fitur (DB-driven):
 * - cumulative_stats.ipk_cum, cumulative_stats.sks_total, cumulative_stats.last_semester_id
 * - semester_stats (semester_no, ips)
 * - enrollments (FINAL + Tidak Lulus) -> count & sum(sks)
 *
 * Return:
 * - feat: fitur untuk AI payload
 * - meta: data tambahan untuk route (semesterIdForSave + deltaIps) biar route nggak fetch lagi
 */
export async function extractFeatures(studentId: string): Promise<FeatureBundle> {
  const supabase = createAdminClient();

  // 1) cumulative_stats: IPK + SKS + last_semester_id
  const { data: cumStats, error: cumErr } = await supabase
    .from('cumulative_stats')
    .select('ipk_cum, sks_total, last_semester_id')
    .eq('student_id', studentId)
    .maybeSingle<CumRow>();

  if (cumErr) console.warn('cumulative_stats error:', cumErr);

  const ipkTerakhir = Number(cumStats?.ipk_cum ?? 0);
  const totalSKS = Number(cumStats?.sks_total ?? 0);
  const semesterIdForSave: string | null = cumStats?.last_semester_id ?? null;

  // 2) semester_stats: IPS series
  const { data: semStats, error: semStatsErr } = await supabase
    .from('semester_stats')
    .select('semester_no, ips')
    .eq('student_id', studentId)
    .not('semester_no', 'is', null)
    .order('semester_no', { ascending: true })
    .returns<SemRow[]>();

  if (semStatsErr) console.warn('semester_stats error:', semStatsErr);

  const ipsVals = (semStats ?? [])
    .map((r) => Number(r.ips ?? 0))
    .filter(Number.isFinite);

  const ipsTerakhir = ipsVals.length ? ipsVals[ipsVals.length - 1] : 0;
  const ipsTertinggi = ipsVals.length ? Math.max(...ipsVals) : 0;
  const ipsTerendah = ipsVals.length ? Math.min(...ipsVals) : 0;

  // delta IPS untuk ml_features
  const deltaIps = ipsVals.length >= 2 ? ipsVals.at(-1)! - ipsVals.at(-2)! : 0;

  // 3) MK gagal (FINAL + Tidak Lulus)
  const { data: failedCourses, count: failedCount, error: failErr } = await supabase
    .from('enrollments')
    .select('sks, kelulusan', { count: 'exact' })
    .eq('student_id', studentId)
    .eq('status', 'FINAL')
    .eq('kelulusan', 'Tidak Lulus')
    .returns<FailedRow[]>();

  if (failErr) console.warn('enrollments failed error:', failErr);

  const jumlahMkGagal = failedCount ?? 0;
  const totalSksGagal = (failedCourses ?? []).reduce((s, r) => s + Number(r.sks ?? 0), 0);

  // 4) slope IPS (trend)
  const semesterPoints = (semStats ?? [])
    .filter((r) => Number.isFinite(r.semester_no) && Number.isFinite(r.ips))
    .map((r) => ({ x: Number(r.semester_no), y: Number(r.ips) }));

  const trenIpsSlope = calculateSlope(semesterPoints);
  const profilTren = trenIpsSlope > 0.01 ? 'Menaik' : (trenIpsSlope < -0.01 ? 'Menurun' : 'Stabil');

  // 5) derived features
  const perubahanKinerjaTerakhir = ipsTerakhir - ipkTerakhir;
  const TARGET_SKS = 144;
  const ipkTernormalisasiSKS = totalSKS ? (totalSKS / TARGET_SKS) * ipkTerakhir : 0;

  const feat: Features = {
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

  return { feat, meta: { semesterIdForSave, deltaIps } };
}
