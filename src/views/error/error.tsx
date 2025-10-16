'use client';

import Link from 'next/link';

interface ErrorViewProps {
  message?: string;
  code?: string | number;
}

export default function ErrorView({ message, code }: ErrorViewProps) {
  let defaultMessage = 'Maaf, terjadi kesalahan tak terduga.';
  if (code === 403) defaultMessage = 'Anda tidak memiliki izin untuk mengakses halaman ini.';
  else if (code === 404) defaultMessage = 'Halaman yang Anda cari tidak ditemukan.';
  else if (code === 401) defaultMessage = 'Sesi Anda telah berakhir. Silakan login kembali.';
  else if (code === 500) defaultMessage = 'Terjadi kesalahan di server.';

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4 border border-red-300 rounded-xl p-6 text-center bg-red-50 text-red-800">
        <h1 className="text-2xl font-bold">
          {code ? `Error ${code}` : 'Terjadi Kesalahan!'} 😔
        </h1>

        <p className="text-base">
          {message || defaultMessage}
        </p>

        <p className="text-sm text-red-700">
          Silakan coba kembali atau kembali ke halaman utama.
        </p>

        <Link 
          href="/" 
          className="inline-block px-4 py-2 rounded bg-red-700 text-white hover:bg-red-600 transition"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </main>
  );
}
