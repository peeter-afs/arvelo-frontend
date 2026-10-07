'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AlertCircle, Building2, CheckCircle2, Loader2, Clock } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { demoApi } from '@/lib/api/demo.api';
import { getErrorMessage } from '@/lib/api/client';

const STEP_KEYS = ['steps.bureau', 'steps.clients', 'steps.invoices', 'steps.bank'] as const;

function DemoStart() {
  const t = useTranslations('demo');
  const router = useRouter();
  const searchParams = useSearchParams();
  const expired = searchParams.get('expired') === '1';
  const { setSession, logout } = useAuthStore();

  const [isStarting, setIsStarting] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');

  // Seeding takes 10–30 s; walk through what is being built meanwhile.
  useEffect(() => {
    if (!isStarting) return;
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEP_KEYS.length - 1)), 5000);
    return () => clearInterval(timer);
  }, [isStarting]);

  const start = async () => {
    setError('');
    setStep(0);
    setIsStarting(true);
    try {
      // A previous (possibly expired) session must not ride along.
      logout();
      const session = await demoApi.start();
      setSession(session.user, session.tenant || null, session.role || null, session.access_token, session.refresh_token);
      await new Promise((resolve) => setTimeout(resolve, 100));
      router.push('/clients');
    } catch (err) {
      setError(getErrorMessage(err));
      setIsStarting(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2 [font-family:var(--font-display)]">
        {t('title')}
      </h2>
      <p className="text-slate-600 mb-6">{t('subtitle')}</p>

      {expired && !isStarting && (
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <Clock className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{t('expired')}</span>
        </div>
      )}

      <ul className="mb-6 space-y-2.5 text-sm text-slate-700">
        {(['points.clients', 'points.oneLogin', 'points.safe', 'points.duration'] as const).map((key) => (
          <li key={key} className="flex items-start gap-2.5">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--primary)]" />
            <span>{t(key)}</span>
          </li>
        ))}
      </ul>

      {error && (
        <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <button
        type="button"
        onClick={start}
        disabled={isStarting}
        className="w-full h-12 rounded-lg bg-[var(--primary)] text-white font-medium hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/20 disabled:opacity-70 disabled:cursor-wait transition-all shadow-sm flex items-center justify-center gap-2"
      >
        {isStarting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{t(STEP_KEYS[step])}</span>
          </>
        ) : (
          <>
            <Building2 className="h-4 w-4" />
            <span>{t('start')}</span>
          </>
        )}
      </button>
      {isStarting && <p className="mt-3 text-center text-xs text-slate-500">{t('wait')}</p>}

      <p className="mt-8 text-center text-sm text-slate-600">
        {t('haveAccount')}{' '}
        <Link href="/login" className="font-medium text-[var(--primary)] hover:text-[var(--primary-hover)]">
          {t('signIn')}
        </Link>
      </p>
    </div>
  );
}

export default function DemoPage() {
  return (
    <Suspense fallback={null}>
      <DemoStart />
    </Suspense>
  );
}
