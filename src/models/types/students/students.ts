import { RiskLevel } from "./risk";

/** Tipe data dasar Mahasiswa */
export type Student = {
  id: string;
  nim: string | null;
  nama: string;
};

/** Tipe data untuk baris tren IP/IPK (digunakan di GpaTrend Component) */
export type GpaTrendRow = { 
  semester_no: number; 
  ips?: number | null; 
  ipk_cum?: number | null 
};

/** Tipe untuk Overview Mahasiswa (dari /api/students/[id]/overview) */
export type OverviewData = {
  trend: { semester_no: number; ips: number; }[];
  cum: { semester_no: number; ipk_cum: number; }[];
  dist: { grade_index: string; count: number; }[];
  risk_level: RiskLevel;
};

/** Tipe untuk hasil penggabungan data overview (tren dan kumulatif) */
export type MergedGpaTrendData = { 
  semester_no: number; 
  ips: number; 
  ipk_cum: number | null; 
}[];