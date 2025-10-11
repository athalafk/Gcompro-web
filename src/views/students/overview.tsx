'use client';

import { useState, useEffect } from "react";
import GpaTrend from "@/components/charts/GpaTrend";
import { OverviewData, MergedGpaTrendData } from "@/app/models/types/students/students";
import { getOverview } from "@/services/students";
import LoadingSpinner from "@/components/loading/loading-spinner";

export default function StudentsOverview({ studentId }: { studentId: string }) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getOverview(studentId)
      .then(result => {
        setData(result);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [studentId]);

  if (loading) return <LoadingSpinner message="Memuat Overview Mahasiswa..." />;
  if (error) return <main className="p-6 text-red-600">Error: {error}</main>;
  if (!data) return <main className="p-6">Data tidak ditemukan.</main>;

  const merged: MergedGpaTrendData = data.trend.map((t) => ({
    semester_no: t.semester_no,
    ips: t.ips,
    ipk_cum: (data.cum as any[]).find((c) => c.semester_no === t.semester_no)?.ipk_cum ?? null,
  }));

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Overview Mahasiswa</h1>
        <span className={`px-3 py-1 rounded-full text-sm ${
          data.risk_level === "HIGH" ? "bg-red-100 text-red-700"
          : data.risk_level === "MED" ? "bg-yellow-100 text-yellow-700"
          : "bg-emerald-100 text-emerald-700"
        }`}>
          Risiko: {data.risk_level}
        </span>
      </div>

      <GpaTrend data={merged} />

      <section className="rounded-2xl border p-4">
        <h3 className="font-semibold mb-3">Distribusi Nilai</h3>
        <div className="flex gap-4">
          {data.dist.map((d: any) => (
            <div key={d.grade_index} className="rounded-xl border px-4 py-3">
              <div className="text-xs text-slate-500">Nilai {d.grade_index}</div>
              <div className="text-2xl font-bold">{d.count}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}