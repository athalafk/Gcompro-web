// src/views/students/risk-analysis.tsx
'use client';

import { useState, useEffect } from 'react';
import LoadingSpinner from '@/components/loading/loading-spinner';
import RiskProgressBar from '@/components/features/risk/RiskProgressBar';
import RecommendationCard from '@/components/features/risk/RecommendationCard';

type RiskLevel = 'Aman' | 'Resiko Rendah' | 'Resiko Sedang' | 'Resiko Tinggi';

type AiData = {
  prediction: RiskLevel;
  probabilities: {
    [key: string]: number;
  };
  explanation: {
    opening_line: string;
    factors: string[];
  };
};

type FeatData = { [key: string]: any };

type ApiRiskResponse = {
  feat: FeatData;
  ai: AiData;
  meta: {
    semester_id: string;
    created_at: string;
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
    case 'Aman':
      return 15; // Posisi di area Hijau
    case 'Resiko Rendah':
      return 40; // Posisi di area Kuning
    case 'Resiko Sedang':
      return 70; // Posisi di area Oranye
    case 'Resiko Tinggi':
      return 90; // Posisi di area Merah
    default:
      return 50; // Fallback
  }
}

export default function RiskAnalysisView({ studentId }: { studentId: string }) {
  const [riskData, setRiskData] = useState<AiData | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      setError("Student ID tidak ditemukan.");
      return;
    }

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/students/${studentId}/analyze`, {
          method: 'POST',
        });

        if (!res.ok) {
          throw new Error(`Gagal memuat data risiko (HTTP ${res.status})`);
        }
        
        const apiData: ApiRiskResponse = await res.json();

        setRiskData(apiData.ai);

      } catch (err: any) {
        setError(err.message);
        setRiskData(null);
      } finally {
        setLoading(false);
      }
    }

    void fetchData();
  }, [studentId]);

  if (loading) return <LoadingSpinner message="Menganalisis Risiko..." />;
  if (error) return <main className="p-6 text-red-600">Error: {error}</main>;
  if (!riskData) return <main className="p-6">Data analisis tidak ditemukan.</main>;

  const { prediction, explanation } = riskData;
  const riskValue = getRiskValue(prediction);

  return (
    <main className="p-6 space-y-6">
      {/* Header Halaman */}
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
          
          {/* Kolom Kiri: Deskripsi (DENGAN OPTIONAL CHAINING) */}
          <div className="md:col-span-3 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Klasifikasi Risiko
            </h3>
            
            <p className="text-sm text-gray-600">
              {explanation?.opening_line || 
               `Profil Anda menunjukkan '${prediction}'. Sistem mencatat beberapa faktor performa akademik Anda.`}
            </p>

            {explanation?.factors && (
              <ul className="list-disc list-inside text-sm text-gray-600 mt-3 space-y-1">
                {explanation.factors.map((factor, index) => (
                  <li key={index}>{factor}</li>
                ))}
              </ul>
            )}
            
            <p className="text-xs text-gray-400 mt-4">
              *Kategori ini dihitung dari kombinasi faktor IPK, IPS, serta jumlah SKS
              yang telah diselesaikan dan sedang ditempuh.
            </p>
          </div>
          
          {/* Kolom Kanan: Progress Bar*/}
          <div className="md:col-span-2 flex items-center justify-center p-6 border-t md:border-t-0 md:border-l border-gray-100">
            <RiskProgressBar
              level={prediction}
              value={riskValue}
            />
          </div>
        </div>
      </div>

      {/* --- Kartu Rekomendasi (Masih Placeholder) --- */}
      <h3 className="text-lg font-semibold text-gray-800 pt-2">
        Rekomendasi Mata Kuliah
      </h3>
      <div className="space-y-4">
        {placeholderRecommendations.map((rec) => (
          <RecommendationCard
            key={rec.id}
            title={rec.title}
            priority={rec.priority}
            description={rec.description}
            prerequisites={rec.prerequisites}
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