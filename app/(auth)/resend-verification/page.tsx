'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authApi } from '@/lib/api/auth.api';
import { getErrorMessage } from '@/lib/api/client';
import { Loader2, Mail, AlertCircle, CheckCircle } from 'lucide-react';

export default function ResendVerificationPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setIsLoading(true);

    try {
      await authApi.resendVerification(email);
      setSuccess(true);
      setEmail('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">
          Resend Verification Email
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          We'll send you a new verification link
        </p>
      </div>

      {/* Success Alert */}
      {success && (
        <div className="mb-6 rounded-lg border-l-4 border-emerald-500 bg-emerald-50 p-4 flex items-start gap-3">
          <div className="flex-shrink-0">
            <Mail className="h-5 w-5 text-emerald-500 mt-0.5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-emerald-900">
              Verification email sent!
            </p>
            <p className="text-sm text-emerald-700 mt-0.5">
              Please check your inbox and click the verification link.
            </p>
            <p className="text-xs text-emerald-600 mt-2">
              Didn't receive it? Check your spam folder
            </p>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mb-6 rounded-lg border-l-4 border-red-500 bg-red-50 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-red-900">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full h-11 px-4 border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="you@example.com"
            disabled={isLoading}
            style={{ fontSize: '16px' }}
          />
          <p className="mt-1.5 text-xs text-slate-500">
            Enter the email address you used to register.
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 sm:h-12 rounded-lg bg-[var(--primary)] text-white font-medium hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-lg hover:shadow-[var(--primary)]/25 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Sending...</span>
            </>
          ) : (
            'Resend Verification Email'
          )}
        </button>
      </form>

      {/* Back to Login Link */}
      <p className="mt-6 text-center text-sm text-slate-600 pb-8">
        <Link
          href="/login"
          className="font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors"
        >
          Back to Login
        </Link>
      </p>
    </div>
  );
}
