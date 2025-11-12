"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { useRouter } from "next/navigation";
import type { MyProfile } from "@/models/types/auth/auth";
import { getMyProfile } from "@/services/auth";

type ProfileCtx = {
  profile: MyProfile | null;
  loading: boolean;
  error: string | null;
  /** studentId efektif:
   * - role === "student"  -> id milik student sendiri
   * - role === "admin"    -> id student yang dipilih admin (jika ada), else null
   */
  studentId: string | null;

  refresh: () => Promise<void>;

  setAdminStudentId: (id: string | null) => void;
  adminSelectedStudentId: string | null;
};

const ProfileContext = createContext<ProfileCtx | null>(null);
const ADMIN_SELECTED_KEY = "admin:selectedStudentId";

export function useProfileContext() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfileContext must be used inside ProfileProvider");
  return ctx;
}

export function ProfileProvider({ children }: PropsWithChildren) {
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [adminSelectedStudentId, setAdminSelectedStudentId] = useState<string | null>(null);

  const hasFetchedRef = useRef(false);
  const router = useRouter();

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMyProfile();

      if (data === null) {
        router.replace("/login");
        return;
      }

      setProfile(data);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load profile");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    void fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    if (!profile) return;

    if (profile.role === "admin") {
      const stored = typeof window !== "undefined" ? sessionStorage.getItem(ADMIN_SELECTED_KEY) : null;
      setAdminSelectedStudentId(stored || null);
    } else {
      setAdminSelectedStudentId(null);
      if (typeof window !== "undefined") sessionStorage.removeItem(ADMIN_SELECTED_KEY);
    }
  }, [profile]);

  const setAdminStudentId = useCallback((id: string | null) => {
    setAdminSelectedStudentId(id);
    if (typeof window === "undefined") return;
    if (id) sessionStorage.setItem(ADMIN_SELECTED_KEY, id);
    else sessionStorage.removeItem(ADMIN_SELECTED_KEY);
  }, []);

  const studentId: string | null = useMemo(() => {
    if (!profile) return null;

    if (profile.role === "student") {
      return profile.id ?? null;
    }

    if (profile.role === "admin") {
      return adminSelectedStudentId ?? null;
    }

    return null;
  }, [profile, adminSelectedStudentId]);

  const value = useMemo<ProfileCtx>(
    () => ({
      profile,
      loading,
      error,
      studentId,
      refresh: fetchProfile,
      setAdminStudentId,
      adminSelectedStudentId,
    }),
    [profile, loading, error, studentId, fetchProfile, setAdminStudentId, adminSelectedStudentId]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}
