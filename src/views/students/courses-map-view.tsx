"use client";

import { useEffect, useState } from "react";
import LoadingSpinner from "@/components/loading/loading-spinner";
// 1. Ganti impor dari PrereqGraph ke CurriculumGrid
import CurriculumGrid from "@/components/prereq/PrereqGraph";
import { getCourseMap } from "@/services/students";
// 2. Impor tipe data respons API
import type { CoursesMapResponse } from "@/models/types/students/risk";

export default function PrereqMapViews({ studentId }: { studentId: string }) {
  // 3. State sekarang akan menyimpan data API mentah
  const [data, setData] = useState<CoursesMapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) {
      setLoading(false);
      setError("Student ID tidak ditemukan.");
      return;
    }

    const controller = new AbortController();

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        // Panggil service API /courses-map
        const courseMapData = await getCourseMap(studentId, controller.signal);
        if (controller.signal.aborted) return;

        if (!courseMapData || !courseMapData.nodes) {
          throw new Error(
            "Data peta prasyarat tidak ditemukan atau formatnya salah."
          );
        }

        // 4. Simpan data mentah. Komponen Grid akan mengurus transformasinya.
        setData(courseMapData);
      } catch (err: any) {
        if (err?.name === "CanceledError" || err?.message === "canceled")
          return;
        if (controller.signal.aborted) return;

        setError(err?.message ?? "Gagal memuat data peta mata kuliah");
        setData(null);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void fetchData();
    return () => controller.abort();
  }, [studentId]);

  if (loading) return <LoadingSpinner message="Memuat Peta Mata Kuliah..." />;
  if (error) return <main className="p-6 text-red-600">Error: {error}</main>;
  if (!data)
    return <main className="p-6">Data peta mata kuliah tidak ditemukan.</main>;

  return (
    <main className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-800">
          Peta Mata Kuliah
        </h1>
        <div className="text-right">
          <h2 className="text-xl font-bold text-blue-800">SIPANDAI</h2>
          <p className="text-xs text-gray-500">
            Sistem Informasi Pemantauan Data Akademik Integratif
          </p>
        </div>
      </div>

      {/* Konten Graph */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
        <p className="text-sm text-gray-600 mb-4 px-2">
          Grid ini menunjukkan mata kuliah per semester berdasarkan kurikulum.
          Status Anda ditandai dengan warna:
        </p>

        {/* Legenda Warna (Sesuai API /courses-map) */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 mb-6 px-2 text-sm">
          <div className="flex items-center gap-2">
            <span
              className="w-4 h-4 rounded"
              style={{
                backgroundColor: "#D1FAE5",
                border: "1px solid #A7F3D0",
              }}
            ></span>
            <span>Lulus</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-4 h-4 rounded"
              style={{
                backgroundColor: "#FEE2E2",
                border: "1px solid #FECACA",
              }}
            ></span>
            <span>Tidak Lulus</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-4 h-4 rounded"
              style={{
                backgroundColor: "#E5E7EB",
                border: "1px solid #CBD5E1",
              }}
            ></span>
            <span>Belum Diambil</span>
          </div>
        </div>

        {/* 5. Render komponen grid baru, kirim 'nodes' mentah dari API */}
        <CurriculumGrid nodes={data.nodes} />
      </div>
    </main>
  );
}
