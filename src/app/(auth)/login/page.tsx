import { Suspense } from 'react';
import LoginView from "@/views/login/login";
import LoadingSpinner from '@/components/loading/loading-spinner';

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingSpinner message="Memuat Halaman Login..." />}>
      <LoginView />
    </Suspense>
  );
}