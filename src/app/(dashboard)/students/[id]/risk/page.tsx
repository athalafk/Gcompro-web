"use client";
import { useState, useEffect } from "react";
import PrereqGraph from "@/components/prereq/PrereqGraph";

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string>();
  const [nodes, setNodes] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [ai, setAi] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(()=>{ params.then(p=>setId(p.id)); },[params]);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/students/${id}/prereq-map`).then(r=>r.json()).then(({nodes,links})=>{
      setNodes(nodes); setLinks(links);
    });
  }, [id]);

  async function analyze() {
    if (!id) return;
    setLoading(true);
    const r = await fetch(`/api/students/${id}/analyze`, { method: "POST" });
    const j = await r.json();
    setAi(j.ai);
    setLoading(false);
  }

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Analisis Risiko & Peta Prasyarat</h1>
        <button onClick={analyze} disabled={loading} className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50">
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
