'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';
import { aiInvoiceApi, type AiSettings } from '@/lib/api/aiInvoice.api';

const CLAUDE_MODELS = [
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
];

const OPENAI_MODELS = [
  { id: 'gpt-4o', label: 'GPT-4o' },
  { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
];

function modelsForProvider(provider: string) {
  if (provider === 'claude') return CLAUDE_MODELS;
  if (provider === 'openai') return OPENAI_MODELS;
  return [];
}

function defaultModelForProvider(provider: string) {
  if (provider === 'claude') return 'claude-sonnet-4-6';
  if (provider === 'openai') return 'gpt-4o';
  return '';
}

export default function AiInvoiceSettingsTab() {
  const t = useTranslations('aiInvoice');
  const tSettings = useTranslations('settings');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [provider, setProvider] = useState<string>('disabled');
  const [model, setModel] = useState('');
  const [customModel, setCustomModel] = useState(false);

  useEffect(() => {
    aiInvoiceApi
      .getSettings()
      .then((settings) => {
        setProvider(settings.ai_provider);
        setModel(settings.ai_model);
        const known = modelsForProvider(settings.ai_provider);
        setCustomModel(settings.ai_model !== '' && !known.some(m => m.id === settings.ai_model));
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    setCustomModel(false);
    setModel(defaultModelForProvider(newProvider));
  };

  const handleModelChange = (value: string) => {
    if (value === '__custom__') {
      setCustomModel(true);
      setModel('');
    } else {
      setCustomModel(false);
      setModel(value);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await aiInvoiceApi.updateSettings({
        ai_provider: provider,
        ai_model: model || undefined,
      });
      setSuccess(t('settingsSaved'));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-[var(--a-text-2)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading…
      </div>
    );
  }

  const models = modelsForProvider(provider);
  const isDisabled = provider === 'disabled';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--a-text)]">{t('settingsTitle')}</h2>
        <p className="mt-1 text-sm text-[var(--a-text-2)]">{t('settingsDescription')}</p>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-[var(--a-neg-soft)] bg-[var(--a-neg-soft)] p-3 text-sm text-[var(--a-neg)]">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 rounded-lg border border-[var(--a-pos-soft)] bg-[var(--a-pos-soft)] p-3 text-sm text-[var(--a-pos)]">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Provider */}
      <div>
        <label className="mb-1 block text-sm font-medium text-[var(--a-text)]">{t('provider')}</label>
        <select
          value={provider}
          onChange={(e) => handleProviderChange(e.target.value)}
          className="w-full max-w-xs rounded-md border border-[var(--a-border)] bg-[var(--a-surface)] px-3 py-2 text-sm text-[var(--a-text)]"
        >
          <option value="disabled">{t('providerDisabled')}</option>
          <option value="claude">{t('providerClaude')}</option>
          <option value="openai">{t('providerOpenai')}</option>
        </select>
      </div>

      {/* Model */}
      {!isDisabled && (
        <div>
          <label className="mb-1 block text-sm font-medium text-[var(--a-text)]">{t('model')}</label>
          <div className="flex items-center gap-2">
            <select
              value={customModel ? '__custom__' : model}
              onChange={(e) => handleModelChange(e.target.value)}
              className="w-full max-w-xs rounded-md border border-[var(--a-border)] bg-[var(--a-surface)] px-3 py-2 text-sm text-[var(--a-text)]"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
              <option value="__custom__">{t('modelCustom')}</option>
            </select>
            {customModel && (
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={t('modelPlaceholder')}
                className="w-full max-w-xs rounded-md border border-[var(--a-border)] bg-[var(--a-surface)] px-3 py-2 text-sm text-[var(--a-text)]"
              />
            )}
          </div>
        </div>
      )}

      {/* Note */}
      <p className="text-xs text-[var(--a-text-3)]">{t('settingsNote')}</p>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--a-accent)] px-4 text-sm font-medium text-white hover:bg-[#e74324] disabled:opacity-50"
      >
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {tSettings('saveChanges')}
      </button>
    </div>
  );
}
