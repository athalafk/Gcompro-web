import { http } from '@/lib/http';
import { joinApi } from '@/lib/url';
import type { MyProfile, ChangePasswordPayload, ChangePasswordResult } from '@/models/types/auth/auth';

import { createSupabaseBrowserClient } from '@/utils/supabase/browser';

let _sb: ReturnType<typeof createSupabaseBrowserClient> | null = null;

export function getSb() {
  if (typeof window === 'undefined') return null;
  if (_sb) return _sb;
  _sb = createSupabaseBrowserClient();
  return _sb;
}

// --- Login user (NIM + password) ---
export async function loginWithNim(nim: string, password: string) {
  try {
    const res = await http.post(joinApi('/auth/login'), { nim, password });
    return res.data as { role: string; error?: string; message?: string };
  } catch (err: any) {
    const apiErr = err?.response?.data?.error || err?.message || 'Login failed';
    return { error: String(apiErr) } as { error: string };
  }
}

// --- Get current profile (GET) ---
export async function getMyProfile(signal?: AbortSignal): Promise<MyProfile | null> {
  try {
    const res = await http.get<MyProfile>(joinApi('/profile'), { signal });
    return res.data ?? null;
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 401 || status === 404) return null;
    console.warn('getMyProfile error:', err?.message ?? err);
    return null;
  }
}

// --- Logout user ---
export async function logout(signal?: AbortSignal): Promise<void> {
  try {
    await http.post(joinApi('/auth/logout'), {}, { signal });
  } catch (err: any) {
    const status = err?.response?.status;
    if (status && status !== 401) {
      console.warn('logout API error:', err?.message ?? err);
    }
  } finally {
    const sb = await getSb();
    try {
      await sb?.auth.signOut();
    } catch (err: any) {
      console.warn('logout Supabase error:', err?.message ?? err);
    }
  }
}

// --- Change password user ---
export async function changePassword(body: ChangePasswordPayload, signal?: AbortSignal): Promise<ChangePasswordResult> {
  try {
    await http.post(joinApi('/auth/change-password'), body, { signal });

    // kalau sukses → logout
    await http.post(joinApi('/auth/logout'));

    return {
      ok: true,
      message: 'Password berhasil diubah. Silakan login ulang.'
    };
  } catch (err: any) {
    const apiErr =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      err?.message ||
      'Gagal mengubah password';
    return { ok: false, error: String(apiErr) };
  }
}
