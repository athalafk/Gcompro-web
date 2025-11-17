// src/views/students/overview.tsx
'use client';

import { useState, useEffect, useMemo } from "react"; // <-- Tambah useMemo
import LoadingSpinner from '@/components/loading/loading-spinner';

import BlueStatCard from '@/components/features/students/BlueStatCard';
import GpaLineChart from '@/components/charts/apex/GpaLineChart';
import GradePieChart from '@/components/charts/apex/GradePieChart';
import TranscriptTable from '@/components/features/students/TranscriptTable';

import {
  getStudentChart,
  getStudentStats,
  getStudentTranscript,
  type ChartData,
  type StatsData,
  type TranscriptItem,
} from '@/services/students';

// Helper untuk mendapatkan nilai IPK/IPS terakhir
function getLatestValidValue(
  series: Array<{ name: string; data: (number | null)[] }>,
  name: string
) {
  const dataSeries = series.find((s) => s.name === name)?.data;
  if (!dataSeries) return 0;
  for (let i = dataSeries.length - 1; i >= 0; i--) {
    const v = dataSeries[i];
    if (v != null) return Number(v) || 0;
  }
  return 0;
}

export default function StudentsOverview({ studentId }: { studentId: string }) {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [transcriptData, setTranscriptData] = useState<TranscriptItem[] | null>(null);
  
  // State untuk filter Pie Chart
  const [pieSemester, setPieSemester] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      setError('Student ID tidak disediakan.');
      return;
    }

    const controller = new AbortController();

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        // Panggil semua API menggunakan service
        const [chart, stats, transcript] = await Promise.all([
          getStudentChart(studentId, controller.signal),
          getStudentStats(studentId, 'Ganjil 2023/2024', controller.signal),
          getStudentTranscript(studentId, { signal: controller.signal }),
        ]);

        if (controller.signal.aborted) return;

        setChartData(chart);
        setStatsData(stats);
        setTranscriptData(transcript);
      } catch (err: any) {
        if (err?.name === 'CanceledError' || err?.message === 'canceled') return;
        if (controller.signal.aborted) return;

        setError(err?.message ?? 'Gagal memuat data');
        setChartData(null);
        setStatsData(null);
        setTranscriptData(null);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void fetchData();
    return () => controller.abort();
  }, [studentId]);

  // --- LOGIKA BARU: MENGHITUNG DATA PIE CHART SECARA DINAMIS ---
  const dynamicPieData = useMemo(() => {
    // Jika data belum ada, kembalikan struktur kosong
    if (!transcriptData) return { labels: [], series: [] };

    // 1. Filter data berdasarkan semester pilihan (0 = semua)
    const filteredItems = pieSemester === 0
      ? transcriptData
      : transcriptData.filter(item => item.semester_no === pieSemester);

    // 2. Hitung frekuensi nilai
    const labelOrder = ["A", "AB", "B", "BC", "C", "D", "E"];
    const counts: Record<string, number> = {
      "A": 0, "AB": 0, "B": 0, "BC": 0, "C": 0, "D": 0, "E": 0
    };

    filteredItems.forEach(item => {
      const grade = item.nilai?.trim().toUpperCase();
      if (grade && counts.hasOwnProperty(grade)) {
        counts[grade]++;
      }
    });

    return {
      labels: labelOrder,
      series: labelOrder.map(label => counts[label]),
    };
  }, [transcriptData, pieSemester]);

  // Ambil daftar semester unik untuk opsi dropdown
  const semesterOptions = useMemo(() => {
    if (!transcriptData) return [];
    const sems = new Set(transcriptData.map(t => t.semester_no));
    return Array.from(sems).sort((a, b) => a - b);
  }, [transcriptData]);
  // -------------------------------------------------------------

  if (loading) return <LoadingSpinner message="Memuat Statistik Akademik..." />;
  if (error) return <main className="p-6 text-red-600">Error: {error}</main>;
  if (!chartData || !statsData || !transcriptData) {
    return <main className="p-6">Data statistik tidak ditemukan.</main>;
  }

  const latestIps = getLatestValidValue(chartData.line.series, 'IPS');
  const latestIpk = getLatestValidValue(chartData.line.series, 'IPK');
  const { total_sks, sks_selesai, sks_tersisa } = statsData;

  return (
    <main className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">
          Statistik Akademik
        </h1>
        <div className="text-right">
          <h2 className="text-xl font-extrabold text-[#02325B]">SIPANDAI</h2>
          <p className="text-xs text-gray-500">
            Sistem Informasi Pemantauan Data Akademik Integratif
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <BlueStatCard title="IPS" value={latestIps.toFixed(2)} />
        <BlueStatCard title="IPK" value={latestIpk.toFixed(2)} />
        <BlueStatCard title="Target SKS" value={total_sks} />
        <BlueStatCard title="SKS Selesai" value={sks_selesai} />
        <BlueStatCard title="SKS Tertinggal" value={sks_tersisa} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <GpaLineChart data={chartData.line} />
        </div>
        <div>
          {/* --- GUNAKAN PROPS BARU --- */}
          <GradePieChart 
            data={dynamicPieData} // Gunakan data hasil hitungan
            semesterOptions={semesterOptions}
            selectedSemester={pieSemester}
            onSemesterChange={setPieSemester}
          />
        </div>
      </div>

      <div className="col-span-1 lg:col-span-3">
        <TranscriptTable data={transcriptData} />
      </div>
    </main>
  );
}