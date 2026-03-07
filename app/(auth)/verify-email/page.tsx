'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api/auth.api';
import { getErrorMessage } from '@/lib/api/client';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isVerifying, setIsVerifying] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (!token) {
      setError('Verification token is missing');
      setIsVerifying(false);
      return;
    }

    verifyEmail();
  }, [token]);

  useEffect(() => {
    if (isVerified && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isVerified && countdown === 0) {
      router.push('/login?verified=true');
    }
  }, [isVerified, countdown, router]);

  const verifyEmail = async () => {
    try {
      await authApi.verifyEmail(token!);
      setIsVerified(true);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsVerifying(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="text-center min-h-[calc(100vh-240px)] flex flex-col items-center justify-center">
        <div className="mb-6">
          {/* Pulsing ring loader */}
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-[var(--primary)]/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[var(--primary)] animate-spin"></div>
            <div className="absolute inset-2 rounded-full bg-[var(--primary)]/10 animate-pulse"></div>
          </div>
        </div>
        <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 mb-2">
          Verifying your email...
        </h2>
        <p className="text-sm text-slate-500">
          Please wait while we verify your email address.
        </p>
      </div>
    );
  }

  if (isVerified) {
    return (
      <div className="text-center min-h-[calc(100vh-240px)] flex flex-col items-center justify-center animate-scale-fade-in">
        <div className="mb-6">
          <CheckCircle2 className="h-14 w-14 sm:h-16 sm:w-16 text-emerald-500 mx-auto" strokeWidth={1.5} />
        </div>
        <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 mb-2">
          Email Verified!
        </h2>
        <p className="text-sm text-slate-600 mb-6 max-w-md">
          Your email has been successfully verified. You can now log in to your account.
        </p>
        <p className="text-sm text-slate-500">
          Redirecting in {countdown}s...
        </p>
      </div>
    );
  }

  return (
    <div className="text-center min-h-[calc(100vh-240px)] flex flex-col items-center justify-center">
      <div className="mb-6">
        <XCircle className="h-14 w-14 sm:h-16 sm:w-16 text-red-500 mx-auto" strokeWidth={1.5} />
      </div>
      <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 mb-2">
        Verification Failed
      </h2>
      <p className="text-sm text-slate-600 mb-8 max-w-md">
        {error}
      </p>
      <div className="space-y-3 w-full max-w-sm">
        <Link
          href="/resend-verification"
          className="block w-full h-11 sm:h-12 rounded-lg bg-[var(--primary)] text-white font-medium hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/20 transition-all shadow-sm hover:shadow-lg hover:shadow-[var(--primary)]/25 flex items-center justify-center"
        >
          Resend Verification Email
        </Link>
        <Link
          href="/login"
          className="block w-full h-11 sm:h-12 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-200 transition-all flex items-center justify-center"
        >
          Back to Login
        </Link>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center min-h-[calc(100vh-240px)] flex flex-col items-center justify-center">
          <div className="animate-pulse">
            <div className="h-16 w-16 bg-slate-200 rounded-full mx-auto mb-6"></div>
            <div className="h-8 bg-slate-200 rounded w-3/4 mx-auto mb-2"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      }
    >
      <VerifyEmailContent />
      <style jsx>{`
        @keyframes scaleFadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-scale-fade-in {
          animation: scaleFadeIn 400ms ease-out;
        }
      `}</style>
    </Suspense>
  );
}
