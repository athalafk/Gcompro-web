'use client';

import { useState, useEffect, useMemo } from "react";
import PrereqGraph from "@/components/prereq/PrereqGraph";
import { PrereqNode, PrereqLink, AIRawResult } from "@/models/types/students/risk";
import { getPrereqMap, analyzeRisk } from "@/services/students";
import LoadingSpinner from "@/components/loading/loading-spinner";

function mapRiskForUi(label: string): "HIGH" | "MED" | "LOW" {
  const L = (label || "").toLowerCase();
  if (L.includes("tinggi")) return "HIGH";
  if (L.includes("sedang")) return "MED";
  // "rendah" / "aman"
  return "LOW";
}

export default function StudentsRiskView({ studentId }: { studentId: string }) {
  const [nodes, setNodes] = useState<PrereqNode[]>([]);
  const [links, setLinks] = useState<PrereqLink[]>([]);
  const [ai, setAi] = useState<AIRawResult | null>(null);
  const [feat, setFeat] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId) return;
    setError(null);
    getPrereqMap(studentId)
      .then(({ nodes, links }) => {
        setNodes(nodes);
        setLinks(links);
      })
      .catch((err) => {
        console.error(err);
        setError("Gagal memuat peta prasyarat.");
      })
      .finally(() => setInitialLoading(false));
  }, [studentId]);

  async function handleAnalyze() {
    if (!studentId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeRisk(studentId);
      setFeat(result?.feat ?? null);
      setAi(result?.ai ?? null);
    } catch (e) {
      console.error("Analysis failed", e);
      setError("Analisis gagal dijalankan.");
    } finally {
      setLoading(false);
    }
  }

  const chip = useMemo(() => {
    if (!ai) return null;
    const enumUi = mapRiskForUi(ai.prediction);
    const cls =
      enumUi === "HIGH"
        ? "bg-red-100 text-red-700"
        : enumUi === "MED"
        ? "bg-yellow-100 text-yellow-700"
        : "bg-emerald-100 text-emerald-700";
    return (
      <div className={`inline-block px-3 py-1 rounded-full text-sm ${cls}`}>
        Risiko: {ai.prediction}
      </div>
    );
  }, [ai]);

  const extraInfo = useMemo(() => {
    if (!ai) return null;
    const entries = Object.entries(ai.probabilities ?? {}).sort(
      (a, b) => (b[1] ?? 0) - (a[1] ?? 0)
    );
    return (
      <div className="space-y-2">
        <div className="text-sm text-slate-600">Hasil Prediksi</div>
        {entries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border rounded-xl overflow-hidden">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left p-2 border-b">Label</th>
                  <th className="text-right p-2 border-b">Probabilitas</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(([k, v]) => (
                  <tr key={k} className="even:bg-slate-50/50">
                    <td className="p-2">{k}</td>
                    <td className="p-2 text-right">{(v * 100).toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-sm text-slate-500">Probabilitas tidak tersedia.</div>
        )}
      </div>
    );
  }, [ai]);

  if (initialLoading) return <LoadingSpinner message="Memuat Peta Prasyarat & Risiko..." />;

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Analisis Risiko & Peta Prasyarat</h1>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50"
        >
          {loading ? "Menganalisis..." : "Analisis Sekarang"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <PrereqGraph nodes={nodes} links={links} />

      {ai && (
        <section className="rounded-2xl border p-4 space-y-3">
          {chip}
          {extraInfo}

          {feat && (
            <div className="mt-3">
              <h4 className="font-semibold mb-1">Ringkas Fitur</h4>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                <div className="p-2 rounded-lg bg-slate-50">
                  IPK Terakhir: <b>{feat.IPK_Terakhir?.toFixed?.(2) ?? feat.IPK_Terakhir}</b>
                </div>
                <div className="p-2 rounded-lg bg-slate-50">
                  IPS Terakhir: <b>{feat.IPS_Terakhir?.toFixed?.(2) ?? feat.IPS_Terakhir}</b>
                </div>
                <div className="p-2 rounded-lg bg-slate-50">Total SKS: <b>{feat.Total_SKS}</b></div>
                <div className="p-2 rounded-lg bg-slate-50">IPS Tertinggi: <b>{feat.IPS_Tertinggi}</b></div>
                <div className="p-2 rounded-lg bg-slate-50">IPS Terendah: <b>{feat.IPS_Terendah}</b></div>
                <div className="p-2 rounded-lg bg-slate-50">Rentang IPS: <b>{feat.Rentang_IPS}</b></div>
                <div className="p-2 rounded-lg bg-slate-50">MK Gagal: <b>{feat.Jumlah_MK_Gagal}</b></div>
                <div className="p-2 rounded-lg bg-slate-50">Total SKS Gagal: <b>{feat.Total_SKS_Gagal}</b></div>
                <div className="p-2 rounded-lg bg-slate-50">
                  Tren IPS (slope): <b>{feat.Tren_IPS_Slope?.toFixed?.(4) ?? feat.Tren_IPS_Slope}</b>
                </div>
                <div className="p-2 rounded-lg bg-slate-50">Profil Tren: <b>{feat.Profil_Tren}</b></div>
                <div className="p-2 rounded-lg bg-slate-50">
                  Δ Kinerja (IPS−IPK): <b>{feat.Perubahan_Kinerja_Terakhir?.toFixed?.(2) ?? feat.Perubahan_Kinerja_Terakhir}</b>
                </div>
                <div className="p-2 rounded-lg bg-slate-50">
                  IPK Ternormalisasi SKS: <b>{feat.IPK_Ternormalisasi_SKS?.toFixed?.(2) ?? feat.IPK_Ternormalisasi_SKS}</b>
                </div>
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
