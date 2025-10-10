import Link from "next/link";

export default function Home() {
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">FTE Analytics</h1>
      <div className="flex gap-3">
        <Link href="/upload" className="px-4 py-2 rounded-xl bg-black text-white">Upload Nilai</Link>
        <Link href="/students" className="px-4 py-2 rounded-xl border">Daftar Mahasiswa</Link>
      </div>
    </main>
  );
}
