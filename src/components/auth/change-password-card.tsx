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

      // mulai countdown
      setCountdown(5);
    } catch (err: any) {
      setCpError(err?.message || 'Gagal mengubah password.');
    } finally {
      setCpLoading(false);
    }
  }

  // Countdown effect
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
    <section className="rounded-xl border border-gray-200 p-4 bg-white shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">
        Ganti Password (Testing)
      </h2>

      <form
        className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end"
        onSubmit={handleChangePassword}
      >
        {/* CURRENT PASSWORD */}
        <div className="flex flex-col">
          <label htmlFor="currentPassword" className="text-sm text-gray-600 mb-1">
            Password Saat Ini
          </label>
          <input
            id="currentPassword"
            type="password"
            className="rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="••••••••"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        {/* NEW PASSWORD */}
        <div className="flex flex-col">
          <label htmlFor="newPassword" className="text-sm text-gray-600 mb-1">
            Password Baru
          </label>
          <input
            id="newPassword"
            type="password"
            className="rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Minimal 8 karakter"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
          />
        </div>

        {/* CONFIRM PASSWORD */}
        <div className="flex flex-col">
          <label htmlFor="confirmPassword" className="text-sm text-gray-600 mb-1">
            Konfirmasi Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            className="rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ulangi password baru"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        {/* BUTTON + MESSAGES */}
        <div className="md:col-span-3 flex items-center gap-3">

          <button
            type="submit"
            disabled={cpLoading || countdown !== null}
            className="inline-flex items-center rounded-md bg-blue-600 text-white px-4 py-2 font-medium hover:bg-blue-700 disabled:opacity-60 cursor-pointer"
          >
            {cpLoading
              ? 'Menyimpan...'
              : countdown !== null
              ? `Redirect ${countdown}s`
              : 'Ubah Password'}
          </button>

          {/* Success Message */}
          {cpMessage && (
            <span className="text-green-600 text-sm">
              {cpMessage}
              {countdown !== null && (
                <> — redirect dalam <b>{countdown}</b> detik</>
              )}
            </span>
          )}

          {/* Error Message */}
          {cpError && (
            <span className="text-red-600 text-sm">{cpError}</span>
          )}
        </div>
      </form>
    </section>
  );
}