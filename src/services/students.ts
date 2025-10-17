import { OverviewData } from "@/models/types/students/students";
import { PrereqMap, AIRawResult } from "@/models/types/students/risk";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "";

export type Features = {
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
};

export type RiskMeta = { semester_id: string | null; created_at: string } | null;

export type AnalyzeResponse = {
  feat: Features;
  ai: AIRawResult;
  meta?: RiskMeta;
};

export type LatestRiskResponse = {
  feat: Features | null;
  ai: AIRawResult | null;
  meta?: RiskMeta;
};

/**
 * Mengambil data overview mahasiswa (tren IPK/IPS, distribusi nilai)
 * @param id Student UUID
 */
export async function getOverview(id: string): Promise<OverviewData> {
  const res = await fetch(`${BASE_URL}/api/students/${id}/overview`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(`Failed to fetch overview: ${errorBody.message}`);
  }
  return res.json();
}

/**
 * Mengambil peta prasyarat untuk mahasiswa
 * @param id Student UUID
 */
export async function getPrereqMap(id: string): Promise<PrereqMap> {
  const res = await fetch(`${BASE_URL}/api/students/${id}/prereq-map`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(`Failed to fetch prerequisite map: ${errorBody.message}`);
  }
  return res.json();
}

/**
 * Menjalankan analisis risiko AI.
 */
export async function analyzeRisk(
  id: string,
  opts?: { debug?: boolean }
): Promise<AnalyzeResponse> {
  const url = new URL(`${BASE_URL}/api/students/${id}/analyze`);
  if (opts?.debug) url.searchParams.set("debug", "1");

  const res = await fetch(url.toString(), {
    method: "POST",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(opts?.debug ? { "x-debug": "1" } : {}),
    },
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body?.message || body?.error || message;
    } catch {}
    throw new Error(`AI analysis failed: ${message}`);
  }
  
  const json = await res.json();
  const resp: AnalyzeResponse = {
    feat: json?.feat ?? {},
    ai: json?.ai ?? { prediction: "" },
    meta: (json?.meta ?? null) as RiskMeta,
  };
  return resp;
}


// services/students.ts
export async function getLatestRisk(studentId: string): Promise<LatestRiskResponse | null> {
  const res = await fetch(`/api/students/${studentId}/risk/latest`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return null;

  const json = await res.json();
  if (json?.found === false) return { feat: null, ai: null, meta: null };

  const { feat = null, ai = null, meta = null } = json as LatestRiskResponse;
  return { feat, ai, meta };
}

