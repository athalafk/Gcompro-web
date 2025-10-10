import { Suspense } from 'react';
import AuthConfirmedClient from './AuthConfirmedClient';

const LoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center p-4">
    <div className="text-center p-8 bg-gray-100 rounded-lg max-w-sm">Memuat status verifikasi...</div>
  </div>
);

export default function AuthConfirmedPage() {
  return (
      <Suspense fallback={<LoadingFallback />}>
        <AuthConfirmedClient />
      </Suspense>
  );
}