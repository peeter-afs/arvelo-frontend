'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Repeat, Play, Pause, Trash2, X, RefreshCw, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { recurringInvoicesApi, type RecurringTemplate, type TemplateRun, type BillingMode } from '@/lib/api/recurringInvoices.api';
import { accountingApi, type PartnerOption, type AccountOption } from '@/lib/api/accounting.api';
import { getErrorMessage } from '@/lib/api/client';
import { PageSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function periodsDue(template: RecurringTemplate): number {
  if (!template.is_active || template.billing_mode === 'per_quantity') return 0;
  const today = new Date().toISOString().slice(0, 10);
  if (template.next_invoice_date > today) return 0;
  const start = new Date(template.next_invoice_date);
  const end = new Date(today);
  const diffMs = end.getTime() - start.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  switch (template.frequency) {
    case 'weekly': return Math.floor(diffDays / (7 * template.interval_count)) + 1;
    case 'monthly': {
      const months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
      return Math.floor(months / template.interval_count) + 1;
    }
    case 'quarterly': {
      const months = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth();
      return Math.floor(months / (3 * template.interval_count)) + 1;
    }
    case 'yearly': return Math.floor((end.getFullYear() - start.getFullYear()) / template.interval_count) + 1;
    default: return 1;
  }
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const billingModeLabel = (mode: BillingMode) => {
    switch (mode) {
      case 'monthly': return t('monthly');
      case 'quarterly': return t('quarterly');
      case 'yearly': return t('yearly');
      case 'per_quantity': return t('perQuantity');
      default: return mode;
    }
  };

  if (loading) return <PageSkeleton hasStats={false} tableRows={4} tableColumns={8} />;

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
            {genResult.generated > 1 && (
              <span className="ml-2" style={{ color: 'var(--text-secondary)' }}>
                {t('catchUpNote')}
              </span>
            )}
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
                <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('billingMode')}</th>
                <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('nextDate')}</th>
                <th className="text-right py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('generated')}</th>
                <th className="text-center py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{tc('status')}</th>
                <th className="text-right py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{tc('actions')}</th>
              </tr>
            </thead>
            <tbody>
              {templates.map(tmpl => {
                const lineTotal = (tmpl.lines || []).reduce((s, l) => s + l.quantity * l.unit_price, 0);
                const due = periodsDue(tmpl);
                const isExpanded = expandedId === tmpl.id;

                return (
                  <TemplateRow
                    key={tmpl.id}
                    tmpl={tmpl}
                    lineTotal={lineTotal}
                    due={due}
                    isExpanded={isExpanded}
                    onToggleExpand={() => setExpandedId(isExpanded ? null : tmpl.id)}
                    onToggle={() => handleToggle(tmpl)}
                    onDelete={() => handleDelete(tmpl.id)}
                    getPartnerName={getPartnerName}
                    billingModeLabel={billingModeLabel}
                    t={t}
                    tc={tc}
                    onRefresh={fetchData}
                  />
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

// ─── Template row with expandable runs panel ────────────────────────

function StatusPill({ tmpl, due }: { tmpl: RecurringTemplate; due: number }) {
  if (!tmpl.is_active) {
    return (
      <span className="px-2 py-0.5 rounded text-xs font-medium" style={{
        backgroundColor: 'rgba(156,163,175,0.2)', color: 'var(--text-muted)',
      }}>Paused</span>
    );
  }
  if (tmpl.latest_run_status === 'failed') {
    return (
      <span className="px-2 py-0.5 rounded text-xs font-medium" style={{
        backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444',
      }}>Failed</span>
    );
  }
  if (due > 0) {
    return (
      <span className="px-2 py-0.5 rounded text-xs font-medium" style={{
        backgroundColor: 'rgba(245,158,11,0.1)', color: '#d97706',
      }}>{due} periods due</span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded text-xs font-medium" style={{
      backgroundColor: 'rgba(22,163,74,0.1)', color: '#16a34a',
    }}>Up to date</span>
  );
}

function TemplateRow({
  tmpl, lineTotal, due, isExpanded, onToggleExpand, onToggle, onDelete,
  getPartnerName, billingModeLabel, t, tc, onRefresh,
}: {
  tmpl: RecurringTemplate;
  lineTotal: number;
  due: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onToggle: () => void;
  onDelete: () => void;
  getPartnerName: (id: string | null) => string;
  billingModeLabel: (m: BillingMode) => string;
  t: (key: string, values?: Record<string, any>) => string;
  tc: (key: string) => string;
  onRefresh: () => void;
}) {
  return (
    <>
      <tr style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--border)' }}>
        <td className="py-2.5 px-4 font-medium" style={{ color: 'var(--text-primary)' }}>
          <button onClick={onToggleExpand} className="inline-flex items-center gap-1 hover:underline">
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {tmpl.name}
          </button>
          {lineTotal > 0 && <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>&euro;{fmt(lineTotal)}</span>}
        </td>
        <td className="py-2.5 px-4" style={{ color: 'var(--text-secondary)' }}>
          {tmpl.type === 'sales_invoice' ? t('sales') : t('purchase')}
        </td>
        <td className="py-2.5 px-4" style={{ color: 'var(--text-secondary)' }}>{getPartnerName(tmpl.partner_id)}</td>
        <td className="py-2.5 px-4" style={{ color: 'var(--text-secondary)' }}>{billingModeLabel(tmpl.billing_mode)}</td>
        <td className="py-2.5 px-4" style={{ color: 'var(--text-primary)' }}>
          {tmpl.billing_mode === 'per_quantity' ? '—' : tmpl.next_invoice_date}
        </td>
        <td className="py-2.5 px-4 text-right" style={{ color: 'var(--text-secondary)' }}>{tmpl.invoices_generated}</td>
        <td className="py-2.5 px-4 text-center"><StatusPill tmpl={tmpl} due={due} /></td>
        <td className="py-2.5 px-4 text-right">
          <div className="flex gap-1 justify-end">
            <button onClick={onToggle} className="p-1.5 rounded hover:opacity-80" title={tmpl.is_active ? t('pause') : t('activate')}>
              {tmpl.is_active ? <Pause className="h-4 w-4" style={{ color: '#f59e0b' }} /> : <Play className="h-4 w-4" style={{ color: '#16a34a' }} />}
            </button>
            <button onClick={onDelete} className="p-1.5 rounded hover:opacity-80">
              <Trash2 className="h-4 w-4" style={{ color: '#ef4444' }} />
            </button>
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr style={{ borderBottom: '1px solid var(--border)' }}>
          <td colSpan={8} className="px-4 pb-4 pt-0">
            <RunsPanel templateId={tmpl.id} billingMode={tmpl.billing_mode} t={t} tc={tc} onRefresh={onRefresh} />
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Runs panel (periods log + per-quantity form) ────────────────────

function RunsPanel({ templateId, billingMode, t, tc, onRefresh }: {
  templateId: string;
  billingMode: BillingMode;
  t: (key: string, values?: Record<string, any>) => string;
  tc: (key: string) => string;
  onRefresh: () => void;
}) {
  const [runs, setRuns] = useState<TemplateRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [genForm, setGenForm] = useState({ period_start: '', period_end: '', quantity: '1', invoice_date: '' });
  const [genErr, setGenErr] = useState('');
  const [genSaving, setGenSaving] = useState(false);

  const fetchRuns = useCallback(async () => {
    setLoadingRuns(true);
    try {
      const data = await recurringInvoicesApi.listRuns(templateId);
      setRuns(data);
    } catch { /* ignore */ }
    setLoadingRuns(false);
  }, [templateId]);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  const submitPeriod = async () => {
    setGenSaving(true);
    setGenErr('');
    try {
      await recurringInvoicesApi.generatePeriod(templateId, {
        period_start: genForm.period_start,
        period_end: genForm.period_end,
        quantity: parseFloat(genForm.quantity) || undefined,
        invoice_date: genForm.invoice_date || undefined,
      });
      fetchRuns();
      onRefresh();
      setGenForm({ period_start: '', period_end: '', quantity: '1', invoice_date: '' });
    } catch (e) {
      setGenErr(getErrorMessage(e));
    } finally {
      setGenSaving(false);
    }
  };

  const inputStyle = { border: '1px solid var(--border)', color: 'var(--text-primary)', backgroundColor: 'var(--surface)' };

  const runStatusColor = (status: string) => {
    if (status === 'generated') return { bg: 'rgba(22,163,74,0.1)', color: '#16a34a' };
    if (status === 'failed') return { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' };
    return { bg: 'rgba(156,163,175,0.2)', color: 'var(--text-muted)' };
  };

  return (
    <div className="mt-2">
      <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>{t('periodsLog')}</p>

      {billingMode === 'per_quantity' && (
        <div className="p-3 rounded-lg mb-3" style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
          <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>{t('generatePeriod')}</p>
          <div className="flex gap-2 items-end flex-wrap">
            <div>
              <label className="block text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{t('periodStart')}</label>
              <input type="date" value={genForm.period_start} onChange={e => setGenForm(f => ({ ...f, period_start: e.target.value }))} className="px-2 py-1.5 rounded text-sm" style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{t('periodEnd')}</label>
              <input type="date" value={genForm.period_end} onChange={e => setGenForm(f => ({ ...f, period_end: e.target.value }))} className="px-2 py-1.5 rounded text-sm" style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs mb-0.5" style={{ color: 'var(--text-muted)' }}>{t('quantity')}</label>
              <input type="number" step="0.01" value={genForm.quantity} onChange={e => setGenForm(f => ({ ...f, quantity: e.target.value }))} className="px-2 py-1.5 rounded text-sm w-20" style={inputStyle} />
            </div>
            <button onClick={submitPeriod} disabled={genSaving || !genForm.period_start || !genForm.period_end} className="px-3 py-1.5 rounded text-sm font-medium text-white" style={{ backgroundColor: 'var(--primary)' }}>
              {genSaving ? tc('saving') : tc('create')}
            </button>
          </div>
          {genErr && <p className="text-xs mt-1" style={{ color: '#ef4444' }}>{genErr}</p>}
        </div>
      )}

      {loadingRuns ? (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Loading...</p>
      ) : runs.length === 0 ? (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('noRuns')}</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th className="text-left py-1.5 px-2 font-medium" style={{ color: 'var(--text-muted)' }}>{t('period')}</th>
              <th className="text-left py-1.5 px-2 font-medium" style={{ color: 'var(--text-muted)' }}>{t('invoiceDate')}</th>
              {billingMode === 'per_quantity' && <th className="text-right py-1.5 px-2 font-medium" style={{ color: 'var(--text-muted)' }}>{t('quantity')}</th>}
              <th className="text-center py-1.5 px-2 font-medium" style={{ color: 'var(--text-muted)' }}>{tc('status')}</th>
              <th className="text-right py-1.5 px-2 font-medium" style={{ color: 'var(--text-muted)' }}>{t('invoice')}</th>
            </tr>
          </thead>
          <tbody>
            {runs.map(run => {
              const sc = runStatusColor(run.status);
              return (
                <tr key={run.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td className="py-1.5 px-2" style={{ color: 'var(--text-primary)' }}>{run.period_start} — {run.period_end}</td>
                  <td className="py-1.5 px-2" style={{ color: 'var(--text-secondary)' }}>{run.invoice_date}</td>
                  {billingMode === 'per_quantity' && <td className="py-1.5 px-2 text-right" style={{ color: 'var(--text-secondary)' }}>{run.quantity ?? '—'}</td>}
                  <td className="py-1.5 px-2 text-center">
                    <span className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: sc.bg, color: sc.color }}>{run.status}</span>
                  </td>
                  <td className="py-1.5 px-2 text-right">
                    {run.invoice_id ? (
                      <a href={`/invoices/${run.invoice_id}`} className="inline-flex items-center gap-1 hover:underline" style={{ color: 'var(--primary)' }}>
                        <FileText className="h-3 w-3" /> View
                      </a>
                    ) : run.error ? (
                      <span title={run.error} style={{ color: '#ef4444' }}>Error</span>
                    ) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── Create template modal ──────────────────────────────────────────

function CreateTemplateModal({ partners, accounts, onClose, onCreated, t, tc }: {
  partners: PartnerOption[];
  accounts: AccountOption[];
  onClose: () => void;
  onCreated: () => void;
  t: (key: string, values?: Record<string, any>) => string;
  tc: (key: string) => string;
}) {
  const [form, setForm] = useState({
    name: '',
    type: 'sales_invoice' as const,
    partner_id: '',
    billing_mode: 'monthly' as BillingMode,
    interval_count: '1',
    day_of_month: '1',
    next_invoice_date: new Date().toISOString().slice(0, 10),
    end_date: '',
    payment_terms_days: '14',
    notes: '',
    period_note_template: '',
  });
  const [lines, setLines] = useState([{ description: '', account_id: '', quantity: '1', unit_price: '', tax_rate: '22' }]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const upd = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));
  const updLine = (i: number, k: string, v: string) => {
    setLines(prev => prev.map((l, j) => j === i ? { ...l, [k]: v } : l));
  };

  const billingModeToFrequency = (mode: BillingMode): 'weekly' | 'monthly' | 'quarterly' | 'yearly' => {
    switch (mode) {
      case 'quarterly': return 'quarterly';
      case 'yearly': return 'yearly';
      default: return 'monthly';
    }
  };

  const isCalendarMode = form.billing_mode !== 'per_quantity';

  // Live preview of period note tokens
  const previewPeriodNote = (() => {
    if (!form.period_note_template) return '';
    const now = new Date();
    const months = ['jaanuar','veebruar','märts','aprill','mai','juuni','juuli','august','september','oktoober','november','detsember'];
    const m = months[now.getMonth()];
    const y = now.getFullYear();
    return form.period_note_template
      .replace(/\{period\}/gi, `${m} ${y}`)
      .replace(/\{month\}/gi, m)
      .replace(/\{year\}/gi, String(y))
      .replace(/\{period_start\}/gi, `${y}-${String(now.getMonth()+1).padStart(2,'0')}-01`)
      .replace(/\{period_end\}/gi, `${y}-${String(now.getMonth()+1).padStart(2,'0')}-28`);
  })();

  const submit = async () => {
    setSaving(true);
    setErr('');
    try {
      await recurringInvoicesApi.create({
        name: form.name,
        type: form.type,
        partner_id: form.partner_id || undefined,
        frequency: billingModeToFrequency(form.billing_mode),
        interval_count: parseInt(form.interval_count) || 1,
        day_of_month: parseInt(form.day_of_month) || undefined,
        billing_mode: form.billing_mode,
        period_note_template: form.period_note_template || undefined,
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
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('billingMode')}</label>
              <select value={form.billing_mode} onChange={e => upd('billing_mode', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle}>
                <option value="monthly">{t('monthly')}</option>
                <option value="quarterly">{t('quarterly')}</option>
                <option value="yearly">{t('yearly')}</option>
                <option value="per_quantity">{t('perQuantity')}</option>
              </select>
            </div>
            {isCalendarMode && (
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('interval')}</label>
                <input type="number" min="1" value={form.interval_count} onChange={e => upd('interval_count', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('paymentTerms')}</label>
              <input type="number" value={form.payment_terms_days} onChange={e => upd('payment_terms_days', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
            </div>
          </div>
          {isCalendarMode && (
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
          )}
          {form.billing_mode === 'per_quantity' && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('perQuantityHint')}</p>
          )}

          {/* Period note template */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{t('periodNoteTemplate')}</label>
            <textarea
              value={form.period_note_template}
              onChange={e => upd('period_note_template', e.target.value)}
              placeholder="{period} — e.g. Subscription — {period}"
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={inputStyle}
            />
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {t('periodTokensHint')}
            </p>
            {previewPeriodNote && (
              <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                Preview: <em>{previewPeriodNote}</em>
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>{tc('notes')}</label>
            <textarea value={form.notes} onChange={e => upd('notes', e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg text-sm" style={inputStyle} />
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
                  <input type="number" placeholder={t('quantity')} value={line.quantity} onChange={e => updLine(i, 'quantity', e.target.value)} className="w-full px-2 py-1.5 rounded text-sm" style={inputStyle} />
                </div>
                <div className="col-span-2">
                  <input type="number" step="0.01" placeholder={t('price')} value={line.unit_price} onChange={e => updLine(i, 'unit_price', e.target.value)} className="w-full px-2 py-1.5 rounded text-sm" style={inputStyle} />
                </div>
                <div className="col-span-1">
                  <input type="number" placeholder={t('vatRate')} value={line.tax_rate} onChange={e => updLine(i, 'tax_rate', e.target.value)} className="w-full px-2 py-1.5 rounded text-sm" style={inputStyle} />
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
