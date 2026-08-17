'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { SYSTEM_ROLES } from '@/lib/constants/systemRoles';
import type { AccountOption } from '@/lib/api/accounting.api';
import { getErrorMessage } from '@/lib/api/client';

type ApplyResult = { remapped: string[]; removed: string[]; kept_with_warning: string[] };

type RoleMappingDialogProps = {
  open: boolean;
  accounts: AccountOption[];
  onApply: (mapping: Record<string, { account_id: string }>) => Promise<ApplyResult>;
  onClose: () => void;
};

const normalize = (value: string) => value.toLowerCase();

export function RoleMappingDialog({ open, accounts, onApply, onClose }: RoleMappingDialogProps) {
  const t = useTranslations('accounting');
  // Only the user's own (non-system) accounts are valid mapping targets.
  const targets = useMemo(() => accounts.filter((account) => !account.system_code), [accounts]);

  const [selection, setSelection] = useState<Record<string, string>>({});
  const [skipped, setSkipped] = useState<Record<string, boolean>>({});
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApplyResult | null>(null);

  // Auto-suggest each role's target: exact default code first, then a name hint.
  useEffect(() => {
    if (!open) return;
    const next: Record<string, string> = {};
    for (const role of SYSTEM_ROLES) {
      const byCode = targets.find((a) => a.code === role.defaultCode);
      const byName = targets.find((a) => role.nameHints.some((hint) => normalize(a.name).includes(hint)));
      next[role.setting_key] = byCode?.id || byName?.id || '';
    }
    setSelection(next);
    setSkipped({});
    setResult(null);
    setError(null);
  }, [open, targets]);

  if (!open) return null;

  const handleApply = async () => {
    setApplying(true);
    setError(null);
    try {
      const mapping: Record<string, { account_id: string }> = {};
      for (const role of SYSTEM_ROLES) {
        const id = selection[role.setting_key];
        if (!skipped[role.setting_key] && id) {
          mapping[role.setting_key] = { account_id: id };
        }
      }
      const res = await onApply(mapping);
      setResult(res);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={result ? onClose : undefined} />
      <div className="relative z-10 w-full max-w-2xl rounded-xl bg-[var(--surface,white)] p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">{t('roleMappingTitle')}</h2>
        <p className="mt-1 text-sm text-slate-500">{t('roleMappingDescription')}</p>

        {result ? (
          <div className="mt-4 space-y-3 text-sm">
            <p className="text-emerald-700">{t('roleMappingRemapped', { count: result.remapped.length })}</p>
            {result.removed.length > 0 && (
              <p className="text-slate-600">{t('roleMappingRemoved', { items: result.removed.join(', ') })}</p>
            )}
            {result.kept_with_warning.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-800">
                {t('roleMappingKept', { items: result.kept_with_warning.join('; ') })}
              </div>
            )}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="h-10 rounded-lg bg-[var(--primary)] px-5 text-sm font-medium text-white hover:bg-[var(--primary-hover)]"
              >
                {t('close')}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-4 max-h-[50vh] space-y-3 overflow-y-auto pr-1">
              {SYSTEM_ROLES.map((role) => {
                const isSkipped = !!skipped[role.setting_key];
                return (
                  <div key={role.system_code} className="grid grid-cols-[140px_1fr_auto] items-center gap-3">
                    <span className="text-sm font-medium text-slate-700">{t(`role_${role.system_code}`)}</span>
                    <select
                      value={selection[role.setting_key] || ''}
                      disabled={isSkipped}
                      onChange={(event) =>
                        setSelection((current) => ({ ...current, [role.setting_key]: event.target.value }))
                      }
                      className="h-10 w-full rounded-lg border border-slate-200 px-3 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <option value="">{t('selectAccount')}</option>
                      {targets.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.code} · {account.name}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1.5 text-xs text-slate-500">
                      <input
                        type="checkbox"
                        checked={isSkipped}
                        onChange={(event) =>
                          setSkipped((current) => ({ ...current, [role.setting_key]: event.target.checked }))
                        }
                      />
                      {t('roleMappingSkipRole')}
                    </label>
                  </div>
                );
              })}
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                {t('roleMappingSkip')}
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={applying}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--primary)] px-5 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-50"
              >
                {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t('roleMappingApply')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
