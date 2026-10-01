'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CalendarCheck, ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { monthEndApi, type MonthEndReadiness } from '@/lib/api/monthEnd.api';

/**
 * Dashboard reminder: previous month's period is still open. Renders nothing
 * while loading, on error (e.g. no period exists yet) or once the period is
 * closed.
 */
export function MonthEndBanner() {
  const t = useTranslations('accounting');
  const [readiness, setReadiness] = useState<MonthEndReadiness | null>(null);

  useEffect(() => {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    monthEndApi
      .getReadiness(prev.getFullYear(), prev.getMonth() + 1)
      .then((result) => {
        if (!result.period.is_closed) setReadiness(result);
      })
      .catch(() => {
        /* no period or no access — stay hidden */
      });
  }, []);

  if (!readiness) return null;

  const prevLabel = `${readiness.period.date_end}`.slice(0, 7);

  return (
    <Link
      href="/accounting/month-end"
      className="card mb-3 px-3 py-1.5 sm:px-4 flex items-center justify-between gap-3 hover:opacity-90 transition-opacity"
      style={{ borderColor: 'var(--warning, #ca8a04)', backgroundColor: 'rgba(202, 138, 4, 0.05)' }}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <CalendarCheck className="h-4 w-4 shrink-0" style={{ color: 'var(--warning, #ca8a04)' }} />
        <p className="min-w-0 text-sm leading-5">
          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{t('monthEndBannerTitle', { month: prevLabel })}</span>
          <span className="max-sm:block sm:ml-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span className="max-sm:hidden">· </span>
            {readiness.total > 0
              ? t('monthEndBannerBlockers', { count: readiness.total })
              : t('monthEndBannerReady')}
          </span>
        </p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0" style={{ color: 'var(--text-secondary)' }} />
    </Link>
  );
}
