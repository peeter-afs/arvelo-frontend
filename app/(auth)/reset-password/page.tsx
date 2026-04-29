'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AlertCircle, CheckCircle2, Loader2, LockKeyhole } from 'lucide-react';
import { authApi } from '@/lib/api/auth.api';
import { getErrorMessage } from '@/lib/api/client';

function ResetPasswordContent() {
  const t = useTranslations('auth');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (!successMessage || countdown <= 0) {
      if (successMessage && countdown === 0) {
        router.push('/login');
      }
      return;
    }

    const timer = setTimeout(() => setCountdown((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, router, successMessage]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage('');

    if (!token) {
      setErrorMessage(t('errors.resetTokenMissing'));
      return;
    }

    if (password.length < 8) {
      setErrorMessage(t('errors.passwordMinLengthWithPeriod'));
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(t('errors.passwordMismatchWithPeriod'));
      return;
    }

    setIsLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setSuccessMessage(t('resetPasswordSuccessMessage'));
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  if (!token && !successMessage) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">{t('resetPasswordTitle')}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {t('resetPasswordMissingTokenSubtitle')}
          </p>
        </div>

        <div className="mb-6 flex items-start gap-3 rounded-lg border-l-4 border-amber-500 bg-amber-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-medium text-amber-900">{t('resetPasswordMissingTokenTitle')}</p>
            <p className="mt-0.5 text-sm text-amber-700">
              {t('resetPasswordMissingTokenDescription')}
            </p>
          </div>
        </div>

        <Link
          href="/forgot-password"
          className="flex h-11 w-full items-center justify-center rounded-lg bg-[var(--primary)] font-medium text-white transition-all hover:bg-[var(--primary-hover)] sm:h-12"
        >
          {t('requestNewResetLink')}
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">{t('setNewPasswordTitle')}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {t('setNewPasswordSubtitle')}
        </p>
      </div>

      {successMessage && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border-l-4 border-emerald-500 bg-emerald-50 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" />
          <div>
            <p className="text-sm font-medium text-emerald-900">{t('passwordUpdatedTitle')}</p>
            <p className="mt-0.5 text-sm text-emerald-700">{successMessage}</p>
            <p className="mt-2 text-xs text-emerald-600">{t('redirectingIn', { countdown })}</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border-l-4 border-red-500 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
          <p className="text-sm font-medium text-red-900">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
            {t('newPassword')}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={isLoading || !!successMessage}
            placeholder={t('passwordPlaceholder')}
            className="h-11 w-full rounded-lg border border-slate-200 px-4 transition-all focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/10 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ fontSize: '16px' }}
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-slate-700">
            {t('confirmNewPassword')}
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            disabled={isLoading || !!successMessage}
            placeholder={t('confirmPasswordPlaceholder')}
            className="h-11 w-full rounded-lg border border-slate-200 px-4 transition-all focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/10 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ fontSize: '16px' }}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !!successMessage}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] font-medium text-white transition-all hover:bg-[var(--primary-hover)] hover:shadow-lg hover:shadow-[var(--primary)]/25 focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:opacity-50 sm:h-12"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t('updatingPassword')}</span>
            </>
          ) : (
            <>
              <LockKeyhole className="h-4 w-4" />
              <span>{t('saveNewPassword')}</span>
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        <Link
          href="/login"
          className="font-medium text-[var(--primary)] transition-colors hover:text-[var(--primary-hover)]"
        >
          {t('backToLogin')}
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse">
          <div className="mb-2 h-8 w-3/4 rounded bg-slate-200" />
          <div className="mb-8 h-4 w-1/2 rounded bg-slate-200" />
          <div className="space-y-5">
            <div className="h-11 rounded bg-slate-200" />
            <div className="h-11 rounded bg-slate-200" />
            <div className="h-12 rounded bg-slate-200" />
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
