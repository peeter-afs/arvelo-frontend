'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { AccountOption } from '@/lib/api/accounting.api';
import { projectWipApi } from '@/lib/api/projectWip.api';
import { getErrorMessage } from '@/lib/api/client';
import { showToast } from '@/components/ui/Toast';

/** Settings → Data management: WIP (lõpetamata tööd) account and the cost account a release goes to. */
export function ProjectWipSettingsPanel({ accounts }: { accounts: AccountOption[] }) {
  const tA = useTranslations('accounting');
  const [value, setValue] = useState<{ wip: string; cost: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    projectWipApi.settings()
      .then((s) => setValue({ wip: s.wip_account_id, cost: s.wip_cost_account_id }))
      .catch((e) => { setError(getErrorMessage(e)); setValue({ wip: '', cost: '' }); });
  }, []);

  const assets = accounts.filter((a) => a.is_active && a.type === 'asset');
  const expenses = accounts.filter((a) => a.is_active && a.type === 'expense');

  const save = async () => {
    if (!value) return;
    setSaving(true);
    try {
      const s = await projectWipApi.updateSettings({ wip_account_id: value.wip || null, wip_cost_account_id: value.cost || null });
      setValue({ wip: s.wip_account_id, cost: s.wip_cost_account_id });
      setError(null);
      showToast.success(tA('wipSettingsSaved'));
    } catch (e) {
      showToast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 p-4 sm:p-6">
      <h3 className="text-base font-semibold text-slate-900">{tA('wipSettingsTitle')}</h3>
      <p className="mt-1 text-sm text-slate-500">{tA('wipSettingsDescription')}</p>
      {error && <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</div>}
      {!value ? (
        <div className="mt-4"><Loader2 className="h-4 w-4 animate-spin text-slate-400" /></div>
      ) : (
        <>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="block max-md:min-w-0">
              <span className="mb-1 block text-sm font-medium text-slate-700">{tA('wipAccount')}</span>
              <select value={value.wip} onChange={(e) => setValue({ ...value, wip: e.target.value })} className="h-11 w-full max-w-full rounded-lg border border-slate-200 px-3">
                <option value="">—</option>
                {assets.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
              </select>
            </label>
            <label className="block max-md:min-w-0">
              <span className="mb-1 block text-sm font-medium text-slate-700">{tA('wipCostAccount')}</span>
              <select value={value.cost} onChange={(e) => setValue({ ...value, cost: e.target.value })} className="h-11 w-full max-w-full rounded-lg border border-slate-200 px-3">
                <option value="">—</option>
                {expenses.map((a) => <option key={a.id} value={a.id}>{a.code} · {a.name}</option>)}
              </select>
            </label>
          </div>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-6 max-sm:w-full text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>{tA('wipSettingsSave')}</span>
          </button>
        </>
      )}
    </div>
  );
}
