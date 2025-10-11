'use client';

import { useState, useEffect } from "react";
import PrereqGraph from "@/components/prereq/PrereqGraph";
import { PrereqNode, PrereqLink, AIResult } from "@/app/models/types/students/risk";
import { getPrereqMap,analyzeRisk } from "@/services/students";
import LoadingSpinner from "@/components/loading/loading-spinner";

export default function StudentsRiskView({ studentId }: { studentId: string }) {
  const [nodes, setNodes] = useState<PrereqNode[]>([]);
  const [links, setLinks] = useState<PrereqLink[]>([]);
  const [ai, setAi] = useState<AIResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;
    getPrereqMap(studentId).then(({nodes, links})=>{
      setNodes(nodes); setLinks(links);
      setInitialLoading(false);
    }).catch(err => {
        console.error(err);
        setInitialLoading(false);
    });
  }, [studentId]);

  async function handleAnalyze() {
    if (!studentId) return;
    setLoading(true);
    try {
        const result = await analyzeRisk(studentId);
        setAi(result);
    } catch (e) {
        console.error("Analysis failed", e);
    } finally {
        setLoading(false);
    }
  }

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

      <PrereqGraph nodes={nodes} links={links} />

      {ai && (
        <section className="rounded-2xl border p-4 space-y-2">
          <div className={`inline-block px-3 py-1 rounded-full text-sm ${
            ai.risk_level==="HIGH"?"bg-red-100 text-red-700":ai.risk_level==="MED"?"bg-yellow-100 text-yellow-700":"bg-emerald-100 text-emerald-700"
          }`}>Risiko: {ai.risk_level}</div>
          <div className="text-sm text-slate-600">Cluster: {ai.cluster_label} · Distance: {ai.distance.toFixed(3)}</div>
          <div className="grid sm:grid-cols-2 gap-3 mt-2">
            <div>
              <h4 className="font-semibold mb-1">Alasan</h4>
              <ul className="list-disc pl-5 text-sm">{ai.reasons.map((r:string,i:number)=><li key={i}>{r}</li>)}</ul>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Aksi Rekomendasi</h4>
              <ul className="list-disc pl-5 text-sm">{ai.actions.map((r:string,i:number)=><li key={i}>{r}</li>)}</ul>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}