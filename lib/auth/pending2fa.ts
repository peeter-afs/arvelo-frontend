import type { TwoFactorMethod } from '../types/auth.types';

/** Hand-over from /login/link to /login when the account still needs its second factor. */
const KEY = 'arvelo.pending2fa';

export function storePending2fa(token: string, methods: TwoFactorMethod[]) {
  sessionStorage.setItem(KEY, JSON.stringify({ token, methods }));
}

export function takePending2fa(): { token: string; methods: TwoFactorMethod[] } | null {
  const raw = sessionStorage.getItem(KEY);
  if (!raw) return null;
  sessionStorage.removeItem(KEY);
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
