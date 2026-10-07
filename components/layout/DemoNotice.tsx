'use client';

import { useEffect, useState } from 'react';
import { getErrorMessage } from '@/lib/api/client';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { FlaskConical } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth.store';
import { demoApi } from '@/lib/api/demo.api';

const DEMO_DOMAIN = '@demo.arvelo.ee';

/** Tells a sandbox visitor what they are in: sample data, nothing sent out, and when it ends. */
export function DemoNotice() {
  const t = useTranslations('demo');
  const email = useAuthStore((s) => s.user?.email);
  const isDemo = Boolean(email?.toLowerCase().endsWith(DEMO_DOMAIN));
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [ending, setEnding] = useState(false);
  const logout = useAuthStore((s) => s.logout);

  const endDemo = async () => {
    if (!window.confirm(t('endConfirm'))) return;
    setEnding(true);
    try {
      await demoApi.end();
      logout();
      window.location.href = '/demo?ended=1';
    } catch (err) {
      window.alert(getErrorMessage(err));
      setEnding(false);
    }
  };

  useEffect(() => {
    if (!isDemo) return;
    let cancelled = false;
    demoApi
      .status()
      .then((data) => {
        if (!cancelled) setExpiresAt(data.expires_at || null);
      })
      .catch(() => {
        // The banner is informative only.
      });
    return () => {
      cancelled = true;
    };
  }, [isDemo]);

  if (!isDemo) return null;

  return (
    <div
      className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-3 py-2.5 text-sm sm:flex-nowrap sm:px-4 sm:py-3"
      style={{ backgroundColor: 'var(--a-info-soft, #e0f2fe)', color: 'var(--a-info, #0369a1)' }}
    >
      <FlaskConical className="h-4 w-4 flex-shrink-0" />
      <span className="min-w-0 flex-1">
        {expiresAt
          ? t('banner', { date: new Date(expiresAt).toLocaleDateString('et-EE') })
          : t('bannerNoDate')}
      </span>
      <Link href="/accounting/migration" className="shrink-0 font-semibold underline max-sm:ml-7 max-sm:py-1">
        {t('tryMigration')}
      </Link>
      <button type="button" onClick={() => void endDemo()} disabled={ending} className="shrink-0 underline opacity-80 hover:opacity-100 disabled:opacity-50 max-sm:py-1">
        {t('end')}
      </button>
    </div>
  );
}
