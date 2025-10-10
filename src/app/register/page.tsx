"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { signup } from "./actions";

const initialState = { error: null as string | null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      className="w-full rounded bg-indigo-600 text-white py-2 disabled:opacity-60 hover:underline pointer-fine:cursor-pointer"
      type="submit"
      disabled={pending}
    >
      {pending ? "Mendaftar..." : "Daftar"}
    </button>
  );
}

export default function RegisterPage() {
  const [state, formAction] = useFormState(signup, initialState);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form action={formAction} className="w-full max-w-sm space-y-4 border rounded-xl p-6">
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

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <SubmitButton />

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
