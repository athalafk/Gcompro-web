'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    setPending(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error ?? "Logout gagal. Coba lagi.");
      }

      router.refresh();
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logout gagal. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-stretch">
      <button
        type="button"
        onClick={handleLogout}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Logging out...
          </span>
        ) : (
          <>
            <span>Logout</span>
          </>
        )}
      </button>
      {error && (
        <span className="mt-1 text-xs text-red-600" aria-live="polite">
          {error}
        </span>
      )}
    </div>
  );
}

