'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getErrorMessage } from '@/lib/api/client';
import { accountingApi, type AccountOption } from '@/lib/api/accounting.api';
import {
  meritPalkApi,
  type MeritPalkAccountMapEntry,
  type MeritPalkDiscoveredCode,
  type MeritPalkSettings,
} from '@/lib/api/meritPalk.api';
import { Field, TabHeader, TabFeedback } from '../_components/fields';

const DEFAULT_BASE_URL = 'https://palk.merit.ee/api/v1';

/** Previous calendar month — the one being paid out, and so the one to import. */
function previousMonth(): string {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function MeritPalkTab({ canManage }: { canManage: boolean }) {
  const t = useTranslations('settings');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [settings, setSettings] = useState<MeritPalkSettings | null>(null);
  const [form, setForm] = useState({
    enabled: false,
    base_url: DEFAULT_BASE_URL,
    api_id: '',
    api_key: '',
    auto_post: true,
  });
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [accountMap, setAccountMap] = useState<Record<string, string>>({});
  const [taxLiability, setTaxLiability] = useState<Record<string, boolean>>({});
  const [discovered, setDiscovered] = useState<MeritPalkDiscoveredCode[] | null>(null);
  const [month, setMonth] = useState(previousMonth());

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [importing, setImporting] = useState(false);
  const [mapSaving, setMapSaving] = useState(false);

  const applySettings = (next: MeritPalkSettings) => {
    setSettings(next);
    setForm({
      enabled: next.enabled,
      base_url: next.base_url || DEFAULT_BASE_URL,
      api_id: next.api_id || '',
      api_key: '',
      auto_post: next.auto_post ?? true,
    });
    setAccountMap(Object.fromEntries((next.account_map || []).map((entry) => [entry.merit_account_code, entry.account_id])));
    setTaxLiability(Object.fromEntries((next.account_map || []).map((entry) => [entry.merit_account_code, !!entry.is_tax_liability])));
  };

  useEffect(() => {
    if (!canManage) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [next, accountList] = await Promise.all([
          meritPalkApi.getSettings(),
          accountingApi.getAccounts().catch(() => [] as AccountOption[]),
        ]);
        applySettings(next);
        setAccounts(accountList);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [canManage]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const next = await meritPalkApi.updateSettings({
        enabled: form.enabled,
        base_url: form.base_url,
        api_id: form.api_id,
        // Empty means "keep the stored key" — the field starts blank on purpose.
        ...(form.api_key ? { api_key: form.api_key } : {}),
        auto_post: form.auto_post,
      });
      applySettings(next);
      setSuccess(t('meritPalkSaved'));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setError(null);
    setSuccess(null);
    try {
      await meritPalkApi.testSettings();
      setSuccess(t('meritPalkTestOk'));
      applySettings(await meritPalkApi.getSettings());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setTesting(false);
    }
  };

  const discover = async () => {
    setDiscovering(true);
    setError(null);
    setSuccess(null);
    try {
      const codes = await meritPalkApi.discover({ month });
      setDiscovered(codes);
      // Offer the same-code match as the default so a standard Estonian chart
      // needs confirmation rather than data entry.
      setAccountMap((current) => {
        const next = { ...current };
        for (const code of codes) {
          if (!next[code.merit_account_code] && code.suggested_account_id) {
            next[code.merit_account_code] = code.suggested_account_id;
          }
        }
        return next;
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDiscovering(false);
    }
  };

  const saveMap = async () => {
    setMapSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const entries: MeritPalkAccountMapEntry[] = Object.entries(accountMap)
        .filter(([, accountId]) => Boolean(accountId))
        .map(([code, accountId]) => ({
          merit_account_code: code,
          account_id: accountId,
          is_tax_liability: !!taxLiability[code],
        }));
      await meritPalkApi.updateAccountMap(entries);
      applySettings(await meritPalkApi.getSettings());
      setSuccess(t('meritPalkMapSaved'));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setMapSaving(false);
    }
  };

  const runImport = async () => {
    setImporting(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await meritPalkApi.sync({ month, force: true });
      if (result.status === 'failed' && result.unmapped_codes?.length) {
        setError(t('meritPalkUnmapped', { codes: result.unmapped_codes.join(', ') }));
      } else if (result.status === 'skipped') {
        setSuccess(t('meritPalkImportSkipped'));
      } else {
        setSuccess(t('meritPalkImportDone', { month: result.month, lines: result.line_count ?? 0 }));
      }
      applySettings(await meritPalkApi.getSettings());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setImporting(false);
    }
  };

  const codeRows: MeritPalkDiscoveredCode[] = discovered
    ?? (settings?.account_map || []).map((entry) => ({
      merit_account_code: entry.merit_account_code,
      debit: 0,
      credit: 0,
      suggested_account_id: null,
      suggested_account_name: null,
      mapped_account_id: entry.account_id,
    }));

  if (!canManage) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        {t('businessRegistryPermission')}
      </div>
    );
  }

  return (
    <div>
      <TabHeader title={t('meritPalkTitle')} description={t('meritPalkDescription')} />
      <TabFeedback error={error} success={success} />

      {loading ? (
        <div className="text-sm text-slate-500">{t('loadingIntegrationSettings')}</div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-4">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))}
                className="h-4 w-4"
              />
              <div>
                <div className="text-sm font-medium text-slate-900">{t('meritPalkEnabled')}</div>
                <div className="text-xs text-slate-500">{t('meritPalkEnabledDescription')}</div>
              </div>
            </label>

            <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-4">
              <input
                type="checkbox"
                checked={form.auto_post}
                onChange={(event) => setForm((current) => ({ ...current, auto_post: event.target.checked }))}
                className="h-4 w-4"
              />
              <div>
                <div className="text-sm font-medium text-slate-900">{t('meritPalkAutoPost')}</div>
                <div className="text-xs text-slate-500">{t('meritPalkAutoPostDescription')}</div>
              </div>
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label={t('meritPalkApiId')}
              value={form.api_id}
              onChange={(value) => setForm((current) => ({ ...current, api_id: value }))}
              placeholder="00000000-0000-0000-0000-000000000000"
            />
            <div>
              <Field
                label={t('meritPalkApiKey')}
                value={form.api_key}
                onChange={(value) => setForm((current) => ({ ...current, api_key: value }))}
                type="password"
                placeholder={settings?.has_api_key ? settings.api_key_masked || t('stored') : t('notSet')}
              />
              <p className="mt-1 text-xs text-slate-500">{t('meritPalkApiKeyHint')}</p>
            </div>
          </div>

          <div className="max-w-xl">
            <Field
              label={t('meritPalkBaseUrl')}
              value={form.base_url}
              onChange={(value) => setForm((current) => ({ ...current, base_url: value }))}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="h-11 px-6 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] font-medium transition-colors disabled:opacity-50"
            >
              {saving ? t('saving') : t('saveChanges')}
            </button>
            <button
              type="button"
              onClick={test}
              disabled={testing || !settings?.enabled}
              className="h-11 px-6 border border-slate-200 rounded-lg hover:bg-slate-50 font-medium text-slate-700 transition-colors disabled:opacity-50"
            >
              {testing ? t('testing') : t('meritPalkTest')}
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 p-5">
            <h3 className="text-base font-semibold text-slate-900">{t('meritPalkAccountMapTitle')}</h3>
            <p className="mt-1 text-xs text-slate-500">{t('meritPalkAccountMapHint')}</p>

            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t('meritPalkMonth')}</label>
                <input
                  value={month}
                  onChange={(event) => setMonth(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="YYYYMM"
                  inputMode="numeric"
                  className="h-10 w-[120px] px-3 border border-slate-200 rounded-lg font-mono text-sm"
                />
              </div>
              <button
                type="button"
                onClick={discover}
                disabled={discovering || month.length !== 6 || !settings?.enabled}
                className="h-10 px-5 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors disabled:opacity-50"
              >
                {discovering ? t('meritPalkDiscovering') : t('meritPalkDiscover')}
              </button>
              <button
                type="button"
                onClick={runImport}
                disabled={importing || month.length !== 6 || !settings?.enabled}
                className="h-10 px-5 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] text-sm font-medium transition-colors disabled:opacity-50"
              >
                {importing ? t('meritPalkImporting') : t('meritPalkImport')}
              </button>
            </div>

            {codeRows.length === 0 ? (
              <div className="mt-4 text-xs text-slate-400">{t('meritPalkNoCodes')}</div>
            ) : (
              <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-xs text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">{t('meritPalkMeritCode')}</th>
                      <th className="px-3 py-2 text-right font-medium">{t('meritPalkDebit')}</th>
                      <th className="px-3 py-2 text-right font-medium">{t('meritPalkCredit')}</th>
                      <th className="px-3 py-2 text-left font-medium">{t('meritPalkArveloAccount')}</th>
                      <th className="px-3 py-2 text-center font-medium">{t('meritPalkTaxLiability')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {codeRows.map((row) => (
                      <tr key={row.merit_account_code} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-mono">{row.merit_account_code}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">{row.debit ? row.debit.toFixed(2) : ''}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">{row.credit ? row.credit.toFixed(2) : ''}</td>
                        <td className="px-3 py-2">
                          <select
                            value={accountMap[row.merit_account_code] || ''}
                            onChange={(event) => setAccountMap((current) => ({ ...current, [row.merit_account_code]: event.target.value }))}
                            className="h-9 w-full px-2 border border-slate-200 rounded-lg text-sm"
                          >
                            <option value="">{t('meritPalkSelectAccount')}</option>
                            {accounts.map((account) => (
                              <option key={account.id} value={account.id}>{account.code} · {account.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={!!taxLiability[row.merit_account_code]}
                            onChange={(event) => setTaxLiability((current) => ({ ...current, [row.merit_account_code]: event.target.checked }))}
                            className="h-4 w-4"
                            aria-label={t('meritPalkTaxLiability')}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-2 text-xs text-slate-500">{t('meritPalkTaxLiabilityHint')}</p>

            <button
              type="button"
              onClick={saveMap}
              disabled={mapSaving || codeRows.length === 0}
              className="mt-3 h-10 px-5 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors disabled:opacity-50"
            >
              {mapSaving ? t('saving') : t('meritPalkSaveMap')}
            </button>
          </div>

          {(settings?.batches?.length ?? 0) > 0 && (
            <div className="rounded-xl border border-slate-200 p-5">
              <h3 className="text-base font-semibold text-slate-900">{t('meritPalkBatchesTitle')}</h3>
              <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-xs text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">{t('meritPalkMonth')}</th>
                      <th className="px-3 py-2 text-left font-medium">{t('meritPalkBatchStatus')}</th>
                      <th className="px-3 py-2 text-right font-medium">{t('meritPalkBatchLines')}</th>
                      <th className="px-3 py-2 text-right font-medium">{t('meritPalkDebit')}</th>
                      <th className="px-3 py-2 text-left font-medium">{t('meritPalkBatchError')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settings!.batches.map((batch) => (
                      <tr key={batch.id} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-mono">{batch.month}</td>
                        <td className="px-3 py-2">{batch.status}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">{batch.line_count}</td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">{Number(batch.total_debit).toFixed(2)}</td>
                        <td className="px-3 py-2 text-xs text-slate-500">{batch.error_message || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
