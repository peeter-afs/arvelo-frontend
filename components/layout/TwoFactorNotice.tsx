'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ShieldAlert } from 'lucide-react';
import { tenantSecurityApi, type TwoFactorUserStatus } from '@/lib/api/tenantSecurity.api';

/**
 * Warns during the grace period, so the requirement never arrives as a
 * surprise lockout. Silent once the user has 2FA, or when their tenant
 * doesn't require it.
 */
export function TwoFactorNotice() {
  const t = useTranslations('twoFactor');
  const pathname = usePathname();
  const [status, setStatus] = useState<TwoFactorUserStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    tenantSecurityApi
      .getMyStatus()
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        // A failed status check must never block the app.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!status || !status.required || status.satisfied) return null;
  if (pathname?.endsWith('/settings/security')) return null;

  const deadline = status.deadline ? new Date(status.deadline).toLocaleDateString() : null;

  return (
    <div
      className="mt-3 flex items-center gap-3 rounded-lg px-4 py-3 text-sm"
      style={{ backgroundColor: 'var(--a-warn-soft, #fef3c7)', color: 'var(--a-warn, #b45309)' }}
    >
      <ShieldAlert className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1">
        {status.blocked || !deadline ? t('noticeBlocked') : t('noticeGrace', { date: deadline })}
      </span>
      <Link href="/settings/security" className="font-semibold underline">
        {t('noticeAction')}
      </Link>
    </div>
  );
}
