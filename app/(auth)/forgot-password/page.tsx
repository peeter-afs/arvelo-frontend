'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { authApi } from '@/lib/api/auth.api';
import { getErrorMessage } from '@/lib/api/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      await authApi.forgotPassword(email);
      setSuccessMessage('If the account exists, a reset link has been sent to that email address.');
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Forgot your password?</h1>
        <p className="mt-1 text-sm text-slate-500">
          Enter your account email and we will send you a reset link.
        </p>
      </div>

      {successMessage && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border-l-4 border-emerald-500 bg-emerald-50 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" />
          <div>
            <p className="text-sm font-medium text-emerald-900">Reset email sent</p>
            <p className="mt-0.5 text-sm text-emerald-700">{successMessage}</p>
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
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            disabled={isLoading}
            placeholder="you@example.com"
            className="h-11 w-full rounded-lg border border-slate-200 px-4 transition-all focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/10 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ fontSize: '16px' }}
          />
          <p className="mt-1.5 text-xs text-slate-500">
            The reset link expires in 1 hour.
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary)] font-medium text-white transition-all hover:bg-[var(--primary-hover)] hover:shadow-lg hover:shadow-[var(--primary)]/25 focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/20 disabled:cursor-not-allowed disabled:opacity-50 sm:h-12"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Sending reset link...</span>
            </>
          ) : (
            <>
              <Mail className="h-4 w-4" />
              <span>Send reset link</span>
            </>
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600">
        Remembered it?{' '}
        <Link
          href="/login"
          className="font-medium text-[var(--primary)] transition-colors hover:text-[var(--primary-hover)]"
        >
          Back to login
        </Link>
      </p>
    </div>
  );
}
