import axios from 'axios';
import { createSupabaseBrowserClient } from '@/utils/supabase/browser';

let _sb: ReturnType<typeof createSupabaseBrowserClient> | null = null;

export function getSb() {
  if (typeof window === 'undefined') return null;
  if (_sb) return _sb;
  _sb = createSupabaseBrowserClient();
  return _sb;
}

function shouldAttachAuth(url?: string) {
  if (!url) return false;
  try {
    if (url.startsWith('/')) return true;

    const reqUrl = new URL(url);
    const base = process.env.NEXT_PUBLIC_BASE_URL || '';
    if (!base) {
      return false;
    }
    const baseUrl = new URL(base, window?.location?.origin);
    return reqUrl.origin === baseUrl.origin;
  } catch {
    return false;
  }
}

export const http = axios.create({
  withCredentials: false,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

// === Request: inject Bearer token Supabase (browser only) ===
http.interceptors.request.use(async (config) => {
  try {
    const sb = getSb();
    if (sb && shouldAttachAuth(config.url)) {
      const { data: { session } } = await sb.auth.getSession();
      const token = session?.access_token;
      if (token) {
        config.headers = config.headers ?? {};
        (config.headers as any).Authorization = `Bearer ${token}`;
      }
    }
  } catch (err) {
    console.warn('Gagal mengambil token Supabase:', err);
  }
  return config;
});

// === Response: tangani 401 (session habis) ===
http.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err?.response?.status;
    if (status === 401) {
      const sb = getSb();
      if (sb) {
        try {
          const { data: { session } } = await sb.auth.getSession();
          if (!session) {
            await sb.auth.signOut();

            if (typeof window !== 'undefined') {
              const path = window.location.pathname;
              const onAuthPage =
                path.startsWith('/login') ||
                path.startsWith('/register') ||
                path.startsWith('/auth/confirmed');
              if (!onAuthPage) window.location.href = '/login';
            }
          }
        } catch (e) {
          console.warn('Error saat menangani 401:', e);
        }
      }
    }
    return Promise.reject(err);
  }
);
