'use client'

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client'; 
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function AuthConfirmedPage() {
  const searchParams = useSearchParams();
  const status = searchParams.get('status');
  const message = searchParams.get('message'); 

  const [email, setEmail] = useState(''); 
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [apiError, setApiError] = useState('');

  const supabase = createClient(); 

  const handleResendLink = async () => {
    setLoading(true);
    setApiError('');
    setSuccess('');

    if (!email) {
        setApiError('Silakan masukkan email Anda untuk mengirim ulang.');
        setLoading(false);
        return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`, 
      },
    });

    setLoading(false);

    if (error) {
      setApiError(`Gagal mengirim ulang: ${error.message}`);
    } else {
      setSuccess('✅ Link verifikasi baru telah dikirim! Silakan cek email Anda.');
      setEmail(''); 
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {status === 'error' ? (
        <div className="flex flex-col items-center justify-center p-8 border border-red-300 rounded-lg bg-red-50 w-full max-w-md shadow-lg">
          <h1 className="text-2xl font-bold text-red-700 mb-4">Verifikasi Gagal 😔</h1>
          <p className="text-red-600 mb-6 text-center">
            {message || 'Link verifikasi ini mungkin sudah kedaluwarsa atau invalid.'}
          </p>
          
          <p className="text-gray-700 mb-2">Masukkan email Anda untuk mengirim ulang link:</p>
          
          <input
            type="email"
            placeholder="Email Anda"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="p-2 border rounded w-full mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          
          <button
            onClick={handleResendLink}
            disabled={loading || !email}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-150 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Mengirim...' : 'Kirim Ulang Link Verifikasi'}
          </button>

          {apiError && <p className="text-sm text-red-500 mt-2">{apiError}</p>}
          {success && <p className="text-sm text-green-600 mt-2">{success}</p>}
        </div>
      ) : (
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-sm border-2 border-black"> 
            <h1 className="text-3xl font-bold text-green-600">Verifikasi Berhasil! 🎉</h1>
            <p className="text-gray-700 mt-4">
                Akun Anda telah dikonfirmasi. Anda dapat melanjutkan ke{' '}
                
                <Link 
                    href="/" 
                    className="text-blue-600 hover:text-blue-800 font-semibold underline transition duration-150"
                >
                    login
                </Link>
                .
            </p>
        </div>
      )}
    </div>
  );
}