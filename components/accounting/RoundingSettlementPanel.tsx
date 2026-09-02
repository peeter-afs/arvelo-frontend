'use client';

import { useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { AccountOption, AccountingSettings, RoundingSettings } from '@/lib/api/accounting.api';

const DEFAULT_TOLERANCE = 0.02;

type Props = {
  accounts: AccountOption[];
  settings: AccountingSettings | null;
  saving?: boolean;
  onSave: (settings: RoundingSettings) => Promise<void> | void;
};

type Draft = { accountId: string; tolerance: string };

function draftFromSettings(settings: AccountingSettings | null): Draft {
  const tolerance = settings?.rounding_tolerance;
  return {
    accountId: settings?.rounding_account_id || '',
    tolerance: (tolerance === null || tolerance === undefined ? DEFAULT_TOLERANCE : Number(tolerance)).toFixed(2),
  };
}

export function RoundingSettlementPanel({ accounts, settings, saving = false, onSave }: Props) {
  const tA = useTranslations('accounting');
  const [draft, setDraft] = useState<{ source: AccountingSettings | null; value: Draft }>(() => ({
    source: settings,
    value: draftFromSettings(settings),
  }));
  const value = draft.source === settings ? draft.value : draftFromSettings(settings);
  const update = (patch: Partial<Draft>) => setDraft({ source: settings, value: { ...value, ...patch } });

  // A write-off lands in profit or loss; other account types would distort a balance
  // sheet line every time a cent is settled.
  const profitAndLoss = accounts.filter((a) => a.is_active && (a.type === 'revenue' || a.type === 'expense'));
  const options = profitAndLoss.length > 0 ? profitAndLoss : accounts.filter((a) => a.is_active);

  return (
    <div className="rounded-xl border border-slate-200 p-6">
      <h3 className="text-base font-semibold text-slate-900">{tA('roundingSettlementTitle')}</h3>
      <p className="mt-1 text-sm text-slate-500">{tA('roundingSettlementDescription')}</p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">{tA('roundingAccount')}</span>
          <select
            value={value.accountId}
            onChange={(event) => update({ accountId: event.target.value })}
            className="h-11 w-full rounded-lg border border-slate-200 px-3"
          >
            <option value="">{tA('roundingAccountOff')}</option>
            {options.map((account) => (
              <option key={account.id} value={account.id}>
                {account.code} · {account.name}
              </option>
            ))}
          </select>
        </label>

        {value.accountId && (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{tA('roundingTolerance')}</span>
            <input
              type="number"
              min="0"
              max="1"
              step="0.01"
              value={value.tolerance}
              onChange={(event) => update({ tolerance: event.target.value })}
              className="h-11 w-full rounded-lg border border-slate-200 px-3"
            />
            <span className="mt-1 block text-xs text-slate-500">{tA('roundingToleranceHint')}</span>
          </label>
        )}
      </div>

      <button
        type="button"
        onClick={() =>
          void onSave({
            rounding_account_id: value.accountId || null,
            rounding_tolerance: value.tolerance === '' ? DEFAULT_TOLERANCE : Number(value.tolerance),
          })
        }
        disabled={saving}
        className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-6 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        <span>{tA('roundingSettlementSave')}</span>
      </button>
    </div>
  );
}
