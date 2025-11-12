import { http } from '@/lib/http';
import { joinApi } from '@/lib/url';

import type { OverviewData } from '@/models/types/students/students';
import type { PrereqMap, AIRawResult } from '@/models/types/students/risk';

// ====== Types ======
export type ChartData = {
  line: { categories: number[]; series: Array<{ name: string; data: (number | null)[] }> };
  pie: { labels: string[]; series: number[] };
};

export type StatsData = {
  ips: number | null;
  ipk: number | null;
  total_sks: number;
  sks_selesai: number;
  sks_tersisa: number;
};

export type TranscriptItem = {
  semester_no: number;
  kode: string;
  nama: string;
  sks: number;
  nilai: string | null;
  status: string;
};

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

export type LatestRiskResponse =
  | {
      feat: Features | null;
      ai: AIRawResult | null;
      meta?: RiskMeta;
    }
  | null;

export type AiRecommendationItem = {
  rank: number;
  code: string;
  name: string;
  sks: number;
  semester_plan: number;
  reason: string;
  is_tertinggal: boolean;
  priority_score: number;
  prerequisites?: Array<{ code: string; name: string }>;
};

// ====== API calls ======

// 1) Chart (GET)
export async function getStudentChart(studentId: string, signal?: AbortSignal): Promise<ChartData> {
  const res = await http.get<ChartData>(joinApi(`/students/${studentId}/statistic/chart`), { signal });
  return res.data;
}

// 2) Statistic (GET mirror — RECOMMENDED)
export async function getStudentStats(studentId: string, semester: string, signal?: AbortSignal) {
  const res = await http.get<StatsData>(joinApi(`/students/${studentId}/statistic`), {
    params: { semester },
    signal,
  });
  return res.data;
}

// (optional) Statistic via POST (fallback/legacy)
export async function postStudentStats(studentId: string, semester: string, signal?: AbortSignal) {
  const res = await http.post<StatsData>(joinApi(`/students/${studentId}/statistic`), { semester }, { signal });
  return res.data;
}

// 3) Transcript (GET mirror — RECOMMENDED)
export async function getStudentTranscript(
  studentId: string,
  opts: { semester_no?: number; search?: string; signal?: AbortSignal } = {}
) {
  const { semester_no, search, signal } = opts;
  const res = await http.get<TranscriptItem[]>(joinApi(`/students/${studentId}/transcript`), {
    params: {
      ...(semester_no ? { semester_no } : {}),
      ...(search ? { search } : {}),
    },
    signal,
  });
  return res.data;
}

// (optional) Transcript via POST (fallback/legacy)
export async function postStudentTranscript(
  studentId: string,
  body?: { semester_no?: number; search?: string },
  signal?: AbortSignal
) {
  const res = await http.post<TranscriptItem[]>(joinApi(`/students/${studentId}/transcript`), body ?? {}, { signal });
  return res.data;
}

// 4) Overview (GET)
export async function getOverview(id: string, signal?: AbortSignal) {
  const res = await http.get<OverviewData>(joinApi(`/students/${id}/overview`), { signal });
  return res.data;
}

// 5) Prerequisite map (GET)
export async function getPrereqMap(id: string, signal?: AbortSignal) {
  const res = await http.get<PrereqMap>(joinApi(`/students/${id}/prereq-map`), { signal });
  return res.data;
}

// 6) Analyze risk (POST)
export async function analyzeRisk(
  id: string,
  opts: { debug?: boolean; signal?: AbortSignal } = {}
) {
  const { debug, signal } = opts;
  const url = joinApi(`/students/${id}/analyze`) + (debug ? '?debug=1' : '');
  const res = await http.post<AnalyzeResponse>(
    url,
    {},
    { signal, headers: { Accept: 'application/json', ...(debug ? { 'x-debug': '1' } : {}) } }
  );
  const json: any = res.data;
  return {
    feat: json?.feat ?? ({} as Features),
    ai: json?.ai ?? ({ prediction: '' } as AIRawResult),
    meta: (json?.meta ?? null) as RiskMeta,
  };
}

// 7) Latest risk (GET)
export async function getLatestRisk(studentId: string, signal?: AbortSignal): Promise<LatestRiskResponse> {
  const res = await http.get(joinApi(`/students/${studentId}/risk/latest`), { signal });
  const json: any = res.data;
  if (json?.found === false) return { feat: null, ai: null, meta: null };
  const { feat = null, ai = null, meta = null } = json || {};
  return { feat, ai, meta } as LatestRiskResponse;
}

// 8) Student detail (GET /students/[id])
export async function getStudentDetail(id: string, signal?: AbortSignal) {
  const res = await http.get<{ id: string; nama: string; nim: string; prodi: string; angkatan: number }>(
    joinApi(`/students/${id}`),
    { signal }
  );
  return res.data;
}

// 9) Students list (GET — admin only, dengan pagination & sorting)
export type StudentsListParams = {
  search?: string;
  prodi?: string;
  angkatan?: number; // <-- DITAMBAHKAN
  page?: number;
  pageSize?: number;
  sortBy?: 'nim' | 'nama' | 'prodi' | 'angkatan'; // <-- DITAMBAHKAN
  sortDir?: 'asc' | 'desc';
};

export async function listStudents(params: StudentsListParams = {}, signal?: AbortSignal) {
  const res = await http.get<{
    items: Array<{ id: string; nim: string; nama: string; prodi: string; angkatan: number }>; // <-- DITAMBAHKAN
    page: number;
    pageSize: number;
    total: number;
    sortBy: string;
    sortDir: 'asc' | 'desc';
    filters: { prodi: string | null; search: string | null; angkatan: number | null }; // <-- DITAMBAHKAN
  }>(joinApi('/students'), {
    params: {
      ...(params.search ? { search: params.search } : {}),
      ...(params.prodi ? { prodi: params.prodi } : {}),
      ...(params.angkatan ? { angkatan: params.angkatan } : {}), // <-- DITAMBAHKAN
      ...(params.page ? { page: params.page } : {}),
      ...(params.pageSize ? { pageSize: params.pageSize } : {}),
      ...(params.sortBy ? { sortBy: params.sortBy } : {}),
      ...(params.sortDir ? { sortDir: params.sortDir } : {}),
    },
    signal,
  });
  return res.data;
}

export async function getRecommendations(
  id: string,
  opts: { signal?: AbortSignal } = {}
) {
  const res = await http.post<AiRecommendationItem[]>(joinApi(`/students/${id}/recommend`), {}, { signal: opts.signal });
  return res.data;
}
