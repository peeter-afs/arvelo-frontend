'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getErrorMessage } from '@/lib/api/client';
import { businessRegistryApi, type BusinessRegistrySettings } from '@/lib/api/businessRegistry.api';
import { Field, TabHeader, TabFeedback } from '../_components/fields';

const DEFAULT_FORM = {
  enabled: false,
  provider_type: 'rik_soap_v6',
  username: '',
  password: '',
  service_url: 'https://ariregxmlv6.rik.ee/',
  search_path: 'ettevotjaRekvisiidid_v1',
  company_path: 'ettevotjaRekvisiidid_v1',
  test_path: '?wsdl',
};

export function BusinessRegistryTab({ canManage }: { canManage: boolean }) {
  const t = useTranslations('settings');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [settings, setSettings] = useState<BusinessRegistrySettings | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!canManage) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const loaded = await businessRegistryApi.getSettings();
        setSettings(loaded);
        setForm({
          enabled: loaded.enabled,
          provider_type: loaded.provider_type || 'rik_soap_v6',
          username: '',
          password: '',
          service_url: loaded.service_url || 'https://ariregxmlv6.rik.ee/',
          search_path: loaded.search_path || 'ettevotjaRekvisiidid_v1',
          company_path: loaded.company_path || 'ettevotjaRekvisiidid_v1',
          test_path: loaded.test_path || '?wsdl',
        });
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
      const updated = await businessRegistryApi.updateSettings({
        enabled: form.enabled,
        provider_type: form.provider_type,
        username: form.username || undefined,
        password: form.password || undefined,
        service_url: form.service_url,
        search_path: form.search_path,
        company_path: form.company_path,
        test_path: form.test_path,
      });
      setSettings(updated);
      setForm((current) => ({ ...current, username: '', password: '' }));
      setSuccess(t('businessRegistrySettingsSaved'));
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
      const result = await businessRegistryApi.testSettings();
      setSuccess(t('connectionTestStatus', { status: result.status, testedAt: new Date(result.tested_at).toLocaleString() }));
      const refreshed = await businessRegistryApi.getSettings();
      setSettings(refreshed);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div>
      <TabHeader title={t('businessRegistryTitle')} description={t('businessRegistryDescription')} />
      <TabFeedback error={error} success={success} />

      {!canManage ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {t('businessRegistryPermission')}
        </div>
      ) : loading ? (
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
                <div className="text-sm font-medium text-slate-900">{t('integrationEnabled')}</div>
                <div className="text-xs text-slate-500">{t('integrationEnabledDescription')}</div>
              </div>
            </label>

            <div className="rounded-lg border border-slate-200 p-4">
              <div className="text-sm font-medium text-slate-900">{t('storedCredentials')}</div>
              <div className="mt-2 text-xs text-slate-500">
                {t('storedCredentialsValue', {
                  username: settings?.username_masked || t('notSet'),
                  password: settings?.has_password ? t('stored') : t('notSet'),
                })}
              </div>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label={t('providerType')} value={form.provider_type} onChange={(value) => setForm((current) => ({ ...current, provider_type: value }))} />
            <Field label={t('serviceUrl')} value={form.service_url} onChange={(value) => setForm((current) => ({ ...current, service_url: value }))} />
            <Field label={t('searchPath')} value={form.search_path} onChange={(value) => setForm((current) => ({ ...current, search_path: value }))} />
            <Field label={t('companyPath')} value={form.company_path} onChange={(value) => setForm((current) => ({ ...current, company_path: value }))} />
            <Field label={t('testPath')} value={form.test_path} onChange={(value) => setForm((current) => ({ ...current, test_path: value }))} />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <Field
              label={settings?.username_masked ? t('usernameCurrent', { current: settings.username_masked }) : t('username')}
              value={form.username}
              onChange={(value) => setForm((current) => ({ ...current, username: value }))}
              placeholder={t('leaveBlankKeepUsername')}
            />
            <Field
              label={settings?.has_password ? t('passwordStored') : t('password')}
              value={form.password}
              onChange={(value) => setForm((current) => ({ ...current, password: value }))}
              placeholder={t('leaveBlankKeepPassword')}
              type="password"
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <div className="font-medium text-slate-900">{t('status')}</div>
            <div className="mt-2 space-y-1 text-xs text-slate-600">
              <div>{t('lastTestStatus')}: {settings?.last_test_status || t('notRun')}</div>
              <div>{t('lastTestAt')}: {settings?.last_test_at ? new Date(settings.last_test_at).toLocaleString() : t('na')}</div>
              <div>{t('lastError')}: {settings?.last_error_message || t('none')}</div>
              <div>{t('updatedAt')}: {settings?.updated_at ? new Date(settings.updated_at).toLocaleString() : t('na')}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="h-11 px-6 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] font-medium transition-colors disabled:opacity-50"
            >
              {saving ? t('saving') : t('saveSettings')}
            </button>
            <button
              type="button"
              onClick={test}
              disabled={testing}
              className="h-11 px-6 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm text-slate-700 font-medium transition-colors disabled:opacity-50"
            >
              {testing ? t('testing') : t('testConnection')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
