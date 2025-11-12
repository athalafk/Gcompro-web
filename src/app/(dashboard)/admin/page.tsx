// src/app/(dashboard)/admin/page.tsx
'use client';

import { useProfileContext } from '@/contexts/profile-context';
import LoadingSpinner from '@/components/loading/loading-spinner';
import StudentListView from '@/views/admin/StudentListView';

export default function AdminDashboardPage() {
  const { profile, loading } = useProfileContext();

  if (loading) {
    return <LoadingSpinner message="Memuat profil..." />;
  }

  // Lindungi rute ini hanya untuk admin
  if (profile?.role !== 'admin') {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold text-red-600">Akses Ditolak</h1>
        <p className="text-gray-700">
          Anda harus menjadi admin untuk mengakses halaman ini.
        </p>
      </main>
    );
  }

  // Jika admin, tampilkan view daftar mahasiswa
  return <StudentListView />;
}