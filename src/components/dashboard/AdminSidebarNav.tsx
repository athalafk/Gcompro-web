// src/components/dashboard/AdminSidebarNav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
// Kita gunakan ikon dari MUI (pastikan @mui/icons-material sudah terinstal)
import ListAltIcon from '@mui/icons-material/ListAlt';

export default function AdminSidebarNav() {
  const pathname = usePathname();
  const adminLink = '/admin'; // Ini adalah rute ke StudentListView Anda
  
  // Cek apakah kita sedang berada di /admin
  const isActive = pathname.startsWith(adminLink);

  return (
    <ul>
      <li className="mb-2">
        <Link
          href={adminLink}
          className={`flex items-center gap-3 rounded-lg px-4 py-3 transition-colors ${
            isActive
              ? "bg-white text-[#02325B] font-bold" // Sesuaikan warna text dengan bg sidebar
              : "text-white hover:bg-white/10"
          }`}
        >
          <ListAltIcon sx={{ fontSize: 20 }} />
          <span>Daftar Mahasiswa</span>
        </Link>
      </li>
      {/* Anda bisa menambahkan link admin lain di sini di masa depan */}
    </ul>
  );
}