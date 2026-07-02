'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getErrorMessage } from '@/lib/api/client';
import {
  bankGatewayApi,
  type BankGatewayProvider,
  type BankGatewaySettings,
  type BankGatewaySyncRun,
} from '@/lib/api/bankGateway.api';
import { TabHeader, TabFeedback } from '../_components/fields';

type ProviderForm = {
  enabled: boolean;
  client_code: string;
  agreement_id: string;
  einvoice_agreement_id: string;
  sync_window_days: number;
  start_date: string;
  auto_commit: boolean;
};

const EMPTY_FORM: ProviderForm = {
  enabled: false,
  client_code: '',
  agreement_id: '',
  einvoice_agreement_id: '',
  sync_window_days: 30,
  start_date: '',
  auto_commit: false,
};

function formFromSettings(settings: BankGatewaySettings | undefined): ProviderForm {
  if (!settings) return EMPTY_FORM;
  return {
    enabled: settings.enabled,
    client_code: settings.client_code || '',
    agreement_id: settings.agreement_id || '',
    einvoice_agreement_id: settings.einvoice_agreement_id || '',
    sync_window_days: settings.sync_window_days ?? 30,
    start_date: settings.start_date || '',
    auto_commit: settings.auto_commit,
  };
}

export function BankGatewaysTab({ canManage }: { canManage: boolean }) {
  const t = useTranslations('settings');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<Record<string, BankGatewaySettings>>({});
  const [forms, setForms] = useState<Record<string, ProviderForm>>({
    lhv_connect: EMPTY_FORM,
    swedbank_gateway: EMPTY_FORM,
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [runs, setRuns] = useState<BankGatewaySyncRun[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [allSettings, allRuns] = await Promise.all([
        bankGatewayApi.getSettings(),
        bankGatewayApi.listRuns().catch(() => []),
      ]);
      const byProvider: Record<string, BankGatewaySettings> = {};
      for (const entry of allSettings) byProvider[entry.provider] = entry;
      setSettings(byProvider);
      setForms({
        lhv_connect: formFromSettings(byProvider.lhv_connect),
        swedbank_gateway: formFromSettings(byProvider.swedbank_gateway),
      });
      setRuns(allRuns);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canManage) return;
    void load();
  }, [canManage, load]);

  const updateForm = (provider: BankGatewayProvider, patch: Partial<ProviderForm>) => {
    setForms((current) => ({ ...current, [provider]: { ...current[provider], ...patch } }));
  };

  const save = async (provider: BankGatewayProvider) => {
    setBusy(`save-${provider}`);
    setError(null);
    setSuccess(null);
    try {
      const form = forms[provider];
      const updated = await bankGatewayApi.updateSettings(provider, {
        enabled: form.enabled,
        client_code: provider === 'lhv_connect' ? form.client_code || null : undefined,
        agreement_id: provider === 'swedbank_gateway' ? form.agreement_id || null : undefined,
        einvoice_agreement_id: provider === 'swedbank_gateway' ? form.einvoice_agreement_id || null : undefined,
        sync_window_days: form.sync_window_days,
        start_date: form.start_date || null,
        auto_commit: form.auto_commit,
      });
      setSettings((current) => ({ ...current, [provider]: updated }));
      setForms((current) => ({ ...current, [provider]: formFromSettings(updated) }));
      setSuccess(t('bankGatewaySaved'));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const test = async (provider: BankGatewayProvider) => {
    setBusy(`test-${provider}`);
    setError(null);
    setSuccess(null);
    try {
      await bankGatewayApi.testConnection(provider);
      setSuccess(t('bankGatewayTestOk'));
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const sync = async (provider: BankGatewayProvider) => {
    setBusy(`sync-${provider}`);
    setError(null);
    setSuccess(null);
    try {
      const result = await bankGatewayApi.sync(provider, { force: true });
      if (result.skipped) {
        setSuccess(t('bankGatewaySyncSkipped'));
      } else if (result.pending_response) {
        setSuccess(t('bankGatewaySyncPending', { requested: result.statements_requested }));
      } else {
        setSuccess(t('bankGatewaySyncDone', {
          jobs: result.jobs_created,
          imported: result.imported_count,
        }));
      }
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const renderProviderCard = (provider: BankGatewayProvider) => {
    const form = forms[provider];
    const current = settings[provider];
    const isLhv = provider === 'lhv_connect';
    const title = isLhv ? t('bankGatewayLhvTitle') : t('bankGatewaySwedbankTitle');

    return (
      <div key={provider} className="rounded-xl border border-slate-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-xs text-slate-500">
              {isLhv ? t('bankGatewayLhvDescription') : t('bankGatewaySwedbankDescription')}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              current?.platform_configured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}
          >
            {current?.platform_configured ? t('bankGatewayCertConfigured') : t('bankGatewayCertMissing')}
          </span>
        </div>

        {!current?.platform_configured && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            {t('bankGatewayCertHint')}
          </div>
        )}

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-4">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(event) => updateForm(provider, { enabled: event.target.checked })}
              className="h-4 w-4"
            />
            <div>
              <div className="text-sm font-medium text-slate-900">{t('bankGatewayEnabled')}</div>
              <div className="text-xs text-slate-500">{t('bankGatewayEnabledDescription')}</div>
            </div>
          </label>

          <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-4">
            <input
              type="checkbox"
              checked={form.auto_commit}
              onChange={(event) => updateForm(provider, { auto_commit: event.target.checked })}
              className="h-4 w-4"
            />
            <div>
              <div className="text-sm font-medium text-slate-900">{t('bankGatewayAutoCommit')}</div>
              <div className="text-xs text-slate-500">{t('bankGatewayAutoCommitDescription')}</div>
            </div>
          </label>

          {isLhv ? (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('bankGatewayClientCode')}</label>
              <input
                value={form.client_code}
                onChange={(event) => updateForm(provider, { client_code: event.target.value })}
                placeholder="12345678"
                className="w-full h-11 px-4 border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--primary)]"
                style={{ fontSize: '16px' }}
              />
              <p className="mt-1 text-xs text-slate-500">{t('bankGatewayClientCodeHint')}</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('bankGatewayAgreementId')}</label>
                <input
                  value={form.agreement_id}
                  onChange={(event) => updateForm(provider, { agreement_id: event.target.value })}
                  className="w-full h-11 px-4 border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--primary)]"
                  style={{ fontSize: '16px' }}
                />
                <p className="mt-1 text-xs text-slate-500">{t('bankGatewayAgreementIdHint')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('bankGatewayEinvoiceAgreementId')}</label>
                <input
                  value={form.einvoice_agreement_id}
                  onChange={(event) => updateForm(provider, { einvoice_agreement_id: event.target.value })}
                  className="w-full h-11 px-4 border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--primary)]"
                  style={{ fontSize: '16px' }}
                />
                <p className="mt-1 text-xs text-slate-500">{t('bankGatewayEinvoiceAgreementIdHint')}</p>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('syncWindowDays')}</label>
            <input
              value={String(form.sync_window_days)}
              onChange={(event) => updateForm(provider, { sync_window_days: Number(event.target.value) || 0 })}
              className="w-full h-11 px-4 border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--primary)]"
              style={{ fontSize: '16px' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t('bankGatewayStartDate')}</label>
            <input
              type="date"
              value={form.start_date}
              onChange={(event) => updateForm(provider, { start_date: event.target.value })}
              className="w-full h-11 px-4 border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--primary)]"
              style={{ fontSize: '16px' }}
            />
            <p className="mt-1 text-xs text-slate-500">{t('bankGatewayStartDateHint')}</p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600">
          <div className="space-y-1">
            <div>{t('lastSyncAt')}: {current?.last_sync_at ? new Date(current.last_sync_at).toLocaleString() : t('notRun')}</div>
            <div>{t('lastSyncStatus')}: {current?.last_sync_status || t('notRun')}</div>
            <div>{t('lastTestStatus')}: {current?.last_test_status || t('notRun')}</div>
            <div>{t('lastError')}: {current?.last_error_message || t('none')}</div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void save(provider)}
            disabled={busy === `save-${provider}`}
            className="h-10 px-5 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] text-sm font-medium transition-colors disabled:opacity-50"
          >
            {busy === `save-${provider}` ? t('saving') : t('saveSettings')}
          </button>
          <button
            type="button"
            onClick={() => void test(provider)}
            disabled={busy === `test-${provider}` || !current?.platform_configured}
            className="h-10 px-5 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm text-slate-700 font-medium transition-colors disabled:opacity-50"
          >
            {busy === `test-${provider}` ? t('testing') : t('testConnection')}
          </button>
          <button
            type="button"
            onClick={() => void sync(provider)}
            disabled={busy === `sync-${provider}` || !current?.enabled || !current?.platform_configured}
            className="h-10 px-5 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm text-slate-700 font-medium transition-colors disabled:opacity-50"
          >
            {busy === `sync-${provider}` ? t('bankGatewaySyncing') : t('bankGatewaySyncNow')}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      <TabHeader title={t('bankGatewaysTitle')} description={t('bankGatewaysDescription')} />
      <TabFeedback error={error} success={success} />

      {!canManage ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {t('businessRegistryPermission')}
        </div>
      ) : loading ? (
        <div className="text-sm text-slate-500">{t('loadingIntegrationSettings')}</div>
      ) : (
        <div className="space-y-6">
          {renderProviderCard('lhv_connect')}
          {renderProviderCard('swedbank_gateway')}

          {runs.length > 0 && (
            <div className="rounded-xl border border-slate-200 p-5">
              <h3 className="text-base font-semibold text-slate-900">{t('bankGatewayRunsTitle')}</h3>
              <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-xs text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">{t('bankGatewayRunStarted')}</th>
                      <th className="px-3 py-2 text-left font-medium">{t('bankGatewayRunProvider')}</th>
                      <th className="px-3 py-2 text-left font-medium">{t('lastSyncStatus')}</th>
                      <th className="px-3 py-2 text-right font-medium">{t('bankGatewayRunJobs')}</th>
                      <th className="px-3 py-2 text-left font-medium">{t('lastError')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runs.slice(0, 10).map((run) => (
                      <tr key={run.id} className="border-t border-slate-100">
                        <td className="px-3 py-2 text-slate-600">{new Date(run.started_at).toLocaleString()}</td>
                        <td className="px-3 py-2 text-slate-800">
                          {run.provider === 'lhv_connect' ? 'LHV' : 'Swedbank'}
                        </td>
                        <td className="px-3 py-2 text-slate-600">{run.status}</td>
                        <td className="px-3 py-2 text-right text-slate-500">{run.jobs_created}</td>
                        <td className="px-3 py-2 text-xs text-slate-500">{run.error_message || '—'}</td>
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
