export const dynamic = "force-dynamic";

import Link from "next/link";
import { createAdminClient } from "@/lib/supabase";

export default async function StudentsPage() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("students")
    .select("id,nim,nama")
    .order("nim");

  if (error) throw new Error(error.message);

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-xl font-semibold">Daftar Mahasiswa</h1>
      <ul className="space-y-2">
        {(data ?? []).map((s) => (
          <li key={s.id} className="border rounded-xl p-3">
            <div className="font-medium">{s.nama} — {s.nim ?? "-"}</div>
            <Link href={`/students/${s.id}`} className="text-sm text-blue-600">Lihat overview</Link>{" · "}
            <Link href={`/students/${s.id}/risk`} className="text-sm text-blue-600">Analisis risiko</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
