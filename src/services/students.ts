import { 
  OverviewData
} from "@/models/types/students/students";
import {
  PrereqMap, 
  AIResult 
} from "@/models/types/students/risk";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "";

/**
 * Mengambil data overview mahasiswa (tren IPK/IPS, distribusi nilai)
 * @param id Student UUID
 */
export async function getOverview(id: string): Promise<OverviewData> {
  const res = await fetch(`${BASE_URL}/api/students/${id}/overview`, { 
    cache: "no-store" 
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
    cache: "no-store" 
  });
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(`Failed to fetch prerequisite map: ${errorBody.message}`);
  }
  return res.json();
}

/**
 * Menjalankan analisis risiko AI
 * @param id Student UUID
 */
export async function analyzeRisk(id: string): Promise<AIResult> {
  const res = await fetch(`${BASE_URL}/api/students/${id}/analyze`, { 
    method: "POST" 
  });
  
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(`AI analysis failed: ${errorBody.message}`);
  }
  
  const json = await res.json();
  return json.ai as AIResult;
}