'use client';

import { useEffect, useState } from 'react';
import LoadingSpinner from '@/components/loading/loading-spinner';
import RiskProgressBar from '@/components/features/risk/RiskProgressBar';
import RecommendationCard from '@/components/features/risk/RecommendationCard';
import { analyzeRisk, getLatestRisk, getRecommendations } from '@/services/students';
import type { AIRawResult } from '@/models/types/students/risk';

type RiskLevel = 'Aman' | 'Resiko Rendah' | 'Resiko Sedang' | 'Resiko Tinggi';

type AiData = {
  prediction: RiskLevel;
  probabilities: Record<string, number>;
  explanation: {
    opening_line: string;
    factors: string[];
    recommendation?: string;
  };
};

const placeholderRecommendations = [
  {
    id: '1',
    title: 'Rangkaian Listrik II',
    priority: 'Tinggi' as const,
    description: 'Direkomendasikan untuk diambil pada semester berikutnya.',
    prerequisites: ['Fisika 1', 'Fisika 2'],
  },
  {
    id: '2',
    title: 'Struktur Data & Algoritma',
    priority: 'Tinggi' as const,
    description: 'Mata kuliah fundamental untuk jalur informatika.',
    prerequisites: ['Dasar Pemrograman', 'Matematika Diskrit'],
  },
  {
    id: '3',
    title: 'Kalkulus Lanjut',
    priority: 'Sedang' as const,
    description: 'Melanjutkan pemahaman dari Kalkulus dasar.',
    prerequisites: ['Kalkulus I', 'Kalkulus II'],
  },
];

function getRiskValue(level: RiskLevel): number {
  switch (level) {
    case 'Aman': return 10;
    case 'Resiko Rendah': return 30;
    case 'Resiko Sedang': return 60;
    case 'Resiko Tinggi': return 90;
    default: return 50;
  }
}

// Normalisasi bentuk AI response dari backend ke bentuk yang dibutuhkan UI
function toAiData(ai: AIRawResult | null | undefined): AiData | null {
  if (!ai) return null;

  const predictionRaw =
    (ai as any).prediction ??
    (ai as any).label ??
    (ai as any).class ??
    "Resiko Sedang";

  const normalized: RiskLevel =
    /tinggi/i.test(predictionRaw) ? "Resiko Tinggi" :
    /sedang/i.test(predictionRaw) ? "Resiko Sedang" :
    /rendah/i.test(predictionRaw) ? "Resiko Rendah" :
    /aman/i.test(predictionRaw) ? "Aman" :
    "Resiko Sedang";

  const probs =
    (ai as any).probabilities ??
    (ai as any).probs ??
    (ai as any).scores ??
    {};

  const opening =
    (ai as any).explanation?.opening_line ??
    (ai as any).explanation?.opening ??
    (ai as any).explanation ??
    "";

  const factors =
    (ai as any).explanation?.factors ??
    (ai as any).factors ??
    [];

  const recommendation =
    (ai as any).explanation?.recommendation ??
    (ai as any).recommendation ??
    "";

  return {
    prediction: normalized,
    probabilities: probs,
    explanation: {
      opening_line: String(opening || ""),
      factors: Array.isArray(factors) ? factors : [],
      recommendation: recommendation ? String(recommendation) : undefined, // 👈 NEW
    },
  };
}


export default function RiskAnalysisView({ studentId }: { studentId: string }) {
  const [riskData, setRiskData] = useState<AiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<any[] | null>(null);

  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      setError('Student ID tidak ditemukan.');
      return;
    }

    const controller = new AbortController();

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const [resp, recs] = await Promise.all([
          analyzeRisk(studentId, { signal:controller.signal} ),
          getRecommendations(studentId, { signal: controller.signal }).catch(() => null),
        ]);

        if (controller.signal.aborted) return;

        const ai = toAiData(resp?.ai);
        if (!ai) throw new Error('Data AI kosong atau tidak valid.');

        setRiskData(ai);
        setRecommendations(recs ?? []);
      } catch (err: any) {
        if (err?.name === 'CanceledError' || err?.message === 'canceled') return;
        if (controller.signal.aborted) return;

        setError(err?.message ?? 'Gagal memuat data risiko');
        setRiskData(null);
        setRecommendations(null);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void fetchData();
    return () => controller.abort();
  }, [studentId]);


  if (loading) return <LoadingSpinner message="Menganalisis Risiko..." />;
  if (error) return <main className="p-6 text-red-600">Error: {error}</main>;
  if (!riskData) return <main className="p-6">Data analisis tidak ditemukan.</main>;

  const { prediction, explanation } = riskData;
  const riskValue = getRiskValue(prediction);

  return (
    <main className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">Analisis Risiko</h1>
        <div className="text-right">
          <h2 className="text-xl font-bold text-blue-800">SIPANDAI</h2>
          <p className="text-xs text-gray-500">
            Sistem Informasi Pemantauan Data Akademik Integratif
          </p>
        </div>
      </div>

      {/* Kartu Klasifikasi Risiko */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-5">
          <div className="md:col-span-3 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Klasifikasi Risiko
            </h3>

            <p className="text-sm text-gray-600">
              {explanation?.opening_line ||
                `Profil Anda menunjukkan '${prediction}'. Sistem mencatat beberapa faktor performa akademik Anda.`}
            </p>

            {explanation?.factors?.length > 0 && (
              <ul className="list-none list-inside text-sm text-gray-600 mt-3 space-y-1">
                {explanation.factors.map((factor, idx) => (
                  <li key={idx}>{factor}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="md:col-span-2 flex items-center justify-center p-6 border-t md:border-t-0 md:border-l border-gray-100">
            <RiskProgressBar level={prediction} value={riskValue} />
          </div>
        </div>

        {/* 🔥 Rekomendasi Tindak Lanjut dari AI – di bawah explanation & progress bar */}
        {explanation?.recommendation && (
          <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-1">
              Rekomendasi Tindak Lanjut
            </h4>
            <p className="text-sm text-gray-600 whitespace-pre-line">
              {explanation.recommendation}
            </p>
          </div>
        )}
        {/* <p className="text-xs text-gray-400 mt-2 ml-4 mb-2">
          *Kategori ini dihitung dari kombinasi faktor IPK, IPS, serta jumlah SKS
          yang telah diselesaikan dan sedang ditempuh.
        </p> */}
      </div>

      {/* Rekomendasi (placeholder) */}
      <h3 className="text-lg font-semibold text-gray-800 pt-2">
        Rekomendasi Mata Kuliah
      </h3>
      <div className="space-y-4">
        {(recommendations?.length ? recommendations : placeholderRecommendations).map((rec, i) => (
            <RecommendationCard
              key={rec.code ?? rec.id ?? i}
              title={rec.name ?? rec.title}
              priority={
                rec.priority ??
                (rec.priority_score ?? 0) >= 0.66
                  ? 'Tinggi'
                  : (rec.priority_score ?? 0) >= 0.33
                  ? 'Sedang'
                  : 'Rendah'
              }
              description={rec.reason ?? rec.description}
              prerequisites={rec.prerequisites?.map((p: any) => p.name) ?? rec.prerequisites ?? []}
            />
          ))}
      </div>
      <p className="text-xs text-gray-500">
        *Rekomendasi ini dihasilkan secara otomatis berdasarkan capaian SKS,
        hasil evaluasi nilai, serta pemenuhan prasyarat mata kuliah.
      </p>
    </main>
  );
}
