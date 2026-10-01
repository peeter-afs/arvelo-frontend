'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertCircle, Loader2, Mail } from 'lucide-react';
import { authApi } from '@/lib/api/auth.api';
import { getErrorMessage } from '@/lib/api/client';
import { storePending2fa } from '@/lib/auth/pending2fa';
import { useAuthStore } from '@/lib/stores/auth.store';

/** Landing page of the e-mailed sign-in link: signs in, or offers a new link when it has expired. */
function LoginLinkContent() {
  const t = useTranslations('auth');
  const router = useRouter();
  const token = useSearchParams().get('token');
  const { setSession } = useAuthStore();
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    // The link is single-use: never verify it twice (React strict mode runs effects twice in dev)
    if (started.current) return;
    started.current = true;
    if (!token) {
      setError(t('loginLink.invalid'));
      return;
    }
    authApi
      .verifyLoginLink(token)
      .then((session) => {
        if (session.requires_2fa && session.two_factor_token) {
          storePending2fa(session.two_factor_token, session.two_factor_methods || ['email']);
          router.replace('/login');
          return;
        }
        setSession(session.user, session.tenant || null, session.role || null, session.access_token, session.refresh_token);
        router.replace(session.role === 'employee' ? '/minu' : '/');
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, [router, setSession, t, token]);

  const sendNew = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true);
    try {
      await authApi.requestLoginLink(email.trim());
      setSent(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  if (!error) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-sm text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        {t('loginLink.signingIn')}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">{t('loginLink.expiredTitle')}</h1>
      </div>
      <div className="mb-6 flex items-start gap-3 rounded-lg border-l-4 border-amber-500 bg-amber-50 p-4">
        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
        <p className="text-sm text-amber-800">{error}</p>
      </div>
      {sent ? (
        <div className="mb-6 flex items-start gap-3 rounded-lg border-l-4 border-emerald-500 bg-emerald-50 p-4">
          <Mail className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" />
          <div>
            <p className="text-sm font-medium text-emerald-900">{t('loginLink.sentTitle')}</p>
            <p className="mt-0.5 text-sm text-emerald-700">{t('loginLink.sentDescription', { email: email.trim() })}</p>
          </div>
        </div>
      ) : (
        <form onSubmit={sendNew} className="space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">{t('emailAddress')}</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="h-11 w-full rounded-lg border border-slate-200 px-4 focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/10"
              placeholder="you@example.com"
              style={{ fontSize: '16px' }}
            />
          </label>
          <button
            type="submit"
            disabled={sending || !email.trim()}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-50 sm:h-12"
          >
            {sending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('loginLink.sendNew')}
          </button>
        </form>
      )}
      <Link href="/login" className="mt-4 block py-2 text-center text-sm text-slate-500 hover:text-slate-700">
        {t('backToLogin')}
      </Link>
    </div>
  );
}

export default function LoginLinkPage() {
  return (
    <Suspense fallback={null}>
      <LoginLinkContent />
    </Suspense>
  );
}
