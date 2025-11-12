// src/app/(dashboard)/layout.tsx
"use client";

// --- 1. Tambahkan useState dan useEffect ---
import { useState, useEffect } from "react";
import { ProfileProvider, useProfileContext } from "@/contexts/profile-context";
import SidebarNav from "@/components/dashboard/SidebarNav";
// --- 2. Impor AdminSidebarNav ---
import AdminSidebarNav from "@/components/dashboard/AdminSidebarNav";

// ... (fungsi initials(name) tetap sama) ...
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

// --- 3. Tipe data baru untuk mahasiswa yang dilihat ---
type ViewingStudent = {
  name: string;
  nim: string;
  prodi: string;
};

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  // 'studentId' di sini adalah ID efektif (bisa null, bisa ID student, bisa ID admin)
  const { profile, loading, studentId } = useProfileContext();
  
  // --- 4. State untuk menyimpan detail mahasiswa yang dilihat ---
  const [viewingStudent, setViewingStudent] = useState<ViewingStudent | null>(null);

  const isAdmin = profile?.role === "admin";
  const fullName = profile?.full_name ?? (isAdmin ? "Administrator" : "Mahasiswa");
  // ... (sisa variabel nim/prodi tetap sama) ...
  const nim = profile?.role === "student" ? profile.nim ?? "" : "";
  const prodi = profile?.role === "student" ? profile.prodi ?? "" : "";

  // --- 5. Efek untuk membaca sessionStorage saat studentId berubah ---
  useEffect(() => {
    // Hanya jalankan jika admin dan ada studentId yang dipilih
    if (isAdmin && studentId) {
      const name = sessionStorage.getItem("admin:selectedStudentName");
      const nim = sessionStorage.getItem("admin:selectedStudentNIM");
      const prodi = sessionStorage.getItem("admin:selectedStudentProdi");
      
      if (name && nim && prodi) {
        setViewingStudent({ name, nim, prodi });
      }
    } else {
      // Bersihkan jika tidak ada student yang dipilih
      setViewingStudent(null);
    }
  }, [isAdmin, studentId]); // <-- Jalankan ulang saat studentId berubah

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 flex-shrink-0 bg-[#02325B] text-white flex flex-col">
        <div className="flex-grow flex flex-col p-4">
          {/* ... (Blok profil Anda tetap sama) ... */}
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

          {/* --- 6. MODIFIKASI BESAR PADA LOGIKA NAVIGASI --- */}
          <nav className="flex-grow">
            {loading ? (
              // Skeleton
              <div className="px-2">
                <div className="h-8 rounded bg-white/10 mb-2 animate-pulse" />
                <div className="h-8 rounded bg-white/10 mb-2 animate-pulse" />
              </div>
            ) : isAdmin ? (
              // --- JIKA ADMIN ---
              <>
                {/* 1. Tampilkan Navigasi Admin (Daftar Mhs) */}
                <AdminSidebarNav />

                {/* 2. Jika admin sedang "melihat" seorang mhs... */}
                {studentId && viewingStudent && (
                  <div className="mt-4 pt-4 border-t border-white/20">
                    {/* Tampilkan detail mhs yang dilihat */}
                    <div className="px-3 text-xs text-blue-200 mb-2">
                      <p className="font-semibold text-white">Viewing:</p>
                      <p>{viewingStudent.name}</p>
                      <p>{viewingStudent.nim}</p>
                      <p>{viewingStudent.prodi}</p>
                    </div>
                    {/* Tampilkan Navigasi Mahasiswa */}
                    <SidebarNav studentId={studentId} />
                  </div>
                )}
              </>
            ) : profile?.role === "student" && studentId ? (
              // --- JIKA MAHASISWA ---
              // Tampilkan navigasi normal mereka
              <SidebarNav studentId={studentId} />
            ) : (
              // --- FALLBACK ---
              <div className="text-xs text-blue-200/80 px-2">
                {"Profil student belum terhubung."}
              </div>
            )}
          </nav>
          {/* --- AKHIR MODIFIKASI --- */}

          {/* Tombol Logout (Gunakan implementasi Anda) */}
          <div className="mt-auto">
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="w-full rounded-lg bg-blue-900 px-4 py-3 text-center font-medium text-white transition-colors hover:bg-blue-800"
              >
                Keluar
              </button>
            </form>
          </div>

          {/* ... (Branding SIPANDAI Anda) ... */}
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