'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { tenantSecurityApi, type TenantTwoFactorPolicy } from '@/lib/api/tenantSecurity.api';
import { getErrorMessage } from '@/lib/api/client';

/**
 * Company-wide 2FA requirement. Three states come from one timestamp on the
 * server: off, scheduled (new tenants get a runway before it switches itself
 * on), and active.
 */
export function TenantTwoFactorPolicyCard() {
  const t = useTranslations('twoFactor');

  const [policy, setPolicy] = useState<TenantTwoFactorPolicy | null>(null);
  const [graceDays, setGraceDays] = useState(14);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await tenantSecurityApi.getPolicy();
      setPolicy(data);
      setGraceDays(data.grace_days);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (enabled: boolean, days: number) => {
    setSaving(true);
    setError('');
    try {
      const data = await tenantSecurityApi.updatePolicy({ enabled, grace_days: days });
      setPolicy(data);
      setGraceDays(data.grace_days);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  // Owners/admins only: the endpoint 403s for everyone else, and there is
  // nothing useful to show them here.
  if (!loading && !policy) return null;

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString();

  return (
    <div className="card p-6 mb-6">
      <div className="flex items-start gap-4">
        <ShieldCheck className="h-6 w-6 flex-shrink-0" style={{ color: 'var(--primary)' }} />
        <div className="flex-1">
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t('companyPolicyTitle')}</h3>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{t('companyPolicyDescription')}</p>

          {loading || !policy ? (
            <div className="mt-4 h-8 w-48 animate-pulse rounded" style={{ backgroundColor: 'var(--surface-elevated)' }} />
          ) : (
            <>
              <label className="mt-4 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={policy.required}
                  disabled={saving}
                  onChange={(e) => void save(e.target.checked, graceDays)}
                  className="h-4 w-4"
                />
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {t('companyPolicyToggle')}
                </span>
                {saving && <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--text-muted)' }} />}
              </label>

              {policy.scheduled_from && (
                <p className="mt-2 text-sm" style={{ color: 'var(--warning, #b45309)' }}>
                  {t('companyPolicyScheduled', { date: formatDate(policy.scheduled_from) })}
                </p>
              )}

              <div className="mt-4 flex items-end gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    {t('companyPolicyGraceLabel')}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={365}
                    value={graceDays}
                    disabled={saving}
                    onChange={(e) => setGraceDays(Number(e.target.value))}
                    onBlur={() => {
                      if (graceDays !== policy.grace_days) void save(policy.required, graceDays);
                    }}
                    className="h-9 w-24 rounded-lg px-3 text-sm"
                    style={{ border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
                  />
                </div>
                <p className="pb-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{t('companyPolicyGraceHint')}</p>
              </div>
            </>
          )}

          {error && <p className="mt-3 text-sm" style={{ color: '#ef4444' }}>{error}</p>}
        </div>
      </div>
    </div>
  );
}
