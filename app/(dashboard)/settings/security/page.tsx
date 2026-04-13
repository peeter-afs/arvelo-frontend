'use client';

import { useState, useEffect, useCallback } from 'react';
import { Shield, ShieldCheck, ShieldOff, Copy, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import apiClient from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/client';

type ApiResponse<T> = { success: boolean; data: T };

export default function SecuritySettingsPage() {
  const t = useTranslations('twoFactor');
  const tc = useTranslations('common');

  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Setup flow
  const [setupData, setSetupData] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDisable, setShowDisable] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<ApiResponse<{ enabled: boolean }>>('/auth/2fa/status');
      setEnabled(data.data.enabled);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleSetup = async () => {
    setError('');
    try {
      const { data } = await apiClient.post<ApiResponse<{ secret: string; otpauthUri: string }>>('/auth/2fa/setup');
      setSetupData(data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleEnable = async () => {
    setSaving(true);
    setError('');
    try {
      await apiClient.post('/auth/2fa/enable', { code: verifyCode });
      setEnabled(true);
      setSetupData(null);
      setVerifyCode('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async () => {
    setSaving(true);
    setError('');
    try {
      await apiClient.post('/auth/2fa/disable', { code: disableCode });
      setEnabled(false);
      setShowDisable(false);
      setDisableCode('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const copySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const inputStyle = { border: '1px solid var(--border)', color: 'var(--text-primary)', backgroundColor: 'var(--surface)' };

  if (loading) {
    return (
      <div>
        <div className="mb-6"><h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('title')}</h1></div>
        <div className="card p-6 animate-pulse"><div className="h-8 rounded" style={{ backgroundColor: 'var(--surface-elevated)', width: '200px' }}></div></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('title')}</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{t('description')}</p>
      </div>

      {/* Status Card */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-4">
          {enabled ? (
            <ShieldCheck className="h-10 w-10" style={{ color: '#16a34a' }} />
          ) : (
            <ShieldOff className="h-10 w-10" style={{ color: '#9ca3af' }} />
          )}
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              {enabled ? t('enabled') : t('disabled')}
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {enabled ? t('enabledDescription') : t('disabledDescription')}
            </p>
          </div>
          <div className="ml-auto">
            {enabled ? (
              <button
                onClick={() => setShowDisable(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{ border: '1px solid #ef4444', color: '#ef4444' }}
              >
                {t('disable')}
              </button>
            ) : !setupData ? (
              <button
                onClick={handleSetup}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                style={{ backgroundColor: 'var(--primary)' }}
              >
                {t('setup')}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {error && (
        <div className="card p-4 mb-6" style={{ borderLeft: '3px solid #ef4444' }}>
          <p className="text-sm" style={{ color: '#ef4444' }}>{error}</p>
        </div>
      )}

      {/* Setup Flow */}
      {setupData && !enabled && (
        <div className="card p-6 mb-6">
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{t('setupTitle')}</h3>

          <div className="space-y-4">
            {/* Step 1: QR Code */}
            <div>
              <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{t('step1')}</p>
              <div className="flex items-center gap-4">
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'white', border: '1px solid var(--border)' }}>
                  {/* QR code rendered via Google Charts API */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setupData.otpauthUri)}`}
                    alt="TOTP QR Code"
                    width={200}
                    height={200}
                  />
                </div>
                <div className="flex-1">
                  <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{t('manualEntry')}</p>
                  <div className="flex items-center gap-2">
                    <code className="px-3 py-2 rounded text-sm font-mono break-all" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}>
                      {setupData.secret}
                    </code>
                    <button onClick={copySecret} className="p-2 rounded" style={{ color: 'var(--text-muted)' }}>
                      {copied ? <Check className="h-4 w-4" style={{ color: '#16a34a' }} /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Verify */}
            <div>
              <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{t('step2')}</p>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={verifyCode}
                  onChange={e => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-40 px-3 py-2 rounded-lg text-lg font-mono text-center tracking-widest"
                  style={inputStyle}
                />
                <button
                  onClick={handleEnable}
                  disabled={saving || verifyCode.length !== 6}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  {saving ? tc('saving') : t('verify')}
                </button>
                <button
                  onClick={() => { setSetupData(null); setVerifyCode(''); }}
                  className="px-4 py-2 rounded-lg text-sm"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {tc('cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disable Modal */}
      {showDisable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="card p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>{t('disableTitle')}</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>{t('disableDescription')}</p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={disableCode}
              onChange={e => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-3 py-2 rounded-lg text-lg font-mono text-center tracking-widest mb-4"
              style={inputStyle}
            />
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowDisable(false); setDisableCode(''); }} className="px-4 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                {tc('cancel')}
              </button>
              <button
                onClick={handleDisable}
                disabled={saving || disableCode.length !== 6}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: '#ef4444' }}
              >
                {saving ? tc('saving') : t('disable')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
