'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getErrorMessage } from '@/lib/api/client';
import { accountingApi, type AccountOption } from '@/lib/api/accounting.api';
import { futursoftApi, type FutursoftSettings, type FutursoftAccountRule, type FutursoftDiscoveredCode } from '@/lib/api/futursoft.api';
import { Field, TabHeader, TabFeedback } from '../_components/fields';

export function FutursoftTab({ canManage }: { canManage: boolean }) {
  const t = useTranslations('settings');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [futursoftSettings, setFutursoftSettings] = useState<FutursoftSettings | null>(null);
  const [futursoftForm, setFutursoftForm] = useState({
    enabled: false,
    base_url: 'https://apikey.autofutur.net/apigw.php',
    api_key: '',
    sync_window_days: 30,
    default_page_size: 100,
    start_date: '',
    line_grouping: 'itemized' as 'itemized' | 'by_account' | 'by_type',
    auto_post: false,
  });
  const [futursoftLoading, setFutursoftLoading] = useState(false);
  const [futursoftSaving, setFutursoftSaving] = useState(false);
  const [futursoftTesting, setFutursoftTesting] = useState(false);
  const [futursoftSyncing, setFutursoftSyncing] = useState(false);
  const [futursoftRules, setFutursoftRules] = useState<FutursoftAccountRule[]>([]);
  const [futursoftRevenueAccounts, setFutursoftRevenueAccounts] = useState<AccountOption[]>([]);
  const [futursoftRulesSaving, setFutursoftRulesSaving] = useState(false);
  const [futursoftDiscoverRange, setFutursoftDiscoverRange] = useState({ from: '', to: '' });
  const [futursoftDiscovering, setFutursoftDiscovering] = useState(false);
  const [futursoftDiscovered, setFutursoftDiscovered] = useState<FutursoftDiscoveredCode[] | null>(null);
  const [futursoftCodeAccounts, setFutursoftCodeAccounts] = useState<Record<string, string>>({});
  const [futursoftMatchSaving, setFutursoftMatchSaving] = useState(false);

  useEffect(() => {
    if (!canManage) return;
    const load = async () => {
      setFutursoftLoading(true);
      setError(null);
      try {
        const [settings, rules, accounts] = await Promise.all([
          futursoftApi.getSettings(),
          futursoftApi.getRules().catch(() => []),
          accountingApi.getAccounts().catch(() => []),
        ]);
        setFutursoftSettings(settings);
        setFutursoftForm({
          enabled: settings.enabled,
          base_url: settings.base_url || 'https://apikey.autofutur.net/apigw.php',
          api_key: '',
          sync_window_days: settings.sync_window_days ?? 30,
          default_page_size: settings.default_page_size ?? 100,
          start_date: settings.start_date || '',
          line_grouping: (settings.line_grouping as 'itemized' | 'by_account' | 'by_type') || 'itemized',
          auto_post: settings.auto_post ?? false,
        });
        setFutursoftRules(rules);
        const revenue = accounts.filter((a) => a.type === 'revenue' && a.is_active);
        setFutursoftRevenueAccounts(revenue.length > 0 ? revenue : accounts.filter((a) => a.is_active));
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setFutursoftLoading(false);
      }
    };
    void load();
  }, [canManage]);

  const saveFutursoftSettings = async () => {
    setFutursoftSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await futursoftApi.updateSettings({
        enabled: futursoftForm.enabled,
        base_url: futursoftForm.base_url,
        api_key: futursoftForm.api_key || undefined,
        sync_window_days: futursoftForm.sync_window_days,
        default_page_size: futursoftForm.default_page_size,
        start_date: futursoftForm.start_date || null,
        line_grouping: futursoftForm.line_grouping,
        auto_post: futursoftForm.auto_post,
      });
      setFutursoftSettings(updated);
      setFutursoftForm((current) => ({ ...current, api_key: '' }));
      setSuccess(t('futursoftSettingsSaved'));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setFutursoftSaving(false);
    }
  };

  const testFutursoftSettings = async () => {
    setFutursoftTesting(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await futursoftApi.testSettings();
      setSuccess(t('connectionTestStatus', { status: result.status, testedAt: new Date(result.tested_at).toLocaleString() }));
      const refreshed = await futursoftApi.getSettings();
      setFutursoftSettings(refreshed);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setFutursoftTesting(false);
    }
  };

  const saveFutursoftRules = async () => {
    setFutursoftRulesSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const clean = futursoftRules
        .filter((r) => r.match_value.trim() && r.account_id)
        .map((r) => ({
          match_type: r.match_type,
          match_value: r.match_type === 'line_type' ? r.match_value : r.match_value.trim(),
          account_id: r.account_id,
          is_active: r.is_active !== false,
        }));
      const saved = await futursoftApi.updateRules(clean);
      setFutursoftRules(saved);
      setSuccess(t('futursoftRulesSaved'));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setFutursoftRulesSaving(false);
    }
  };

  const runFutursoftDiscover = async () => {
    setFutursoftDiscovering(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await futursoftApi.discover({ from: futursoftDiscoverRange.from, to: futursoftDiscoverRange.to });
      setFutursoftDiscovered(result.codes);
      // Pre-fill each code's account from any existing product_code rule.
      const prefill: Record<string, string> = {};
      for (const code of result.codes) {
        const key = code.product_code.toUpperCase();
        const rule = futursoftRules.find((r) => r.match_type === 'product_code' && r.match_value.toUpperCase() === key);
        if (rule) prefill[key] = rule.account_id;
      }
      setFutursoftCodeAccounts(prefill);
      setSuccess(t('futursoftDiscoverDone', { count: result.codes.length, invoices: result.scanned_invoices }));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setFutursoftDiscovering(false);
    }
  };

  const saveCodeMappings = async () => {
    if (!futursoftDiscovered) return;
    setFutursoftMatchSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const discoveredUpper = new Set(futursoftDiscovered.map((c) => c.product_code.toUpperCase()));
      // Keep line_type rules and any product_code rules not in this discovery; replace
      // the discovered ones with the (assigned) account selections.
      const kept = futursoftRules.filter(
        (r) => !(r.match_type === 'product_code' && discoveredUpper.has(r.match_value.toUpperCase()))
      );
      const newCodeRules: FutursoftAccountRule[] = futursoftDiscovered
        .map((c) => ({ code: c.product_code, account_id: futursoftCodeAccounts[c.product_code.toUpperCase()] }))
        .filter((x) => x.account_id)
        .map((x) => ({ match_type: 'product_code' as const, match_value: x.code, account_id: x.account_id, is_active: true }));
      const saved = await futursoftApi.updateRules([...kept, ...newCodeRules]);
      setFutursoftRules(saved);
      setSuccess(t('futursoftMatchSaved', { count: newCodeRules.length }));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setFutursoftMatchSaving(false);
    }
  };

  const futursoftLineTypeAccount = (lineType: 'goods' | 'service') =>
    futursoftRules.find((r) => r.match_type === 'line_type' && r.match_value === lineType)?.account_id || '';
  const setFutursoftLineTypeAccount = (lineType: 'goods' | 'service', accountId: string) => {
    setFutursoftRules((current) => {
      const others = current.filter((r) => !(r.match_type === 'line_type' && r.match_value === lineType));
      return accountId ? [...others, { match_type: 'line_type', match_value: lineType, account_id: accountId, is_active: true }] : others;
    });
  };

  const runFutursoftImport = async () => {
    setFutursoftSyncing(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await futursoftApi.sync({ trigger: 'manual', force: true });
      if (result.status === 'skipped') {
        setSuccess(t('futursoftImportSkipped'));
      } else {
        setSuccess(t('futursoftImportDone', {
          imported: result.imported_count,
          skipped: result.skipped_count,
          failed: result.failed_count,
        }));
      }
      const refreshed = await futursoftApi.getSettings();
      setFutursoftSettings(refreshed);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setFutursoftSyncing(false);
    }
  };

  return (
    <div>
      <TabHeader title={t('integrationsTitle')} description={t('integrationsDescription')} />
      <TabFeedback error={error} success={success} />

      {!canManage ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {t('businessRegistryPermission')}
        </div>
      ) : futursoftLoading ? (
        <div className="text-sm text-slate-500">{t('loadingIntegrationSettings')}</div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
            {t('futursoftConfigureAccountsWarning')}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-4">
              <input
                type="checkbox"
                checked={futursoftForm.enabled}
                onChange={(event) => setFutursoftForm((current) => ({ ...current, enabled: event.target.checked }))}
                className="h-4 w-4"
              />
              <div>
                <div className="text-sm font-medium text-slate-900">{t('futursoftEnabled')}</div>
                <div className="text-xs text-slate-500">{t('futursoftEnabledDescription')}</div>
              </div>
            </label>

            <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-4">
              <input
                type="checkbox"
                checked={futursoftForm.auto_post}
                onChange={(event) => setFutursoftForm((current) => ({ ...current, auto_post: event.target.checked }))}
                className="h-4 w-4"
              />
              <div>
                <div className="text-sm font-medium text-slate-900">{t('futursoftAutoPost')}</div>
                <div className="text-xs text-slate-500">{t('futursoftAutoPostDescription')}</div>
              </div>
            </label>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-sm font-medium text-slate-900">{t('futursoftApiKey')}</div>
              <div className="mt-2 text-xs text-slate-500">
                {futursoftSettings?.has_api_key
                  ? t('storedValue', { value: futursoftSettings.api_key_masked || t('stored') })
                  : t('notSet')}
              </div>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label={t('futursoftBaseUrl')}
              value={futursoftForm.base_url}
              onChange={(value) => setFutursoftForm((current) => ({ ...current, base_url: value }))}
            />
            <Field
              label={futursoftSettings?.has_api_key ? t('futursoftApiKeyStored') : t('futursoftApiKey')}
              value={futursoftForm.api_key}
              onChange={(value) => setFutursoftForm((current) => ({ ...current, api_key: value }))}
              placeholder={t('leaveBlankKeepApiKey')}
              type="password"
            />
            <Field
              label={t('syncWindowDays')}
              value={String(futursoftForm.sync_window_days)}
              onChange={(value) => setFutursoftForm((current) => ({ ...current, sync_window_days: Number(value) || 0 }))}
            />
            <Field
              label={t('futursoftPageSize')}
              value={String(futursoftForm.default_page_size)}
              onChange={(value) => setFutursoftForm((current) => ({ ...current, default_page_size: Number(value) || 0 }))}
            />
            <div>
              <Field
                label={t('futursoftStartDate')}
                value={futursoftForm.start_date}
                onChange={(value) => setFutursoftForm((current) => ({ ...current, start_date: value }))}
                type="date"
              />
              <p className="mt-1 text-xs text-slate-500">{t('futursoftStartDateHint')}</p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-5">
            <h3 className="text-base font-semibold text-slate-900">{t('futursoftPostingTitle')}</h3>
            <p className="mt-1 text-xs text-slate-500">{t('futursoftPostingHint')}</p>

            <div className="mt-4 max-w-md">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('futursoftGrouping')}</label>
              <select
                value={futursoftForm.line_grouping}
                onChange={(event) => setFutursoftForm((current) => ({ ...current, line_grouping: event.target.value as 'itemized' | 'by_account' | 'by_type' }))}
                className="w-full h-11 px-3 border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--primary)]"
                style={{ fontSize: '16px' }}
              >
                <option value="itemized">{t('futursoftGroupingItemized')}</option>
                <option value="by_type">{t('futursoftGroupingByType')}</option>
                <option value="by_account">{t('futursoftGroupingByAccount')}</option>
              </select>
            </div>

            <div className="mt-6">
              <div className="text-sm font-medium text-slate-900">{t('futursoftBaseAccounts')}</div>
              <p className="mt-1 text-xs text-slate-500">{t('futursoftBaseAccountsHint')}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t('futursoftGoods')}</label>
                  <select
                    value={futursoftLineTypeAccount('goods')}
                    onChange={(event) => setFutursoftLineTypeAccount('goods', event.target.value)}
                    className="h-10 w-full px-2 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="">{t('futursoftSelectAccount')}</option>
                    {futursoftRevenueAccounts.map((a) => (<option key={a.id} value={a.id}>{a.code} · {a.name}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">{t('futursoftServices')}</label>
                  <select
                    value={futursoftLineTypeAccount('service')}
                    onChange={(event) => setFutursoftLineTypeAccount('service', event.target.value)}
                    className="h-10 w-full px-2 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="">{t('futursoftSelectAccount')}</option>
                    {futursoftRevenueAccounts.map((a) => (<option key={a.id} value={a.id}>{a.code} · {a.name}</option>))}
                  </select>
                </div>
              </div>
              <button
                type="button"
                onClick={saveFutursoftRules}
                disabled={futursoftRulesSaving}
                className="mt-3 h-10 px-5 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors disabled:opacity-50"
              >
                {futursoftRulesSaving ? t('saving') : t('futursoftSaveRules')}
              </button>
            </div>

            {futursoftForm.line_grouping === 'by_type' ? (
              <div className="mt-6 rounded-lg border border-dashed border-slate-200 p-4 text-xs text-slate-500">
                {t('futursoftByTypeNote')}
              </div>
            ) : (
              <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                <div className="text-sm font-medium text-slate-900">{t('futursoftDiscoverTitle')}</div>
                <p className="mt-1 text-xs text-slate-500">{t('futursoftDiscoverHint')}</p>

                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{t('futursoftDiscoverFrom')}</label>
                    <input
                      type="date"
                      value={futursoftDiscoverRange.from}
                      onChange={(event) => setFutursoftDiscoverRange((current) => ({ ...current, from: event.target.value }))}
                      className="h-10 px-3 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">{t('futursoftDiscoverTo')}</label>
                    <input
                      type="date"
                      value={futursoftDiscoverRange.to}
                      onChange={(event) => setFutursoftDiscoverRange((current) => ({ ...current, to: event.target.value }))}
                      className="h-10 px-3 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={runFutursoftDiscover}
                    disabled={futursoftDiscovering || !futursoftDiscoverRange.from || !futursoftDiscoverRange.to || !futursoftSettings?.enabled}
                    className="h-10 px-5 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    {futursoftDiscovering ? t('futursoftDiscovering') : t('futursoftDiscoverLoad')}
                  </button>
                </div>

                {futursoftDiscovered && (
                  futursoftDiscovered.length === 0 ? (
                    <div className="mt-3 text-xs text-slate-400">{t('futursoftDiscoverEmpty')}</div>
                  ) : (
                    <div className="mt-4">
                      <div className="overflow-hidden rounded-lg border border-slate-200">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-100 text-xs text-slate-500">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium">{t('futursoftRuleProductCode')}</th>
                              <th className="px-3 py-2 text-left font-medium">{t('futursoftCodeName')}</th>
                              <th className="px-3 py-2 text-left font-medium">{t('futursoftRuleLineType')}</th>
                              <th className="px-3 py-2 text-right font-medium">{t('futursoftDiscoverCount')}</th>
                              <th className="px-3 py-2 text-left font-medium">{t('futursoftSelectAccount')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {futursoftDiscovered.map((code) => {
                              const key = code.product_code.toUpperCase();
                              return (
                                <tr key={key} className="border-t border-slate-100">
                                  <td className="px-3 py-2 font-medium text-slate-800">{code.product_code}</td>
                                  <td className="px-3 py-2 text-slate-600">{code.sample_name || '—'}</td>
                                  <td className="px-3 py-2 text-slate-600">{code.line_type === 'service' ? t('futursoftServices') : t('futursoftGoods')}</td>
                                  <td className="px-3 py-2 text-right text-slate-500">{code.count}</td>
                                  <td className="px-3 py-2">
                                    <select
                                      value={futursoftCodeAccounts[key] || ''}
                                      onChange={(event) => setFutursoftCodeAccounts((current) => ({ ...current, [key]: event.target.value }))}
                                      className="h-9 px-2 border border-slate-200 rounded-lg text-sm w-full min-w-[200px]"
                                    >
                                      <option value="">{t('futursoftSelectAccount')}</option>
                                      {futursoftRevenueAccounts.map((a) => (
                                        <option key={a.id} value={a.id}>{a.code} · {a.name}</option>
                                      ))}
                                    </select>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <button
                        type="button"
                        onClick={saveCodeMappings}
                        disabled={futursoftMatchSaving}
                        className="mt-3 h-10 px-5 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {futursoftMatchSaving ? t('saving') : t('futursoftSaveMatches')}
                      </button>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* A run that imported only part of its batch must not look like a
              clean success — that is how 129 unposted invoices went unnoticed. */}
          {(() => {
            const syncStatus = futursoftSettings?.last_sync_status || null;
            const hasProblem = syncStatus === 'failed' || syncStatus === 'partial' || !!futursoftSettings?.last_error_message;
            return (
              <div
                className={`rounded-lg border p-4 text-sm ${
                  hasProblem ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                <div className={`font-medium ${hasProblem ? 'text-amber-900' : 'text-slate-900'}`}>{t('status')}</div>
                <div className={`mt-2 space-y-1 text-xs ${hasProblem ? 'text-amber-900' : 'text-slate-600'}`}>
                  <div>{t('lastSyncAt')}: {futursoftSettings?.last_sync_at ? new Date(futursoftSettings.last_sync_at).toLocaleString() : t('notRun')}</div>
                  <div>{t('lastSyncStatus')}: {syncStatus || t('notRun')}</div>
                  <div>{t('lastImportedCount')}: {futursoftSettings?.last_imported_count ?? t('na')}</div>
                  <div>{t('lastTestStatus')}: {futursoftSettings?.last_test_status || t('notRun')}</div>
                  <div className={futursoftSettings?.last_error_message ? 'font-medium' : undefined}>
                    {t('lastError')}: {futursoftSettings?.last_error_message || t('none')}
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={saveFutursoftSettings}
              disabled={futursoftSaving}
              className="h-11 px-6 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] font-medium transition-colors disabled:opacity-50"
            >
              {futursoftSaving ? t('saving') : t('saveSettings')}
            </button>
            <button
              type="button"
              onClick={testFutursoftSettings}
              disabled={futursoftTesting}
              className="h-11 px-6 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm text-slate-700 font-medium transition-colors disabled:opacity-50"
            >
              {futursoftTesting ? t('testing') : t('testConnection')}
            </button>
            <button
              type="button"
              onClick={runFutursoftImport}
              disabled={futursoftSyncing || !futursoftSettings?.enabled}
              className="h-11 px-6 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm text-slate-700 font-medium transition-colors disabled:opacity-50"
            >
              {futursoftSyncing ? t('futursoftImporting') : t('importNow')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
