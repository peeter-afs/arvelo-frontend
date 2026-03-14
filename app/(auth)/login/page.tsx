'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/auth.store';
import { authApi } from '@/lib/api/auth.api';
import { getErrorMessage } from '@/lib/api/client';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/';
  const verified = searchParams.get('verified');

  const { setSession } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showVerificationError, setShowVerificationError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShowVerificationError(false);
    setIsLoading(true);

    try {
      const session = await authApi.login({ email, password });

      setSession(
        session.user,
        session.tenant || null,
        session.role || null,
        session.access_token,
        session.refresh_token
      );

      // Wait for zustand persist to save to localStorage
      await new Promise(resolve => setTimeout(resolve, 100));

      // Redirect to return URL or dashboard
      router.push(returnUrl);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);

      // Check if error is about email verification
      if (errorMsg.toLowerCase().includes('verify your email')) {
        setShowVerificationError(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Heading */}
      <div className="mb-8">
        <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">
          Welcome back
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Sign in to continue
        </p>
      </div>

      {/* Success Alert - Email Verified */}
      {verified && (
        <div className="mb-6 rounded-lg border-l-4 border-emerald-500 bg-emerald-50 p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-emerald-900">
              Email verified successfully
            </p>
            <p className="text-sm text-emerald-700 mt-0.5">
              You can now log in to your account.
            </p>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mb-6 rounded-lg border-l-4 border-red-500 bg-red-50 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">
              {error}
            </p>
            {showVerificationError && (
              <Link
                href="/resend-verification"
                className="text-sm font-medium text-red-700 underline hover:no-underline mt-2 inline-block"
              >
                Resend verification email
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Login Form */}
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
            style={{ fontSize: '16px' }} // Prevent iOS zoom
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-sm text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full h-11 px-4 border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Enter your password"
            disabled={isLoading}
            style={{ fontSize: '16px' }} // Prevent iOS zoom
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 sm:h-12 rounded-lg bg-[var(--primary)] text-white font-medium hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-lg hover:shadow-[var(--primary)]/25 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Signing in...</span>
            </>
          ) : (
            'Sign in'
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200"></div>
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-2 bg-[var(--surface-elevated)] text-slate-400">
            or
          </span>
        </div>
      </div>

      {/* Sign Up Link */}
      <p className="text-center text-sm text-slate-600 pb-8">
        Don't have an account?{' '}
        <Link
          href="/register"
          className="font-medium text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2 mb-8"></div>
          <div className="space-y-5">
            <div>
              <div className="h-4 bg-slate-200 rounded w-24 mb-2"></div>
              <div className="h-11 bg-slate-200 rounded"></div>
            </div>
            <div>
              <div className="h-4 bg-slate-200 rounded w-20 mb-2"></div>
              <div className="h-11 bg-slate-200 rounded"></div>
            </div>
            <div className="h-12 bg-slate-200 rounded"></div>
          </div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
