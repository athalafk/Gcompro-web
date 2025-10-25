"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { MyProfile } from "@/models/types/auth/auth";

type Ctx = {
  profile: MyProfile | null;
  loading: boolean;
  error: string | null;
  studentId: string | null;     // <- mudah diakses page lain
  refresh: () => Promise<void>; // optional: manual refresh
};

const ProfileContext = createContext<Ctx | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // Hindari double-fetch di React Strict Mode (dev)
  const hasFetchedRef = useRef(false);

  const fetchOnce = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/profile", {
        method: "GET",
        credentials: "include",           // -> kelihatan di Network & cookie ikut
        headers: { accept: "application/json" },
        cache: "no-store",
      });

      if (res.status === 401 || res.status === 404) {
        setProfile(null);
        return;
      }
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }

      const data = (await res.json()) as MyProfile;
      setProfile(data);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load profile");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasFetchedRef.current) return; // cegah double fetch di StrictMode
    hasFetchedRef.current = true;
    void fetchOnce();
     
  }, []);

  const studentId =
    profile?.role === "student" ? (profile.id ?? null) : null;

  const value = useMemo<Ctx>(() => ({
    profile,
    loading,
    error,
    studentId,
    refresh: fetchOnce,
  }), [profile, loading, error, studentId]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfileContext() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfileContext must be used within <ProfileProvider>");
  return ctx;
}