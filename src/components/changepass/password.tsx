'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { changePassword } from '@/services/auth';

export default function ChangePasswordCard() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [cpLoading, setCpLoading] = useState(false);
  const [cpMessage, setCpMessage] = useState<string | null>(null);
  const [cpError, setCpError] = useState<string | null>(null);

  const [countdown, setCountdown] = useState<number | null>(null);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setCpError('Konfirmasi password tidak cocok.');
      setCpMessage(null);
      return;
       }

    setCpLoading(true);
    setCpError(null);
    setCpMessage(null);
    setCountdown(null);

    try {
      const result = await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      if (result?.ok === false) {
        setCpError(result.error || 'Gagal mengubah password.');
        return;
      }

      setCpMessage(result.message || 'Password berhasil diubah.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setCountdown(5);
    } catch (err: any) {
      setCpError(err?.message || 'Gagal mengubah password.');
    } finally {
      setCpLoading(false);
    }
  }

  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 0) {
      router.push('/login');
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, router]);

  return (
    <section className="w-full p-8 animate-fadeIn relative">

      <button
        onClick={() => router.back()}
        className="absolute top-4 left-4 flex items-center gap-2 
                   text-[#022B55] hover:text-[#001F3D] font-medium 
                   bg-white border border-gray-300 px-4 py-2 rounded-xl shadow-sm
                   hover:bg-gray-50 transition z-50"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Kembali
      </button>

      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow p-10 relative mt-16">

        <h2 className="text-2xl font-bold text-gray-900 mb-8">
          Ubah Password
        </h2>

        <form className="flex flex-col gap-6" onSubmit={handleChangePassword}>

          {/* PASSWORD SAAT INI - DITAMBAHKAN */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Password Saat Ini
            </label>
            <input
              type="password"
              placeholder="Masukkan password saat ini"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 bg-white 
                focus:ring-2 focus:ring-blue-500 outline-none transition"
            />
          </div>

          {/* PASSWORD BARU */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Password Baru
            </label>
            <input
              type="password"
              placeholder="Minimal 8 karakter"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 bg-white 
                focus:ring-2 focus:ring-blue-500 outline-none transition"
            />
          </div>

          {/* KONFIRMASI PASSWORD */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Konfirmasi Password
            </label>
            <input
              type="password"
              placeholder="Ulangi password baru"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 bg-white 
                focus:ring-2 focus:ring-blue-500 outline-none transition"
            />
          </div>

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={cpLoading || countdown !== null}
            className="w-full bg-[#022B55] text-white py-3 rounded-xl font-semibold 
              hover:bg-[#001F3D] transition disabled:opacity-50"
          >
            {cpLoading
              ? 'Menyimpan...'
              : countdown !== null
              ? `Redirect ${countdown}s`
              : 'Ubah Password'}
          </button>

          {/* SUCCESS */}
          {cpMessage && (
            <p className="text-green-600 text-sm font-medium">
              {cpMessage}
              {countdown !== null && (
                <> — redirect dalam <b>{countdown}</b> detik</>
              )}
            </p>
          )}

          {/* ERROR */}
          {cpError && (
            <p className="text-red-600 text-sm font-medium">{cpError}</p>
          )}

        </form>
      </div>
    </section>
  );
}