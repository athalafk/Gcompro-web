"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { loginWithNim } from "@/services/auth";

function sanitizeRedirect(r: string | null): string {
  if (!r) return "/dashboard";
  if (!r.startsWith("/")) return "/dashboard";
  if (r === "/login") return "/dashboard";
  if (r.startsWith("/auth/")) return "/dashboard";
  return r;
}

export default function LoginView() {
  const router = useRouter();
  const search = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const redirectTo = useMemo(() => sanitizeRedirect(search.get("redirect")), [search]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = event.currentTarget;
    const formData = new FormData(form);

    const nim = (formData.get("nim") as string)?.trim();
    const password = (formData.get("password") as string) ?? "";

    if (!nim || !password) {
      setError("NIM dan kata sandi wajib diisi.");
      return;
    }

    setPending(true);
    setError(null);

    try {
      const data = await loginWithNim(nim, password);
      if (data.error) {
        setError(data.error || "Login gagal. Coba lagi.");
        return;
      }
      router.replace(redirectTo);
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="w-screen h-screen flex items-center justify-center" style={{ backgroundColor: "#f3f8ff" }}>
      <div className="flex w-full h-full">
        <div className="hidden md:flex w-1/2 p-10 items-center justify-center">
          <div className="relative w-full h-full mb-4">
            <Image
              src="/Login-pict.svg"
              alt="Ilustrasi Login SIPANDAI"
              width={600}
              height={600}
              style={{ objectFit: "contain" }}
              priority
            />
          </div>
        </div>

        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center bg-white">
          <h1 className="text-3xl font-bold text-black mb-2">
            Selamat Datang di <span className="text-[#02325B] font-extrabold">SIPANDAI</span>
          </h1>
          <p className="text-sm text-black font-semibold mb-12">
            Sistem Informasi Pemantauan Data Akademik Integratif
          </p>

          <form onSubmit={handleSubmit} className="w-full space-y-5">
            <div>
              <label htmlFor="nim" className="block text-sm font-medium text-black ml-0.5 mb-2">
                NIM
              </label>
              <input
                id="nim"
                className="w-full border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-[#02325B] focus:border-transparent transition"
                type="text"
                name="nim"
                placeholder="Masukkan NIM Anda"
                required
                autoFocus
                inputMode="numeric"
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-black ml-0.5 mb-2">
                Kata Sandi
              </label>
              <div className="relative">
                <input
                  id="password"
                  className="w-full border border-gray-300 rounded-xl p-3 pr-12 focus:outline-none focus:ring-2 focus:ring-[#02325B] focus:border-transparent transition"
                  type={showPwd ? "text" : "password"}
                  name="password"
                  placeholder="Masukkan kata sandi"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-600 hover:text-gray-800"
                  aria-label={showPwd ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                >
                  {showPwd ? "Sembunyikan" : "Tampilkan"}
                </button>
              </div>
            </div>

            {error && <p className="text-sm text-red-600 pt-1">{error}</p>}

            <button
              className="w-full rounded-md bg-[#02325B] mt-5 text-white py-3 font-semibold disabled:opacity-60 hover:bg-[#02325B] transition duration-200 ease-in-out cursor-pointer"
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
