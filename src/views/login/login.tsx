'use client';

import { FormEvent, useState } from "react";
// import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginView() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    const nim = (formData.get("nim") as string)?.trim();
    const password = formData.get("password") as string;

    setPending(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nim, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Login gagal. Coba lagi.");
        return;
      }

      router.refresh();
      router.push("/");
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 border rounded-xl p-6">
        <h1 className="text-xl font-semibold">Masuk</h1>

        <div className="space-y-1">
          <label className="text-sm">NIM (Nomor Induk Mahasiswa)</label>
          <input
            className="w-full border rounded p-2"
            type="text"
            name="nim"
            placeholder="Contoh: 13200001"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm">Password</label>
          <input
            className="w-full border rounded p-2"
            type="password"
            name="password"
            required
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          className="w-full rounded bg-black text-white py-2 disabled:opacity-60 hover:underline pointer-fine:cursor-pointer"
          disabled={pending}
        >
          {pending ? "Memproses..." : "Masuk"}
        </button>

        {/* <p className="text-center text-sm mt-3">
          Belum punya akun?{" "}
          <Link href="/register" className="text-blue-600 hover:underline">
            Daftar di sini
          </Link>
        </p> */}
      </form>
    </main>
  );
}
