"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image"; 

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
      router.push("/dashboard");
    } catch {
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main
      className="w-screen h-screen flex items-center justify-center"
      style={{ backgroundColor: "#f3f8ff" }}
    >
      <div className="flex w-full h-full">
        <div className="hidden md:flex w-1/2 p-10 items-center justify-center">
          <div className="relative w-full max-w-md h-auto">
            {" "}
            <Image
              src="/Login-pict.svg" 
              alt="Ilustrasi Login SIPANDAI"
              width={400} 
              height={400} 
              style={{ objectFit: "contain" }} 
              priority 
            />
          </div>
        </div>

        <div
          className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center"
          style={{ backgroundColor: "#ffffff" }}
        >
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Selamat Datang di <span className="text-blue-600">SIPANDAI</span>
          </h1>
          <p className="text-sm text-gray-600 mb-8">
            Sistem Informasi Pemantauan Data Akademik Integratif
          </p>

          <form onSubmit={handleSubmit} className="w-full space-y-5">
            <div className="space-y-1">
              <label
                htmlFor="nim"
                className="text-sm font-medium text-gray-700"
              >
                NIM
              </label>
              <input
                id="nim"
                className="w-full border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                type="text"
                name="nim"
                placeholder="Masukkan NIM Anda"
                required
              />
            </div>

            <div className="space-y-1">
              <label
                htmlFor="password"
                className="text-sm font-medium text-gray-700"
              >
                Kata Sandi
              </label>
              <input
                id="password"
                className="w-full border border-gray-300 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                type="password"
                name="password"
                placeholder="Masukkan kata sandi"
                required
              />
            </div>

            {error && <p className="text-sm text-red-600 pt-1">{error}</p>}

            <button
              className="w-full rounded-md bg-blue-600 text-white py-3 font-semibold disabled:opacity-60 hover:bg-blue-700 transition duration-200 ease-in-out"
              type="submit"
              disabled={pending}
            >
              {pending ? "Memproses..." : "Masuk"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}