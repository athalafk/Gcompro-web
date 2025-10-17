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

export type AnalyzeResponse = {
  feat: Features;
  ai: AIRawResult;
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
    headers: opts?.debug ? { "x-debug": "1" } : undefined,
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body?.message || body?.error || message;
    } catch {
    }
    throw new Error(`AI analysis failed: ${message}`);
  }

  const json = (await res.json()) as AnalyzeResponse;
  if (!json?.ai?.prediction) {
    throw new Error("AI analysis succeeded but response format is invalid (missing ai.prediction).");
  }
  return json;
}
