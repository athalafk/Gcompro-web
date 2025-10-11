import { Suspense } from 'react';
import AuthConfirmedView from '@/views/auth/auth-confirmed';
import LoadingSpinner from '@/components/loading/loading-spinner';

export default function AuthConfirmedPage() {
  return (
      <Suspense fallback={<LoadingSpinner message="Memuat status verifikasi..." />}>
        <AuthConfirmedView />
      </Suspense>
  );
}