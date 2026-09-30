'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';
import { rikEinvoiceApi, type RikConnectionTest, type RikEinvoiceSettings, type RikEnvironment, type RikMode } from '@/lib/api/rikEinvoice.api';

/**
 * E-invoices through RIK e-arveldaja: turning it on creates a forwarding
 * contract at RIK. Receiving also needs the company to confirm RIK as its
 * e-invoice receiver in the business register.
 */
export function RikEinvoiceTab({ canManage }: { canManage: boolean }) {
  const t = useTranslations('rikEinvoice');
  const [settings, setSettings] = useState<RikEinvoiceSettings | null>(null);
  const [mode, setMode] = useState<RikMode>('send_only');
  const [environment, setEnvironment] = useState<RikEnvironment>('production');
  const [connection, setConnection] = useState<RikConnectionTest | null>(null);
  const [receiveFrom, setReceiveFrom] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    rikEinvoiceApi
      .getSettings()
      .then((result) => {
        setSettings(result);
        setMode(result.mode);
        setEnvironment(result.environment);
        setReceiveFrom(result.receive_from ?? '');
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      await action();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const save = (enabled: boolean) =>
    run(enabled ? 'enable' : 'disable', async () => {
      const result = await rikEinvoiceApi.updateSettings({ enabled, mode, receive_from: receiveFrom || null, environment });
      setSettings(result);
      setNotice(enabled ? (mode === 'send_receive' ? t('enabledReceive') : t('enabledSend')) : t('disabled'));
    });

  if (!settings) {
    return <div className="text-sm text-slate-500">{error ?? t('loading')}</div>;
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-900">{t('title')}</h2>
      <p className="mt-1 text-sm text-slate-500">{t('description')}</p>

      {!settings.server_configured && (
        <div className="mt-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {t('serverNotConfigured')}
        </div>
      )}

      {settings.environment === 'test' && (
        <div className="mt-4 flex gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {t('testEnvironmentNotice')}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        {settings.enabled ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {settings.mode === 'send_receive' ? t('statusSendReceive') : t('statusSendOnly')}
          </span>
        ) : (
          <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">{t('statusOff')}</span>
        )}
        {settings.contract_status && <span className="text-xs text-slate-500">{t('contractStatus', { status: settings.contract_status })}</span>}
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">{t('environment')}</span>
          <select
            value={environment}
            disabled={!canManage || (settings.available_environments ?? []).length < 2}
            onChange={(event) => setEnvironment(event.target.value as RikEnvironment)}
            className="h-11 w-full rounded-lg border border-slate-200 px-4"
          >
            {(['production', 'test'] as RikEnvironment[])
              .filter((env) => (settings.available_environments ?? []).includes(env) || env === environment)
              .map((env) => <option key={env} value={env}>{t(`environmentLabel.${env}`)}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">{t('mode')}</span>
          <select value={mode} disabled={!canManage} onChange={(event) => setMode(event.target.value as RikMode)} className="h-11 w-full rounded-lg border border-slate-200 px-4">
            <option value="send_only">{t('modeSendOnly')}</option>
            <option value="send_receive">{t('modeSendReceive')}</option>
          </select>
        </label>
        {mode === 'send_receive' && (
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">{t('receiveFrom')}</span>
            <input type="date" value={receiveFrom} disabled={!canManage} onChange={(event) => setReceiveFrom(event.target.value)} className="h-11 w-full rounded-lg border border-slate-200 px-4" />
          </label>
        )}
      </div>

      {mode === 'send_receive' && <p className="mt-3 text-xs leading-5 text-slate-500">{t('receiveHint')}</p>}

      {settings.enabled && settings.mode === 'send_receive' && (
        <div className="mt-4 rounded-lg border border-slate-200 p-3 text-sm text-slate-600">
          {t('lastReceive', {
            at: settings.last_receive_at ? new Date(settings.last_receive_at).toLocaleString('et-EE') : '—',
            count: settings.last_received_count ?? 0,
          })}
          {settings.last_error && <div className="mt-1 text-red-700 [overflow-wrap:anywhere]">{settings.last_error}</div>}
        </div>
      )}

      {connection && (
        <div className={`mt-4 rounded-lg px-3 py-2 text-sm ${connection.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
          {connection.ok
            ? t(connection.company_contract ? 'connectionOkWithContract' : 'connectionOk', {
                env: t(`environmentLabel.${connection.environment}`),
                count: connection.contracts_total,
              })
            : t('connectionFailed', { env: t(`environmentLabel.${connection.environment}`), message: connection.message ?? '' })}
          {connection.url && <div className="mt-0.5 font-mono text-xs opacity-70 break-all">{connection.url}</div>}
        </div>
      )}

      {notice && <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</div>}
      {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {canManage && (
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!!busy || !settings.server_configured}
            onClick={() => void save(true)}
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-[var(--primary)] px-6 font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-50"
          >
            {busy === 'enable' && <Loader2 className="h-4 w-4 animate-spin" />}
            {settings.enabled ? t('saveMode') : t('enable')}
          </button>
          <button
            type="button"
            disabled={!!busy || !(settings.available_environments ?? []).includes(environment)}
            onClick={() => void run('test', async () => setConnection(await rikEinvoiceApi.testConnection(environment)))}
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 px-6 font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            {busy === 'test' && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('testConnection')}
          </button>
          {settings.enabled && settings.mode === 'send_receive' && (
            <button
              type="button"
              disabled={!!busy}
              onClick={() => void run('receive', async () => {
                const result = await rikEinvoiceApi.receive();
                setSettings(await rikEinvoiceApi.getSettings());
                setNotice(t('received', { created: result.created, skipped: result.skipped }));
              })}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-slate-200 px-6 font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              {busy === 'receive' && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('receiveNow')}
            </button>
          )}
          {settings.enabled && (
            <button
              type="button"
              disabled={!!busy}
              onClick={() => void save(false)}
              className="h-11 rounded-lg border border-slate-200 px-6 font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {t('disable')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
