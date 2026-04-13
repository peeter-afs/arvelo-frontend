'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Repeat, Play, Pause, Trash2, X, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { recurringInvoicesApi, type RecurringTemplate } from '@/lib/api/recurringInvoices.api';
import { accountingApi, type PartnerOption, type AccountOption } from '@/lib/api/accounting.api';
import { getErrorMessage } from '@/lib/api/client';
import { PageSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';

function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function RecurringInvoicesPage() {
  const t = useTranslations('recurring');
  const tc = useTranslations('common');

  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<{ generated: number; errors: number } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, p, a] = await Promise.all([
        recurringInvoicesApi.list(),
        accountingApi.getPartners(),
        accountingApi.getAccounts(),
      ]);
      setTemplates(t);
      setPartners(p);
      setAccounts(a);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleToggle = async (template: RecurringTemplate) => {
    try {
      await recurringInvoicesApi.update(template.id, { is_active: !template.is_active });
      fetchData();
    } catch { /* ignore */ }
  };

  const handleDelete = async (id: string) => {
    try {
      await recurringInvoicesApi.delete(id);
      fetchData();
    } catch { /* ignore */ }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setGenResult(null);
    try {
      const result = await recurringInvoicesApi.generateDue();
      setGenResult(result);
      fetchData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGenerating(false);
    }
  };

  const getPartnerName = (id: string | null) => {
    if (!id) return '—';
    return partners.find(p => p.id === id)?.name || id.slice(0, 8);
  };

  const freqLabel = (f: string, interval: number) => {
    const base = t(f);
    return interval > 1 ? `${t('every')} ${interval} ${base}` : base;
  };

  if (loading) return <PageSkeleton hasStats={false} tableRows={4} tableColumns={6} />;

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
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('title')}</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{t('description')}</p>
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2"
          style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
          {t('generateNow')}
        </button>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white inline-flex items-center gap-2"
          style={{ backgroundColor: 'var(--primary)' }}
        >
          <Plus className="h-4 w-4" /> {t('newTemplate')}
        </button>
      </div>

      {genResult && (
        <div className="card p-4 mb-6" style={{ borderLeft: '3px solid var(--success, #16a34a)' }}>
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
            {t('generatedResult', { generated: genResult.generated, errors: genResult.errors })}
          </p>
        </div>
      )}

      {templates.length === 0 ? (
        <EmptyState icon={Repeat} title={t('title')} message={t('noTemplates')} />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', backgroundColor: 'var(--surface-elevated)' }}>
                <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('templateName')}</th>
                <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('type')}</th>
                <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{tc('partner')}</th>
                <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('frequency')}</th>
                <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('nextDate')}</th>
                <th className="text-right py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('generated')}</th>
                <th className="text-center py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{tc('status')}</th>
                <th className="text-right py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{tc('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {templates.map(tmpl => {
                const lineTotal = (tmpl.lines || []).reduce((s, l) => s + l.quantity * l.unit_price, 0);
                return (
                  <tr key={tmpl.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="py-2.5 px-4 font-medium" style={{ color: 'var(--text-primary)' }}>
                      {tmpl.name}
                      {lineTotal > 0 && <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>&euro;{fmt(lineTotal)}</span>}
                    </td>
                    <td className="py-2.5 px-4" style={{ color: 'var(--text-secondary)' }}>
                      {tmpl.type === 'sales_invoice' ? t('sales') : t('purchase')}
                    </td>
                    <td className="py-2.5 px-4" style={{ color: 'var(--text-secondary)' }}>{getPartnerName(tmpl.partner_id)}</td>
                    <td className="py-2.5 px-4" style={{ color: 'var(--text-secondary)' }}>{freqLabel(tmpl.frequency, tmpl.interval_count)}</td>
                    <td className="py-2.5 px-4" style={{ color: 'var(--text-primary)' }}>{tmpl.next_invoice_date}</td>
                    <td className="py-2.5 px-4 text-right" style={{ color: 'var(--text-secondary)' }}>{tmpl.invoices_generated}</td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="px-2 py-0.5 rounded text-xs font-medium" style={{
                        backgroundColor: tmpl.is_active ? 'rgba(22,163,74,0.1)' : 'rgba(156,163,175,0.2)',
                        color: tmpl.is_active ? '#16a34a' : 'var(--text-muted)',
                      }}>
                        {tmpl.is_active ? t('active') : t('paused')}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => handleToggle(tmpl)} className="p-1.5 rounded hover:opacity-80" title={tmpl.is_active ? t('pause') : t('activate')}>
                          {tmpl.is_active ? <Pause className="h-4 w-4" style={{ color: '#f59e0b' }} /> : <Play className="h-4 w-4" style={{ color: '#16a34a' }} />}
                        </button>
                        <button onClick={() => handleDelete(tmpl.id)} className="p-1.5 rounded hover:opacity-80">
                          <Trash2 className="h-4 w-4" style={{ color: '#ef4444' }} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateTemplateModal
          partners={partners}
          accounts={accounts}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); fetchData(); }}
          t={t}
          tc={tc}
        />
      )}
    </div>
  );
}

function CreateTemplateModal({ partners, accounts, onClose, onCreated, t, tc }: {
  partners: PartnerOption[];
  accounts: AccountOption[];
  onClose: () => void;
  onCreated: () => void;
  t: (key: string) => string;
  tc: (key: string) => string;
}) {
  const [form, setForm] = useState({
    name: '',
    type: 'sales_invoice' as const,
    partner_id: '',
    frequency: 'monthly' as const,
    interval_count: '1',
    day_of_month: '1',
    next_invoice_date: new Date().toISOString().slice(0, 10),
    end_date: '',
    payment_terms_days: '14',
    notes: '',
  });
  const [lines, setLines] = useState([{ description: '', account_id: '', quantity: '1', unit_price: '', tax_rate: '22' }]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const upd = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));
  const updLine = (i: number, k: string, v: string) => {
    setLines(prev => prev.map((l, j) => j === i ? { ...l, [k]: v } : l));
  };

  const submit = async () => {
    setSaving(true);
    setErr('');
    try {
      await recurringInvoicesApi.create({
        name: form.name,
        type: form.type,
        partner_id: form.partner_id || undefined,
        frequency: form.frequency,
        interval_count: parseInt(form.interval_count) || 1,
        day_of_month: parseInt(form.day_of_month) || undefined,
        next_invoice_date: form.next_invoice_date,
        end_date: form.end_date || undefined,
        payment_terms_days: parseInt(form.payment_terms_days) || 14,
        notes: form.notes || undefined,
        lines: lines.filter(l => l.description && l.unit_price).map(l => ({
          description: l.description,
          account_id: l.account_id || undefined,
          quantity: parseFloat(l.quantity) || 1,
          unit_price: parseFloat(l.unit_price),
          tax_rate: parseFloat(l.tax_rate) ?? 22,
        })),
      });
      onCreated();
    } catch (e) {
      setErr(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { border: '1px solid var(--border)', color: 'var(--text-primary)', backgroundColor: 'var(--surface)' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4" style={{ color: 'var(--text-muted)' }}><X className="h-5 w-5" /></button>
        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>{t('newTemplate')}</h2>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('templateName')}</label>
              <input value={form.name} onChange={e => upd('name', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('type')}</label>
              <select value={form.type} onChange={e => upd('type', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle}>
                <option value="sales_invoice">{t('sales')}</option>
                <option value="purchase_invoice">{t('purchase')}</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{tc('partner')}</label>
            <select value={form.partner_id} onChange={e => upd('partner_id', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle}>
              <option value="">—</option>
              {partners.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('frequency')}</label>
              <select value={form.frequency} onChange={e => upd('frequency', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle}>
                <option value="weekly">{t('weekly')}</option>
                <option value="monthly">{t('monthly')}</option>
                <option value="quarterly">{t('quarterly')}</option>
                <option value="yearly">{t('yearly')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('interval')}</label>
              <input type="number" min="1" value={form.interval_count} onChange={e => upd('interval_count', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('paymentTerms')}</label>
              <input type="number" value={form.payment_terms_days} onChange={e => upd('payment_terms_days', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('nextDate')}</label>
              <input type="date" value={form.next_invoice_date} onChange={e => upd('next_invoice_date', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('endDate')}</label>
              <input type="date" value={form.end_date} onChange={e => upd('end_date', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
            </div>
          </div>

          {/* Lines */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>{t('lines')}</label>
            {lines.map((line, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 mb-2">
                <div className="col-span-4">
                  <input placeholder={tc('description')} value={line.description} onChange={e => updLine(i, 'description', e.target.value)} className="w-full px-2 py-1.5 rounded text-sm" style={inputStyle} />
                </div>
                <div className="col-span-3">
                  <select value={line.account_id} onChange={e => updLine(i, 'account_id', e.target.value)} className="w-full px-2 py-1.5 rounded text-sm" style={inputStyle}>
                    <option value="">—</option>
                    {accounts.filter(a => a.is_active).map(a => <option key={a.id} value={a.id}>{a.code} – {a.name}</option>)}
                  </select>
                </div>
                <div className="col-span-1">
                  <input type="number" placeholder="Qty" value={line.quantity} onChange={e => updLine(i, 'quantity', e.target.value)} className="w-full px-2 py-1.5 rounded text-sm" style={inputStyle} />
                </div>
                <div className="col-span-2">
                  <input type="number" step="0.01" placeholder={t('price')} value={line.unit_price} onChange={e => updLine(i, 'unit_price', e.target.value)} className="w-full px-2 py-1.5 rounded text-sm" style={inputStyle} />
                </div>
                <div className="col-span-1">
                  <input type="number" placeholder="VAT%" value={line.tax_rate} onChange={e => updLine(i, 'tax_rate', e.target.value)} className="w-full px-2 py-1.5 rounded text-sm" style={inputStyle} />
                </div>
                <div className="col-span-1 flex items-center">
                  {lines.length > 1 && (
                    <button onClick={() => setLines(prev => prev.filter((_, j) => j !== i))} style={{ color: '#ef4444' }}><X className="h-4 w-4" /></button>
                  )}
                </div>
              </div>
            ))}
            <button
              onClick={() => setLines(prev => [...prev, { description: '', account_id: '', quantity: '1', unit_price: '', tax_rate: '22' }])}
              className="text-sm mt-1"
              style={{ color: 'var(--primary)' }}
            >
              + {t('addLine')}
            </button>
          </div>

          {err && <p className="text-sm" style={{ color: '#ef4444' }}>{err}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>{tc('cancel')}</button>
            <button onClick={submit} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: 'var(--primary)' }}>
              {saving ? tc('saving') : tc('create')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
