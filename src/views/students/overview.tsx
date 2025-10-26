// src/views/students/overview.tsx
'use client';

import { useState, useEffect } from "react";
import LoadingSpinner from "@/components/loading/loading-spinner";

// Impor komponen
import BlueStatCard from "@/components/features/students/BlueStatCard";
import GpaLineChart from "@/components/charts/apex/GpaLineChart";
import GradePieChart from "@/components/charts/apex/GradePieChart";
import TranscriptTable from "@/components/features/students/TranscriptTable";

// Tipe data dari GCompro-api.pdf (SUDAH DIPERBAIKI)
type ChartData = {
  line: {
    categories: number[];
    series: Array<{ name: string; data: (number | null)[] }>;
  };
  pie: {
    labels: string[];
    series: number[];
  };
};

type StatsData = {
  ips: number | null;
  ipk: number | null;
  total_sks: number;
  sks_selesai: number;
  sks_tersisa: number;
};

type TranscriptItem = {
  semester_no: number;
  kode: string;
  nama: string;
  sks: number;
  nilai: string | null;
  status: string;
};

// Fungsi helper
function getLatestValidValue(
  series: Array<{ name: string; data: (number | null)[] }>,
  name: string
) {
  const dataSeries = series.find((s) => s.name === name)?.data;
  if (!dataSeries) return 0;
  for (let i = dataSeries.length - 1; i >= 0; i--) {
    if (dataSeries[i] !== null) {
      return dataSeries[i] as number;
    }
  }
  return 0;
}

// Terima studentId sebagai prop (sesuai page.tsx)
export default function StudentsOverview({ studentId }: { studentId: string }) {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [transcriptData, setTranscriptData] = useState<TranscriptItem[] | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      setError("Student ID tidak disediakan.");
      return;
    }

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [chartRes, statsRes, transcriptRes] = await Promise.all([
          // 1. Ambil data chart (untuk IPK/IPS, Line, Pie)
          fetch(`/api/students/${studentId}/statistic/chart`),

          // 2. Ambil data SKS
          // API ini butuh body 'semester'. Kita beri semester dummy
          // untuk mendapatkan data SKS kumulatif.
          fetch(`/api/students/${studentId}/statistic`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ semester: "Ganjil 2023/2024" }),
          }),

          // 3. Ambil data transkrip
          fetch(`/api/students/${studentId}/transcript`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({}),
          }),
        ]);

        if (!chartRes.ok) throw new Error(`Gagal memuat data chart: ${chartRes.statusText}`);
        if (!statsRes.ok) throw new Error(`Gagal memuat data SKS: ${statsRes.statusText}`);
        if (!transcriptRes.ok) throw new Error(`Gagal memuat transkrip: ${transcriptRes.statusText}`);

        const chart: ChartData = await chartRes.json();
        const stats: StatsData = await statsRes.json();
        const transcript: TranscriptItem[] = await transcriptRes.json();

        setChartData(chart);
        setStatsData(stats);
        setTranscriptData(transcript);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    void fetchData();
  }, [studentId]); // Jalankan ulang jika studentId berubah

  if (loading) return <LoadingSpinner message="Memuat Statistik Akademik..." />;
  if (error) return <main className="p-6 text-red-600">Error: {error}</main>;
  if (!chartData || !statsData || !transcriptData) {
    return <main className="p-6">Data statistik tidak ditemukan.</main>;
  }

  // Ekstrak data untuk 5 kartu
  const latestIps = getLatestValidValue(chartData.line.series, "IPS");
  const latestIpk = getLatestValidValue(chartData.line.series, "IPK");
  const { total_sks, sks_selesai, sks_tersisa } = statsData;

  // --- JSX SESUAI MOCKUP ---
  return (
    <main className="p-6 space-y-6">
      {/* Header Halaman */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">Statistik Akademik</h1>
        <div className="text-right">
          <h2 className="text-xl font-bold text-blue-800">SIPANDAI</h2>
          <p className="text-xs text-gray-500">
            Sistem Informasi Pemantauan Data Akademik Integratif
          </p>
        </div>
      </div>

      {/* 5 Kartu Statistik Biru */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <BlueStatCard title="IPS" value={latestIps.toFixed(2)} />
        <BlueStatCard title="IPK" value={latestIpk.toFixed(2)} />
        <BlueStatCard title="Target SKS" value={total_sks} />
        <BlueStatCard title="SKS Selesai" value={sks_selesai} />
        <BlueStatCard title="SKS Tertinggal" value={sks_tersisa} />
      </div>

      {/* Grid Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Blok Chart Perkembangan IPK */}
          <GpaLineChart data={chartData.line} />
        </div>
        <div>
          {/* Blok Chart Distribusi Nilai */}
          <GradePieChart data={chartData.pie} />
        </div>
      </div>

      {/* Blok Transkrip Nilai */}
      <div className="col-span-1 lg:col-span-3">
        <TranscriptTable data={transcriptData} />
      </div>
    </main>
  );
}