'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Download, TrendingDown, DollarSign, Wallet, ChevronDown, ChevronRight, Calendar, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { fixedAssetsApi, type FixedAsset, type AssetCategory, type DepreciationEntry } from '@/lib/api/fixedAssets.api';
import { accountingApi, type AccountOption } from '@/lib/api/accounting.api';
import { getErrorMessage } from '@/lib/api/client';
import { PageSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { downloadCsv } from '@/lib/utils/csvExport';

function fmt(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AssetsPage() {
  const t = useTranslations('assets');
  const tc = useTranslations('common');

  const [assets, setAssets] = useState<FixedAsset[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [expandedAsset, setExpandedAsset] = useState<string | null>(null);
  const [depreciation, setDepreciation] = useState<Record<string, DepreciationEntry[]>>({});

  // Modals
  const [showCreateAsset, setShowCreateAsset] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [showDispose, setShowDispose] = useState<string | null>(null);
  const [showGenerate, setShowGenerate] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, c, acc] = await Promise.all([
        fixedAssetsApi.listAssets(statusFilter || undefined),
        fixedAssetsApi.listCategories(),
        accountingApi.getAccounts(),
      ]);
      setAssets(a);
      setCategories(c);
      setAccounts(acc);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleExpand = async (assetId: string) => {
    if (expandedAsset === assetId) {
      setExpandedAsset(null);
      return;
    }
    setExpandedAsset(assetId);
    if (!depreciation[assetId]) {
      try {
        const schedule = await fixedAssetsApi.getDepreciationSchedule(assetId);
        setDepreciation(prev => ({ ...prev, [assetId]: schedule }));
      } catch { /* ignore */ }
    }
  };

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name || '-';

  const filtered = assets.filter(a => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return a.name.toLowerCase().includes(q) || a.asset_code.toLowerCase().includes(q);
  });

  const totalCost = filtered.reduce((s, a) => s + a.acquisition_cost, 0);
  const totalSalvage = filtered.reduce((s, a) => s + a.salvage_value, 0);

  if (loading) return <PageSkeleton hasStats tableRows={5} tableColumns={6} />;

  if (error) {
    return (
      <div>
        <div className="mb-6"><h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('title')}</h1></div>
        <ErrorState message={error} onRetry={fetchData} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('title')}</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{t('description')}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 sm:items-center sm:justify-between">
        <div className="flex gap-3 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-lg text-sm"
              style={{ border: '1px solid var(--border)', color: 'var(--text-primary)', backgroundColor: 'var(--surface)' }}
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm"
            style={{ border: '1px solid var(--border)', color: 'var(--text-primary)', backgroundColor: 'var(--surface)' }}
          >
            <option value="">{t('allStatuses')}</option>
            <option value="active">{t('active')}</option>
            <option value="disposed">{t('disposed')}</option>
          </select>
        </div>
        <div className="flex gap-2">
          {filtered.length > 0 && (
            <button
              onClick={() => {
                const rows = filtered.map(a => ({
                  code: a.asset_code,
                  name: a.name,
                  category: getCategoryName(a.category_id),
                  acquisition_date: a.acquisition_date,
                  cost: a.acquisition_cost.toFixed(2),
                  salvage: a.salvage_value.toFixed(2),
                  method: a.depreciation_method,
                  status: a.status,
                }));
                downloadCsv(rows, 'fixed-assets.csv');
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              <Download className="h-4 w-4" /> CSV
            </button>
          )}
          <button
            onClick={() => setShowCreateCategory(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
          >
            {t('newCategory')}
          </button>
          <button
            onClick={() => setShowCreateAsset(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <Plus className="h-4 w-4 inline mr-1" />{t('newAsset')}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-1">
            <DollarSign className="h-5 w-5" style={{ color: 'var(--primary)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{t('totalCost')}</span>
          </div>
          <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>&euro;{fmt(totalCost)}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-1">
            <TrendingDown className="h-5 w-5" style={{ color: '#f59e0b' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{t('totalDepreciable')}</span>
          </div>
          <p className="text-xl font-bold" style={{ color: '#f59e0b' }}>&euro;{fmt(totalCost - totalSalvage)}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-1">
            <Wallet className="h-5 w-5" style={{ color: 'var(--success, #16a34a)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{t('assetCount')}</span>
          </div>
          <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{filtered.length}</p>
        </div>
      </div>

      {/* Assets table */}
      {filtered.length === 0 ? (
        <EmptyState icon={DollarSign} title={t('title')} message={t('noAssets')} />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', backgroundColor: 'var(--surface-elevated)' }}>
                <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}></th>
                <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('code')}</th>
                <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('assetName')}</th>
                <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('category')}</th>
                <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('acquisitionDate')}</th>
                <th className="text-right py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('cost')}</th>
                <th className="text-right py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('salvageValue')}</th>
                <th className="text-center py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('method')}</th>
                <th className="text-center py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('status')}</th>
                <th className="text-right py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(asset => (
                <>
                  <tr
                    key={asset.id}
                    className="cursor-pointer hover:opacity-80"
                    style={{ borderBottom: '1px solid var(--border)' }}
                    onClick={() => toggleExpand(asset.id)}
                  >
                    <td className="py-2.5 px-4">
                      {expandedAsset === asset.id ? <ChevronDown className="h-4 w-4" style={{ color: 'var(--text-muted)' }} /> : <ChevronRight className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>{asset.asset_code}</td>
                    <td className="py-2.5 px-4 font-medium" style={{ color: 'var(--text-primary)' }}>{asset.name}</td>
                    <td className="py-2.5 px-4" style={{ color: 'var(--text-secondary)' }}>{getCategoryName(asset.category_id)}</td>
                    <td className="py-2.5 px-4" style={{ color: 'var(--text-secondary)' }}>{asset.acquisition_date}</td>
                    <td className="py-2.5 px-4 text-right" style={{ color: 'var(--text-primary)' }}>&euro;{fmt(asset.acquisition_cost)}</td>
                    <td className="py-2.5 px-4 text-right" style={{ color: 'var(--text-secondary)' }}>&euro;{fmt(asset.salvage_value)}</td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-secondary)' }}>
                        {asset.depreciation_method === 'straight_line' ? t('straightLine') : t('decliningBalance')}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-xs font-medium" style={{
                        backgroundColor: asset.status === 'active' ? 'rgba(22,163,74,0.1)' : 'rgba(239,68,68,0.1)',
                        color: asset.status === 'active' ? '#16a34a' : '#ef4444',
                      }}>
                        {asset.status === 'active' ? t('active') : t('disposed')}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right" onClick={e => e.stopPropagation()}>
                      {asset.status === 'active' && (
                        <div className="flex gap-1 justify-end">
                          <button
                            onClick={() => setShowGenerate(asset.id)}
                            className="px-2 py-1 rounded text-xs"
                            style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                          >
                            {t('depreciate')}
                          </button>
                          <button
                            onClick={() => setShowDispose(asset.id)}
                            className="px-2 py-1 rounded text-xs"
                            style={{ color: '#ef4444' }}
                          >
                            {t('dispose')}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                  {expandedAsset === asset.id && (
                    <tr key={`${asset.id}-dep`} style={{ backgroundColor: 'var(--surface-elevated)' }}>
                      <td colSpan={10} className="p-4">
                        <DepreciationTable entries={depreciation[asset.id] || []} t={t} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Asset Modal */}
      {showCreateAsset && (
        <CreateAssetModal
          categories={categories}
          onClose={() => setShowCreateAsset(false)}
          onCreated={() => { setShowCreateAsset(false); fetchData(); }}
          t={t}
          tc={tc}
        />
      )}

      {/* Create Category Modal */}
      {showCreateCategory && (
        <CreateCategoryModal
          accounts={accounts}
          onClose={() => setShowCreateCategory(false)}
          onCreated={() => { setShowCreateCategory(false); fetchData(); }}
          t={t}
          tc={tc}
        />
      )}

      {/* Dispose Modal */}
      {showDispose && (
        <DisposeModal
          assetId={showDispose}
          onClose={() => setShowDispose(null)}
          onDisposed={() => { setShowDispose(null); fetchData(); }}
          t={t}
          tc={tc}
        />
      )}

      {/* Generate Depreciation Modal */}
      {showGenerate && (
        <GenerateDepreciationModal
          assetId={showGenerate}
          onClose={() => setShowGenerate(null)}
          onGenerated={(assetId, entries) => {
            setDepreciation(prev => ({ ...prev, [assetId]: entries }));
            setShowGenerate(null);
          }}
          t={t}
          tc={tc}
        />
      )}
    </div>
  );
}

function DepreciationTable({ entries, t }: { entries: DepreciationEntry[]; t: (key: string) => string }) {
  if (entries.length === 0) return <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('noDepreciation')}</p>;
  return (
    <table className="w-full text-xs">
      <thead>
        <tr style={{ borderBottom: '1px solid var(--border)' }}>
          <th className="text-left py-2 px-3 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('period')}</th>
          <th className="text-right py-2 px-3 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('depAmount')}</th>
          <th className="text-right py-2 px-3 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('accumulated')}</th>
          <th className="text-right py-2 px-3 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('netBookValue')}</th>
          <th className="text-center py-2 px-3 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('posted')}</th>
        </tr>
      </thead>
      <tbody>
        {entries.map(e => (
          <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
            <td className="py-1.5 px-3" style={{ color: 'var(--text-primary)' }}>{e.period_date}</td>
            <td className="py-1.5 px-3 text-right" style={{ color: 'var(--text-primary)' }}>&euro;{fmt(e.depreciation_amount)}</td>
            <td className="py-1.5 px-3 text-right" style={{ color: 'var(--text-secondary)' }}>&euro;{fmt(e.accumulated_depreciation)}</td>
            <td className="py-1.5 px-3 text-right font-medium" style={{ color: 'var(--text-primary)' }}>&euro;{fmt(e.net_book_value)}</td>
            <td className="py-1.5 px-3 text-center">{e.is_posted ? '✓' : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4" style={{ color: 'var(--text-muted)' }}><X className="h-5 w-5" /></button>
        {children}
      </div>
    </div>
  );
}

function CreateAssetModal({ categories, onClose, onCreated, t, tc }: {
  categories: AssetCategory[];
  onClose: () => void;
  onCreated: () => void;
  t: (key: string) => string;
  tc: (key: string) => string;
}) {
  const [form, setForm] = useState({
    category_id: categories[0]?.id || '',
    asset_code: '',
    name: '',
    description: '',
    acquisition_date: new Date().toISOString().slice(0, 10),
    in_service_date: new Date().toISOString().slice(0, 10),
    acquisition_cost: '',
    salvage_value: '0',
    useful_life_months: '',
    depreciation_method: 'straight_line' as const,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setSaving(true);
    setErr('');
    try {
      await fixedAssetsApi.createAsset({
        ...form,
        acquisition_cost: parseFloat(form.acquisition_cost),
        salvage_value: parseFloat(form.salvage_value),
        useful_life_months: parseInt(form.useful_life_months),
      });
      onCreated();
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const upd = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{t('newAsset')}</h2>
      <div className="space-y-3">
        <Field label={t('category')}>
          <select value={form.category_id} onChange={e => upd('category_id', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-primary)', backgroundColor: 'var(--surface)' }}>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('code')}><input value={form.asset_code} onChange={e => upd('asset_code', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-primary)', backgroundColor: 'var(--surface)' }} /></Field>
          <Field label={t('assetName')}><input value={form.name} onChange={e => upd('name', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-primary)', backgroundColor: 'var(--surface)' }} /></Field>
        </div>
        <Field label={t('descriptionLabel')}><input value={form.description} onChange={e => upd('description', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-primary)', backgroundColor: 'var(--surface)' }} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('acquisitionDate')}><input type="date" value={form.acquisition_date} onChange={e => upd('acquisition_date', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-primary)', backgroundColor: 'var(--surface)' }} /></Field>
          <Field label={t('inServiceDate')}><input type="date" value={form.in_service_date} onChange={e => upd('in_service_date', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-primary)', backgroundColor: 'var(--surface)' }} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label={t('cost')}><input type="number" step="0.01" value={form.acquisition_cost} onChange={e => upd('acquisition_cost', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-primary)', backgroundColor: 'var(--surface)' }} /></Field>
          <Field label={t('salvageValue')}><input type="number" step="0.01" value={form.salvage_value} onChange={e => upd('salvage_value', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-primary)', backgroundColor: 'var(--surface)' }} /></Field>
          <Field label={t('usefulLifeMonths')}><input type="number" value={form.useful_life_months} onChange={e => upd('useful_life_months', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-primary)', backgroundColor: 'var(--surface)' }} /></Field>
        </div>
        <Field label={t('method')}>
          <select value={form.depreciation_method} onChange={e => upd('depreciation_method', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-primary)', backgroundColor: 'var(--surface)' }}>
            <option value="straight_line">{t('straightLine')}</option>
            <option value="declining_balance">{t('decliningBalance')}</option>
          </select>
        </Field>
        {err && <p className="text-sm" style={{ color: '#ef4444' }}>{err}</p>}
        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{tc('cancel')}</button>
          <button onClick={submit} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: 'var(--primary)' }}>
            {saving ? tc('saving') : tc('create')}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

function CreateCategoryModal({ accounts, onClose, onCreated, t, tc }: {
  accounts: AccountOption[];
  onClose: () => void;
  onCreated: () => void;
  t: (key: string) => string;
  tc: (key: string) => string;
}) {
  const [form, setForm] = useState({
    name: '',
    asset_account_id: '',
    depreciation_account_id: '',
    expense_account_id: '',
    default_useful_life_months: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setSaving(true);
    setErr('');
    try {
      await fixedAssetsApi.createCategory({
        name: form.name,
        asset_account_id: form.asset_account_id,
        depreciation_account_id: form.depreciation_account_id,
        expense_account_id: form.expense_account_id,
        default_useful_life_months: form.default_useful_life_months ? parseInt(form.default_useful_life_months) : undefined,
      });
      onCreated();
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const upd = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));
  const acctOpts = accounts.filter(a => a.is_active);

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{t('newCategory')}</h2>
      <div className="space-y-3">
        <Field label={t('categoryName')}><input value={form.name} onChange={e => upd('name', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-primary)', backgroundColor: 'var(--surface)' }} /></Field>
        <Field label={t('assetAccount')}>
          <select value={form.asset_account_id} onChange={e => upd('asset_account_id', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-primary)', backgroundColor: 'var(--surface)' }}>
            <option value="">—</option>
            {acctOpts.map(a => <option key={a.id} value={a.id}>{a.code} – {a.name}</option>)}
          </select>
        </Field>
        <Field label={t('depreciationAccount')}>
          <select value={form.depreciation_account_id} onChange={e => upd('depreciation_account_id', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-primary)', backgroundColor: 'var(--surface)' }}>
            <option value="">—</option>
            {acctOpts.map(a => <option key={a.id} value={a.id}>{a.code} – {a.name}</option>)}
          </select>
        </Field>
        <Field label={t('expenseAccount')}>
          <select value={form.expense_account_id} onChange={e => upd('expense_account_id', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-primary)', backgroundColor: 'var(--surface)' }}>
            <option value="">—</option>
            {acctOpts.map(a => <option key={a.id} value={a.id}>{a.code} – {a.name}</option>)}
          </select>
        </Field>
        <Field label={t('defaultLifeMonths')}><input type="number" value={form.default_useful_life_months} onChange={e => upd('default_useful_life_months', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-primary)', backgroundColor: 'var(--surface)' }} /></Field>
        {err && <p className="text-sm" style={{ color: '#ef4444' }}>{err}</p>}
        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{tc('cancel')}</button>
          <button onClick={submit} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: 'var(--primary)' }}>
            {saving ? tc('saving') : tc('create')}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

function DisposeModal({ assetId, onClose, onDisposed, t, tc }: {
  assetId: string;
  onClose: () => void;
  onDisposed: () => void;
  t: (key: string) => string;
  tc: (key: string) => string;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState('0');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setSaving(true);
    setErr('');
    try {
      await fixedAssetsApi.disposeAsset(assetId, { disposal_date: date, disposal_amount: parseFloat(amount) });
      onDisposed();
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{t('disposeAsset')}</h2>
      <div className="space-y-3">
        <Field label={t('disposalDate')}><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-primary)', backgroundColor: 'var(--surface)' }} /></Field>
        <Field label={t('disposalAmount')}><input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-primary)', backgroundColor: 'var(--surface)' }} /></Field>
        {err && <p className="text-sm" style={{ color: '#ef4444' }}>{err}</p>}
        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{tc('cancel')}</button>
          <button onClick={submit} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#ef4444' }}>
            {saving ? tc('saving') : t('dispose')}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

function GenerateDepreciationModal({ assetId, onClose, onGenerated, t, tc }: {
  assetId: string;
  onClose: () => void;
  onGenerated: (assetId: string, entries: DepreciationEntry[]) => void;
  t: (key: string) => string;
  tc: (key: string) => string;
}) {
  const [upToDate, setUpToDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setSaving(true);
    setErr('');
    try {
      const entries = await fixedAssetsApi.generateDepreciation(assetId, upToDate);
      onGenerated(assetId, entries);
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{t('generateDepreciation')}</h2>
      <div className="space-y-3">
        <Field label={t('upToDate')}>
          <input type="date" value={upToDate} onChange={e => setUpToDate(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-primary)', backgroundColor: 'var(--surface)' }} />
        </Field>
        {err && <p className="text-sm" style={{ color: '#ef4444' }}>{err}</p>}
        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{tc('cancel')}</button>
          <button onClick={submit} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: 'var(--primary)' }}>
            {saving ? tc('saving') : t('generate')}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      {children}
    </div>
  );
}
