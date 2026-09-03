'use client';

import { useTranslations } from 'next-intl';

/**
 * "Jääk 0.00" — the running difference between what a bank transaction is worth
 * and what the user has allocated so far. Shared by the account split and the
 * multi-invoice selection, which both refuse to commit until it reaches zero.
 */
export function RemainderBadge({ remainder, tolerance = 0.005 }: { remainder: number; tolerance?: number }) {
  const t = useTranslations('accounting');
  const settled = Math.abs(remainder) <= tolerance;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11.5px] font-medium ${
        settled ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'
      }`}
    >
      {t('splitRemainder')}
      <span className="font-mono font-semibold tabular-nums">{(settled ? 0 : remainder).toFixed(2)}</span>
    </span>
  );
}
