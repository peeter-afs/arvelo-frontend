'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { SYSTEM_ROLES, type SystemRoleSettingKey } from '@/lib/constants/systemRoles';
import { accountingApi, type AccountOption } from '@/lib/api/accounting.api';
import { getErrorMessage } from '@/lib/api/client';

type Props = {
  accounts: AccountOption[];
  onDone?: () => void;
  onSkip?: () => void;
};

const normalize = (value: string) => value.toLowerCase();

/**
 * Hints a role can veto: "Sisendkäibemaks" contains "käibemaks" and would
 * otherwise be suggested as the OUTPUT VAT account — the exact mix-up that
 * silently left invoices unposted.
 */
const EXCLUDE_HINTS: Partial<Record<SystemRoleSettingKey, string[]>> = {
  vat_output_account_id: ['sisend', 'input'],
  vat_input_account_id: ['müügi', 'output'],
};

/** Picks a role's account out of the imported chart: exact default code first,
 *  then the first name hint that matches a non-vetoed account. */
function suggestFor(roleKey: SystemRoleSettingKey, defaultCode: string, hints: string[], targets: AccountOption[]) {
  const byCode = targets.find((account) => account.code === defaultCode);
  if (byCode) return byCode.id;

  const excluded = EXCLUDE_HINTS[roleKey] || [];
  const allowed = targets.filter((account) => !excluded.some((bad) => normalize(account.name).includes(bad)));
  for (const hint of hints) {
    const match = allowed.find((account) => normalize(account.name).includes(hint));
    if (match) return match.id;
  }
  return '';
}

/**
 * Opening-balance import step that binds the system roles (AR, AP, VAT, ...) to
 * the freshly imported chart of accounts. Rendered inline as its own step rather
 * than a dialog: an unset role does not fail here, it fails much later inside
 * invoice posting ("vat_output_account_id is not configured"), so it must not be
 * dismissable by accident.
 */
export function OpeningSystemRolesStep({ accounts, onDone, onSkip }: Props) {
  const t = useTranslations('accounting');

  const targets = useMemo(() => accounts.filter((account) => !account.system_code), [accounts]);
  const [selection, setSelection] = useState<Record<string, string>>({});
  const [configured, setConfigured] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const settings = await accountingApi.getAccountingSettings().catch(() => null);
        if (cancelled) return;
        const current: Record<string, string> = {};
        const next: Record<string, string> = {};
        for (const role of SYSTEM_ROLES) {
          const existing = String((settings as Record<string, unknown> | null)?.[role.setting_key] || '');
          current[role.setting_key] = existing;
          next[role.setting_key] = existing || suggestFor(role.setting_key, role.defaultCode, role.nameHints, targets);
        }
        setConfigured(current);
        setSelection(next);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [targets]);

  const missingCount = SYSTEM_ROLES.filter((role) => !selection[role.setting_key]).length;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const mapping: Record<string, { account_id: string }> = {};
      for (const role of SYSTEM_ROLES) {
        const id = selection[role.setting_key];
        // Only send changes — re-sending an unchanged role would try to delete
        // and replace the previous system default for nothing.
        if (id && id !== configured[role.setting_key]) {
          mapping[role.setting_key] = { account_id: id };
        }
      }
      if (Object.keys(mapping).length > 0) {
        await accountingApi.applyImportedSystemRoles(mapping);
      }
      setConfigured((current) => ({
        ...current,
        ...Object.fromEntries(Object.entries(mapping).map(([key, value]) => [key, value.account_id])),
      }));
      setSaved(true);
      onDone?.();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 rounded-[10px] border border-[var(--a-border)] bg-[var(--a-surface)]">
      <div className="border-b border-[var(--a-border)] px-4 py-3">
        <div className="text-[15px] font-semibold text-[var(--a-text)]">{t('obSystemRolesTitle')}</div>
        <div className="mt-0.5 text-[13px] text-[var(--a-text-2)]">{t('obSystemRolesIntro')}</div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 px-4 py-6 text-[13px] text-[var(--a-text-3)]">
          <Loader2 className="h-4 w-4 animate-spin" /> {t('loading')}
        </div>
      ) : (
        <>
          <div className="divide-y divide-[var(--a-border)]">
            {SYSTEM_ROLES.map((role) => {
              const value = selection[role.setting_key] || '';
              return (
                <div key={role.setting_key} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className="min-w-0 sm:w-[260px]">
                    <div className="text-[13.5px] font-medium text-[var(--a-text)]">{t(`role_${role.system_code}`)}</div>
                    <div className="text-[11.5px] text-[var(--a-text-3)]">{t('obSystemRoleUsedFor', { code: role.defaultCode })}</div>
                  </div>
                  <select
                    value={value}
                    onChange={(event) => setSelection((current) => ({ ...current, [role.setting_key]: event.target.value }))}
                    className="h-9 min-w-0 flex-1 rounded-[8px] border px-2 text-[13px] text-[var(--a-text)]"
                    style={{ borderColor: value ? 'var(--a-border)' : 'var(--a-warn)', background: 'var(--a-surface)' }}
                  >
                    <option value="">{t('obSystemRoleNotSet')}</option>
                    {targets
                      .filter((account) => account.type === role.type)
                      .map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.code} · {account.name}
                        </option>
                      ))}
                  </select>
                  {value ? (
                    <CheckCircle2 className="hidden h-4 w-4 shrink-0 text-[var(--a-pos)] sm:block" />
                  ) : (
                    <AlertCircle className="hidden h-4 w-4 shrink-0 text-[var(--a-warn)] sm:block" />
                  )}
                </div>
              );
            })}
          </div>

          {error && (
            <div className="border-t border-[var(--a-border)] px-4 py-2.5 text-[12.5px] text-[var(--a-neg)]">{error}</div>
          )}

          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--a-border)] px-4 py-3">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-[var(--a-accent)] px-3.5 text-[13px] font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              {t('obSystemRolesSave')}
            </button>
            {onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="inline-flex h-9 items-center rounded-[8px] border border-[var(--a-border)] px-3.5 text-[13px] text-[var(--a-text-2)] transition hover:bg-[var(--a-surface-2)]"
              >
                {t('obSystemRolesSkip')}
              </button>
            )}
            {missingCount > 0 && (
              <span className="text-[12px] text-[var(--a-text-3)]">{t('obSystemRolesMissing', { count: missingCount })}</span>
            )}
            {saved && missingCount === 0 && <span className="text-[12px] text-[var(--a-pos)]">{t('obSystemRolesSaved')}</span>}
          </div>
        </>
      )}
    </div>
  );
}
