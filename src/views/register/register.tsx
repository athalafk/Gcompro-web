'use client';

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterView() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = (formData.get("email") as string)?.trim();
    const password = formData.get("password") as string;

    setPending(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Registrasi gagal. Coba lagi.");
        return;
      }

      router.refresh();
      router.push(`/register/sent?email=${encodeURIComponent(email ?? "")}`);
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 border rounded-xl p-6">
        <h1 className="text-xl font-semibold">Daftar Akun Baru</h1>

        <div className="space-y-1">
          <label className="text-sm">Email</label>
          <input
            className="w-full border rounded p-2"
            type="email"
            name="email"
            placeholder="nama@email.com"
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
            minLength={6}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          className="w-full rounded bg-indigo-600 text-white py-2 disabled:opacity-60 hover:underline pointer-fine:cursor-pointer"
          type="submit"
          disabled={pending}
        >
          {pending ? "Mendaftar..." : "Daftar"}
        </button>

        <p className="text-center text-sm">
          Sudah punya akun?{" "}
          <Link href="/login" className="text-indigo-600 hover:underline">
            Masuk di sini
          </Link>
        </p>
      </form>
    </main>
  );
}
