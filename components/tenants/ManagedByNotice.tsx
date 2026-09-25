'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Building2 } from 'lucide-react';
import { tenantsApi } from '@/lib/api/tenants.api';

/**
 * "Managed by <bureau>" line for a client company. The bureau's name is only
 * known when the user is also a member of the bureau; otherwise the notice
 * stays generic.
 */
export function ManagedByNotice({ bureauId, billing = false }: { bureauId: string; billing?: boolean }) {
  const t = useTranslations('clients');
  const [bureauName, setBureauName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    tenantsApi
      .listUserTenants()
      .then((list) => {
        if (!cancelled) setBureauName(list.find((m) => m.tenant.id === bureauId)?.tenant.name ?? null);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [bureauId]);

  const text = billing
    ? bureauName ? t('billedBy', { bureau: bureauName }) : t('billedByBureau')
    : bureauName ? t('managedBy', { bureau: bureauName }) : t('managedByBureau');

  return (
    <div className="mb-6 flex items-start gap-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] px-4 py-3 text-sm text-[var(--a-text-2)]">
      <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--a-text-3)]" />
      <span>{text}</span>
    </div>
  );
}
