export const dynamic = "force-dynamic";

import GpaTrend from "@/components/charts/GpaTrend";

async function getOverview(id: string) {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const res = await fetch(`${base}/api/students/${id}/overview`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed fetch overview");
  return res.json();
}

export default async function Page(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await getOverview(id);

  const merged = (data.trend as any[]).map((t: any) => ({
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
