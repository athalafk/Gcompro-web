'use client';

import { useState } from "react";
import { UploadResult } from "@/models/types/upload/upload";

export default function UploadView() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!file) {
      setError("Pilih file CSV terlebih dahulu");
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    setLoading(true);
    try {
      const res = await fetch("/api/upload/grades", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Upload gagal");
      } else {
        setResult(json);
      }
    } catch (err: any) {
      setError(err?.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">Upload Nilai (grades.csv)</h1>

      <div className="rounded-2xl border p-4 space-y-3">
        <p className="text-sm text-slate-600">
          Format kolom: <code>nim,kode,semester_no,tahun_ajaran,grade_index,sks</code>
        </p>

        <form onSubmit={onSubmit} className="flex items-center gap-3">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block"
          />
          <button
            type="submit"
            disabled={loading || !file}
            className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-50"
          >
            {loading ? "Uploading..." : "Upload"}
          </button>
        </form>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        {result && (
          <div className="rounded-xl border p-3 text-sm space-y-1">
            <div>Parsed rows: <b>{result.parsed}</b></div>
            <div>Inserted/Upserted: <b>{result.inserted}</b></div>
            <div>Skipped (missing students): <b>{result.skipped_students}</b></div>
            <div>Skipped (missing courses): <b>{result.skipped_courses}</b></div>

            {(result.samples?.missing_students?.length > 0 || result.samples?.missing_courses?.length > 0) && (
              <details className="mt-2">
                <summary className="cursor-pointer">Details (samples)</summary>
                <pre className="mt-2 overflow-auto text-xs">
                  {JSON.stringify(result.samples, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>
    </main>
  );
}