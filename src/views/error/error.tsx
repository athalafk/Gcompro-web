'use client';

import Link from 'next/link';

export default function ErrorView({ message }: { message?: string }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4 border border-red-300 rounded-xl p-6 text-center bg-red-50 text-red-800">
        <h1 className="text-2xl font-bold">Terjadi Kesalahan! 😔</h1>
        
        <p className="text-base">
          {message || 'Maaf, terjadi kesalahan tak terduga saat memproses permintaan Anda.'}
        </p>

        <p className="text-sm">
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