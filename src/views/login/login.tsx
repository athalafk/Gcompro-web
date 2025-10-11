'use client';

import Link from "next/link";
import { login } from "@/app/models/actions/login";

export default function LoginView() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form action={login} className="w-full max-w-sm space-y-4 border rounded-xl p-6">
        <h1 className="text-xl font-semibold">Masuk</h1>

        <div className="space-y-1">
          <label className="text-sm">Email</label>
          <input
            className="w-full border rounded p-2"
            type="email"
            name="email"
            placeholder="admin@campus.ac.id"
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

        <button className="w-full rounded bg-black text-white py-2 hover:underline pointer-fine:cursor-pointer">
          Masuk
        </button>

        {/* Link ke Register */} 
        <p className="text-center text-sm mt-3"> 
          Belum punya akun?{" "} 
          <Link href="/register" className="text-blue-600 hover:underline"> 
            Daftar di sini 
          </Link> 
        </p>
      </form>
    </main>
  );
}