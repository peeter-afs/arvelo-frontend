'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Plus, X, Globe } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { exchangeRatesApi, type ExchangeRate } from '@/lib/api/exchangeRates.api';
import { getErrorMessage } from '@/lib/api/client';
import { PageSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';

export default function ExchangeRatesPage() {
  const t = useTranslations('exchangeRates');
  const tc = useTranslations('common');

  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [filterCurrency, setFilterCurrency] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await exchangeRatesApi.list(filterCurrency ? { target_currency: filterCurrency } : undefined);
      setRates(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filterCurrency]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleFetchEcb = async () => {
    setFetching(true);
    try {
      const result = await exchangeRatesApi.fetchEcb();
      setError(null);
      fetchData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setFetching(false);
    }
  };

  // Get unique currencies
  const currencies = [...new Set(rates.map(r => r.target_currency))].sort();

  if (loading) return <PageSkeleton hasStats={false} tableRows={8} tableColumns={5} />;

  if (error && !rates.length) {
    return (
      <div>
        <div className="mb-6"><h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('title')}</h1></div>
        <ErrorState message={error} onRetry={fetchData} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('title')}</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{t('description')}</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6 sm:items-center sm:justify-between">
        <select
          value={filterCurrency}
          onChange={e => setFilterCurrency(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm"
          style={{ border: '1px solid var(--border)', color: 'var(--text-primary)', backgroundColor: 'var(--surface)' }}
        >
          <option value="">{t('allCurrencies')}</option>
          {currencies.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <div className="flex gap-2">
          <button
            onClick={handleFetchEcb}
            disabled={fetching}
            className="px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            <RefreshCw className={`h-4 w-4 ${fetching ? 'animate-spin' : ''}`} />
            {t('fetchEcb')}
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white inline-flex items-center gap-2"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <Plus className="h-4 w-4" /> {t('addRate')}
          </button>
        </div>
      </div>

      {rates.length === 0 ? (
        <EmptyState icon={Globe} title={t('title')} message={t('noRates')} />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', backgroundColor: 'var(--surface-elevated)' }}>
                <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('date')}</th>
                <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('from')}</th>
                <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('to')}</th>
                <th className="text-right py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('rate')}</th>
                <th className="text-center py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('source')}</th>
              </tr>
            </thead>
            <tbody>
              {rates.map(rate => (
                <tr key={rate.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="py-2.5 px-4" style={{ color: 'var(--text-primary)' }}>{rate.rate_date}</td>
                  <td className="py-2.5 px-4 font-mono" style={{ color: 'var(--text-secondary)' }}>{rate.source_currency}</td>
                  <td className="py-2.5 px-4 font-mono font-medium" style={{ color: 'var(--text-primary)' }}>{rate.target_currency}</td>
                  <td className="py-2.5 px-4 text-right font-mono" style={{ color: 'var(--text-primary)' }}>{rate.rate.toFixed(6)}</td>
                  <td className="py-2.5 px-4 text-center">
                    <span className="px-2 py-0.5 rounded text-xs font-medium" style={{
                      backgroundColor: rate.source === 'ecb' ? 'rgba(59,130,246,0.1)' : 'rgba(156,163,175,0.2)',
                      color: rate.source === 'ecb' ? '#3b82f6' : 'var(--text-muted)',
                    }}>
                      {rate.source === 'ecb' ? 'ECB' : t('manual')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddRateModal
          onClose={() => setShowAdd(false)}
          onAdded={() => { setShowAdd(false); fetchData(); }}
          t={t}
          tc={tc}
        />
      )}
    </div>
  );
}

function AddRateModal({ onClose, onAdded, t, tc }: {
  onClose: () => void;
  onAdded: () => void;
  t: (key: string) => string;
  tc: (key: string) => string;
}) {
  const [form, setForm] = useState({
    source_currency: 'EUR',
    target_currency: '',
    rate_date: new Date().toISOString().slice(0, 10),
    rate: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setSaving(true);
    setErr('');
    try {
      await exchangeRatesApi.setRate({
        ...form,
        rate: parseFloat(form.rate),
      });
      onAdded();
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { border: '1px solid var(--border)', color: 'var(--text-primary)', backgroundColor: 'var(--surface)' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="card p-6 w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-4 right-4" style={{ color: 'var(--text-muted)' }}><X className="h-5 w-5" /></button>
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{t('addRate')}</h2>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('from')}</label>
              <input value={form.source_currency} onChange={e => setForm(p => ({ ...p, source_currency: e.target.value.toUpperCase() }))} maxLength={3} className="w-full px-3 py-2 rounded-lg text-sm font-mono" style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('to')}</label>
              <input value={form.target_currency} onChange={e => setForm(p => ({ ...p, target_currency: e.target.value.toUpperCase() }))} maxLength={3} className="w-full px-3 py-2 rounded-lg text-sm font-mono" style={inputStyle} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('date')}</label>
            <input type="date" value={form.rate_date} onChange={e => setForm(p => ({ ...p, rate_date: e.target.value }))} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('rate')}</label>
            <input type="number" step="0.000001" value={form.rate} onChange={e => setForm(p => ({ ...p, rate: e.target.value }))} className="w-full px-3 py-2 rounded-lg text-sm font-mono" style={inputStyle} />
          </div>
          {err && <p className="text-sm" style={{ color: '#ef4444' }}>{err}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{tc('cancel')}</button>
            <button onClick={submit} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: 'var(--primary)' }}>
              {saving ? tc('saving') : tc('save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
