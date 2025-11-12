"use client";

import { ProfileProvider, useProfileContext } from "@/contexts/profile-context";
import SidebarNav from "@/components/dashboard/SidebarNav";
import { LogoutButton } from "@/components/auth/logout-button";

function initials(name: string | null) {
  if (!name) return "👤";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "👤";
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProfileProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </ProfileProvider>
  );
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { profile, loading, studentId } = useProfileContext();

  const isAdmin = profile?.role === "admin";
  const fullName = profile?.full_name ?? (isAdmin ? "Administrator" : "Mahasiswa");
  const nim = profile?.role === "student" ? profile.nim ?? "" : "";
  const prodi = profile?.role === "student" ? profile.prodi ?? "" : "";

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 flex-shrink-0 bg-[#02325B] text-white flex flex-col">
        <div className="flex-grow flex flex-col p-4">
          <div className="text-center p-4 mb-4">
            <div className="w-20 h-20 rounded-full bg-gray-300 mx-auto mb-3 flex items-center justify-center text-gray-700 font-semibold">
              <span className="text-xl">{initials(fullName)}</span>
            </div>
            <h2 className="font-semibold text-lg">
              {loading ? (
                <span className="inline-block h-5 w-32 bg-white/20 rounded animate-pulse align-middle" />
              ) : (
                fullName
              )}
            </h2>
            {loading ? (
              <>
                <p className="text-sm text-blue-200">
                  <span className="inline-block h-4 w-28 bg-white/15 rounded animate-pulse align-middle" />
                </p>
                <p className="text-sm text-blue-200">
                  <span className="inline-block h-4 w-40 bg-white/15 rounded animate-pulse align-middle" />
                </p>
              </>
            ) : profile?.role === "student" ? (
              <>
                {nim && <p className="text-sm text-blue-200">{nim}</p>}
                {prodi && <p className="text-sm text-blue-200 mt-2">{prodi}</p>}
              </>
            ) : (
              <p className="text-sm text-blue-200">Admin</p>
            )}
          </div>

          <nav className="flex-grow">
            {loading ? (
              <div className="px-2">
                <div className="h-8 rounded bg-white/10 mb-2 animate-pulse" />
                <div className="h-8 rounded bg-white/10 mb-2 animate-pulse" />
                <div className="h-8 rounded bg-white/10 mb-2 animate-pulse" />
                <div className="h-8 rounded bg-white/10 mb-2 animate-pulse" />
              </div>
            ) : profile?.role === "student" && studentId ? (
              <SidebarNav studentId={studentId} />
            ) : (
              <div className="text-xs text-blue-200/80 px-2">
                {isAdmin
                  ? "Menu mahasiswa hanya tersedia setelah admin memilih seorang student."
                  : "Profil student belum terhubung ke tabel students (ID tidak ditemukan)."}
              </div>
            )}
          </nav>

          <LogoutButton />

          <div className="text-center mt-4">
            <h3 className="text-lg font-bold text-blue-300">SIPANDAI</h3>
            <p className="text-xs text-blue-400">
              Sistem Informasi Pemantauan Data Akademik Integratif
            </p>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
