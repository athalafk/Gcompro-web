'use client';

import Link from "next/link";
import { useState, useEffect } from "react";
import { Student } from "@/app/models/types/students/students";
import LoadingSpinner from "@/components/loading/loading-spinner";

async function getStudents(): Promise<Student[]> {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const res = await fetch(`${base}/api/students`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Gagal mengambil data mahasiswa");
  }

  return res.json();
}

export default function StudentsView() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getStudents()
      .then(data => {
        setStudents(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);


  if (loading) return <LoadingSpinner message="Memuat daftar mahasiswa..." />;

  if (error) return <p className="text-red-600">Error: {error}</p>;

  return (
    <main className="p-2 space-y-4">
      <h1 className="text-xl font-semibold">Daftar Mahasiswa</h1>
      <ul className="space-y-2">
        {(students ?? []).map((s) => (
          <li key={s.id} className="border rounded-xl p-3">
            <div className="font-medium">
              {s.nama} — {s.nim ?? "-"}
            </div>
            <Link href={`/students/${s.id}`} className="text-sm text-blue-600">
              Lihat overview
            </Link>{" "}
            {" · "}
            <Link href={`/students/${s.id}/risk`} className="text-sm text-blue-600">
              Analisis risiko
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}