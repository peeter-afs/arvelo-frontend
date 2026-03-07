'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/stores/auth.store';
import { authApi } from '@/lib/api/auth.api';
import { getErrorMessage } from '@/lib/api/client';

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

      console.log('Login response:', {
        hasUser: !!session.user,
        hasTenant: !!session.tenant,
        hasTokens: !!(session.access_token && session.refresh_token)
      });

      setSession(
        session.user,
        session.tenant || null,
        session.role || null,
        session.access_token,
        session.refresh_token
      );

      console.log('Session set, checking localStorage...');

      // Wait a bit for zustand persist to save to localStorage
      await new Promise(resolve => setTimeout(resolve, 100));

      const authStorage = localStorage.getItem('auth-storage');
      console.log('LocalStorage auth-storage:', authStorage);

      // Parse and log the stored state
      if (authStorage) {
        try {
          const parsed = JSON.parse(authStorage);
          console.log('Parsed auth state:', {
            isAuthenticated: parsed.state?.isAuthenticated,
            hasUser: !!parsed.state?.user,
            hasTenant: !!parsed.state?.tenant
          });
        } catch (e) {
          console.error('Failed to parse auth storage:', e);
        }
      } else {
        console.error('❌ AUTH STORAGE IS NULL - NOT PERSISTING!');
      }

      // Wait longer to see logs
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Redirect to return URL or dashboard
      console.log('Redirecting to:', returnUrl);
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
    <div className="bg-white shadow-xl rounded-lg p-8">
      <h2 className="text-2xl font-semibold text-gray-900 mb-6">Sign in to your account</h2>

      {verified && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded">
          Your email has been verified! You can now log in.
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
          {showVerificationError && (
            <div className="mt-2">
              <Link
                href="/resend-verification"
                className="text-sm font-medium underline hover:no-underline"
              >
                Resend verification email
              </Link>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="you@example.com"
            disabled={isLoading}
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your password"
            disabled={isLoading}
          />
        </div>

        <div className="flex items-center justify-between">
          <Link
            href="/reset-password"
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            Forgot your password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          Don't have an account?{' '}
          <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500">
            Sign up
          </Link>
        </p>
      </div>

      <div className="mt-6 border-t pt-6">
        <p className="text-xs text-gray-500 text-center">
          Demo credentials:<br />
          Email: demo@arvelo.ee<br />
          Password: demo123
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="bg-white shadow-xl rounded-lg p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}