'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { AccountOption, AccountingSettings, SupplyTypeSalesDefaults } from '@/lib/api/accounting.api';

const SUPPLY_KEYS = [
  { key: 'default_sales_account_id_domestic', labelKey: 'supplyDomestic' },
  { key: 'default_sales_account_id_intra_community', labelKey: 'supplyIntraCommunity' },
  { key: 'default_sales_account_id_reverse_charge', labelKey: 'supplyReverseCharge' },
  { key: 'default_sales_account_id_third_country', labelKey: 'supplyThirdCountry' },
] as const;

type Props = {
  accounts: AccountOption[];
  settings: AccountingSettings | null;
  saving?: boolean;
  onSave: (mapping: SupplyTypeSalesDefaults) => Promise<void> | void;
};

export function SupplyTypeSalesAccountsPanel({ accounts, settings, saving = false, onSave }: Props) {
  const tA = useTranslations('accounting');
  const tI = useTranslations('invoices');
  const [mapping, setMapping] = useState<SupplyTypeSalesDefaults>({});

  useEffect(() => {
    const next: SupplyTypeSalesDefaults = {};
    for (const s of SUPPLY_KEYS) {
      const id = settings?.[s.key];
      if (id) (next as Record<string, string>)[s.key] = id;
    }
    setMapping(next);
  }, [settings]);

  // Sales defaults should be revenue accounts; fall back to all active if none are typed yet.
  const revenue = accounts.filter((a) => a.is_active && a.type === 'revenue');
  const options = revenue.length > 0 ? revenue : accounts.filter((a) => a.is_active);

  return (
    <div className="rounded-xl border border-slate-200 p-6">
      <h3 className="text-base font-semibold text-slate-900">{tA('salesAccountDefaultsTitle')}</h3>
      <p className="mt-1 text-sm text-slate-500">{tA('salesAccountDefaultsDescription')}</p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {SUPPLY_KEYS.map((s) => (
          <label key={s.key} className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">{tI(s.labelKey)}</span>
            <select
              value={(mapping as Record<string, string>)[s.key] || ''}
              onChange={(event) =>
                setMapping((current) => ({ ...current, [s.key]: event.target.value || null }))
              }
              className="h-11 w-full rounded-lg border border-slate-200 px-3"
            >
              <option value="">{tA('selectAccountOptional')}</option>
              {options.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} · {account.name}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <button
        type="button"
        onClick={() => void onSave(mapping)}
        disabled={saving}
        className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-6 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        <span>{tA('salesAccountDefaultsSave')}</span>
      </button>
    </div>
  );
}
