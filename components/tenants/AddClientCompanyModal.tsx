'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, CheckCircle2, Loader2, X } from 'lucide-react';
import { tenantsApi } from '@/lib/api/tenants.api';
import type { Tenant } from '@/lib/types/auth.types';
import { useSwitchTenant } from '@/lib/hooks/useSwitchTenant';
import { Button } from '@/components/ui/Button';
import { NewCompanyForm } from './NewCompanyForm';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called after creation, before the user chooses to open it or stay. */
  onCreated: (tenant: Tenant) => void;
};

export function AddClientCompanyModal({ open, onClose, onCreated }: Props) {
  const t = useTranslations('clients');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [created, setCreated] = useState<Tenant | null>(null);
  const { switchTenant, switchingId, error: switchError } = useSwitchTenant();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      onCancel={onClose}
      className="fixed inset-0 z-50 m-0 h-full w-full max-h-full max-w-full bg-transparent p-0 backdrop:bg-black/40 backdrop:backdrop-blur-sm open:flex open:items-end open:justify-center sm:open:items-center sm:p-4"
    >
      <div className="flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-[var(--a-border)] bg-[var(--a-surface)] shadow-xl sm:max-h-[88vh] sm:max-w-[640px] sm:rounded-2xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-[var(--a-border)] px-6 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-[var(--a-text)]">{t('addCompany')}</h2>
            <p className="mt-0.5 text-[12.5px] text-[var(--a-text-2)]">{t('billingNote')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--a-text-3)] hover:bg-[var(--a-surface-2)] hover:text-[var(--a-text)]"
            aria-label={t('cancel')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {created ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--a-pos)]" />
                <div>
                  <div className="text-[14px] font-semibold text-[var(--a-text)]">{t('createdTitle', { name: created.name })}</div>
                  <p className="mt-1 text-[12.5px] text-[var(--a-text-2)]">{t('createdBody')}</p>
                </div>
              </div>
              {switchError && <p className="text-[12.5px] text-[var(--a-neg)]">{switchError}</p>}
              <div className="flex justify-end gap-2">
                <Button onClick={onClose} disabled={!!switchingId}>{t('stayInBureau')}</Button>
                <Button variant="primary" onClick={() => void switchTenant(created, 'owner')} disabled={!!switchingId}>
                  {switchingId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                  {t('openNow')}
                </Button>
              </div>
            </div>
          ) : (
            <NewCompanyForm
              submitLabel={t('create')}
              onCancel={onClose}
              onSubmit={async (payload) => {
                const tenant = await tenantsApi.createManaged(payload);
                setCreated(tenant);
                onCreated(tenant);
              }}
            />
          )}
        </div>
      </div>
    </dialog>
  );
}
