'use client';

import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, ShieldOff, Copy, Check, KeyRound, Trash2, Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { QRCodeSVG } from 'qrcode.react';
import { startRegistration } from '@simplewebauthn/browser';
import apiClient from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/auth.store';
import { TenantTwoFactorPolicyCard } from '@/components/settings/TenantTwoFactorPolicyCard';
import { getErrorMessage } from '@/lib/api/client';

type ApiResponse<T> = { success: boolean; data: T };

type PasskeyRow = {
  id: string;
  device_name: string | null;
  created_at: string;
  last_used_at: string | null;
};

export default function SecuritySettingsPage() {
  const t = useTranslations('twoFactor');
  const tc = useTranslations('common');
  const role = useAuthStore((state) => state.role);
  const canManagePolicy = role === 'owner' || role === 'admin';

  const [enabled, setEnabled] = useState(false);
  const [totpEnabled, setTotpEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Setup flow
  const [setupData, setSetupData] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDisable, setShowDisable] = useState(false);

  // Passkeys
  const [passkeys, setPasskeys] = useState<PasskeyRow[]>([]);
  const [passkeyBusy, setPasskeyBusy] = useState(false);

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, passkeysRes] = await Promise.all([
        apiClient.get<ApiResponse<{ enabled: boolean; totp_enabled: boolean; passkey_count: number }>>('/api/auth/2fa/status'),
        apiClient.get<ApiResponse<PasskeyRow[]>>('/api/auth/2fa/webauthn/credentials'),
      ]);
      setEnabled(statusRes.data.data.enabled);
      setTotpEnabled(statusRes.data.data.totp_enabled);
      setPasskeys(passkeysRes.data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleAddPasskey = async () => {
    setError('');
    setPasskeyBusy(true);
    try {
      const { data } = await apiClient.post<ApiResponse<{ options: unknown; challenge_token: string }>>(
        '/api/auth/2fa/webauthn/register/options'
      );
      const attestation = await startRegistration({ optionsJSON: data.data.options as never });
      await apiClient.post('/api/auth/2fa/webauthn/register/verify', {
        challenge_token: data.data.challenge_token,
        response: attestation,
      });
      await fetchStatus();
    } catch (err) {
      // User cancelling the browser passkey dialog throws NotAllowedError
      if ((err as Error)?.name !== 'NotAllowedError') {
        setError(getErrorMessage(err));
      }
    } finally {
      setPasskeyBusy(false);
    }
  };

  const handleRemovePasskey = async (id: string) => {
    setError('');
    setPasskeyBusy(true);
    try {
      await apiClient.delete(`/api/auth/2fa/webauthn/credentials/${id}`);
      await fetchStatus();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setPasskeyBusy(false);
    }
  };

  const handleSetup = async () => {
    setError('');
    try {
      const { data } = await apiClient.post<ApiResponse<{ secret: string; otpauthUri: string }>>('/api/auth/2fa/setup');
      setSetupData(data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleEnable = async () => {
    setSaving(true);
    setError('');
    try {
      await apiClient.post('/api/auth/2fa/enable', { code: verifyCode });
      setEnabled(true);
      setTotpEnabled(true);
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
      await apiClient.post('/api/auth/2fa/disable', { code: disableCode });
      setTotpEnabled(false);
      setEnabled(passkeys.length > 0);
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

      {canManagePolicy && <TenantTwoFactorPolicyCard />}

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
            {totpEnabled ? (
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
                  {/* Rendered locally so the TOTP secret never leaves the browser */}
                  <QRCodeSVG value={setupData.otpauthUri} size={200} />
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

      {/* Passkeys */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-4 mb-1">
          <KeyRound className="h-8 w-8" style={{ color: passkeys.length > 0 ? '#16a34a' : '#9ca3af' }} />
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t('passkeys.title')}</h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('passkeys.description')}</p>
          </div>
          <div className="ml-auto">
            <button
              onClick={handleAddPasskey}
              disabled={passkeyBusy}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              {passkeyBusy ? tc('saving') : t('passkeys.add')}
            </button>
          </div>
        </div>

        {passkeys.length > 0 && (
          <div className="mt-4 divide-y" style={{ borderColor: 'var(--border)' }}>
            {passkeys.map(pk => (
              <div key={pk.id} className="flex items-center gap-3 py-3">
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {pk.device_name || t('passkeys.unnamed')}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {t('passkeys.added')} {new Date(pk.created_at).toLocaleDateString()}
                    {pk.last_used_at && ` · ${t('passkeys.lastUsed')} ${new Date(pk.last_used_at).toLocaleDateString()}`}
                  </p>
                </div>
                <button
                  onClick={() => handleRemovePasskey(pk.id)}
                  disabled={passkeyBusy}
                  className="p-2 rounded disabled:opacity-50"
                  style={{ color: '#ef4444' }}
                  title={t('passkeys.remove')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Email backup info */}
      {enabled && (
        <div className="card p-6 mb-6">
          <div className="flex items-center gap-4">
            <Mail className="h-8 w-8" style={{ color: '#2563eb' }} />
            <div>
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t('emailBackup.title')}</h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('emailBackup.description')}</p>
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
