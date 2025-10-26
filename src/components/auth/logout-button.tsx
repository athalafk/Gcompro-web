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
    <div className="mt-auto">
      <button
        type="button"
        onClick={handleLogout}
        disabled={pending}
        className="w-full rounded-lg bg-[#0C3A61] px-4 py-3 text-center font-medium text-white transition-colors hover:bg-blue-900 cursor-pointer"
      >
        {pending ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Logging out...
          </span>
        ) : (
          <>
            <span>Keluar</span>
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

