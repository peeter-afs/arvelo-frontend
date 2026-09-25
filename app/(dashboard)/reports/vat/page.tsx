'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, Download, Calendar, AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { reportsApi, type KmdLineKey, type VATReportData, type VATInvoiceSummary } from '@/lib/api/reports.api';
import { getErrorMessage } from '@/lib/api/client';
import { useClientDateInput } from '@/lib/hooks/useClientDateInput';
import { PageSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { downloadCsv } from '@/lib/utils/csvExport';
import { getIsoCurrentMonthEnd, getIsoCurrentMonthStart } from '@/lib/utils/date';

function formatCurrency(amount: number): string {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type FormRow = {
  key: KmdLineKey;
  /** Line number as printed on the form. */
  num: string;
  /** Sub-line ("sh") — indented. */
  sub?: boolean;
  bold?: boolean;
  /** Arvelo has no data to tell this line apart on invoices. */
  untracked?: boolean;
};

/** KMD form (from taxation period 07.2025), top to bottom. */
const KMD_FORM: Array<{ section: 'output' | 'input' | 'other' | 'result'; rows: FormRow[] }> = [
  {
    section: 'output',
    rows: [
      { key: '1', num: '1' },
      { key: '1_1', num: '1¹' },
      { key: '1_2', num: '1²' },
      { key: '2', num: '2' },
      { key: '2_1', num: '2¹' },
      { key: '2_2', num: '2²' },
      { key: '3', num: '3' },
      { key: '3_1', num: '3.1', sub: true },
      { key: '3_1_1', num: '3.1.1', sub: true },
      { key: '3_2', num: '3.2', sub: true },
      { key: '3_2_1', num: '3.2.1', sub: true, untracked: true },
      { key: '4', num: '4', bold: true },
    ],
  },
  {
    section: 'input',
    rows: [
      { key: '5', num: '5', bold: true },
      { key: '5_1', num: '5.1', sub: true, untracked: true },
      { key: '5_2', num: '5.2', sub: true, untracked: true },
      { key: '5_3', num: '5.3', sub: true, untracked: true },
      { key: '5_4', num: '5.4', sub: true, untracked: true },
    ],
  },
  {
    section: 'other',
    rows: [
      { key: '6', num: '6' },
      { key: '6_1', num: '6.1', sub: true },
      { key: '7', num: '7', untracked: true },
      { key: '7_1', num: '7.1', sub: true, untracked: true },
      { key: '8', num: '8', untracked: true },
      { key: '9', num: '9', untracked: true },
      { key: '10', num: '10', untracked: true },
      { key: '11', num: '11', untracked: true },
    ],
  },
];

function KmdLine({ row, label, value, untrackedHint }: { row: FormRow; label: string; value: number; untrackedHint: string }) {
  const borderStyle = row.bold ? '2px solid var(--border)' : '1px solid var(--border)';
  const muted = row.untracked && value === 0;
  return (
    <div
      className={`flex justify-between gap-4 pb-2 ${row.sub ? 'ml-10 text-sm' : 'ml-4'} ${row.bold ? 'font-semibold' : ''}`}
      style={{ borderBottom: borderStyle }}
      title={row.untracked ? untrackedHint : undefined}
    >
      <span style={{ color: row.bold ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
        <span className="inline-block w-12 tabular-nums">{row.num}</span>
        {label}
      </span>
      <span className="shrink-0 font-medium tabular-nums" style={{ color: muted ? 'var(--text-muted)' : 'var(--text-primary)' }}>
        &euro;{formatCurrency(value)}
      </span>
    </div>
  );
}

function InvoiceTable({ invoices, t }: { invoices: VATInvoiceSummary[]; t: (key: string) => string }) {
  if (invoices.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border)' }}>
            <th className="text-left py-2 pr-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('invoiceNumber')}</th>
            <th className="text-left py-2 pr-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('partner')}</th>
            <th className="text-left py-2 pr-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('date')}</th>
            <th className="text-right py-2 pr-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('taxableAmount')}</th>
            <th className="text-right py-2 pr-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('vatAmount')}</th>
            <th className="text-right py-2 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('total')}</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td className="py-2 pr-4" style={{ color: 'var(--text-primary)' }}>
                {inv.invoice_number}
                {inv.type.endsWith('credit_note') && (
                  <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>({t('creditNote')})</span>
                )}
              </td>
              <td className="py-2 pr-4" style={{ color: 'var(--text-secondary)' }}>{inv.partner_name || '—'}</td>
              <td className="py-2 pr-4" style={{ color: 'var(--text-secondary)' }}>{inv.invoice_date}</td>
              <td className="py-2 pr-4 text-right" style={{ color: 'var(--text-primary)' }}>&euro;{formatCurrency(inv.subtotal)}</td>
              <td className="py-2 pr-4 text-right" style={{ color: 'var(--text-primary)' }}>&euro;{formatCurrency(inv.tax_amount)}</td>
              <td className="py-2 text-right font-medium" style={{ color: 'var(--text-primary)' }}>&euro;{formatCurrency(inv.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function VATReportPage() {
  const t = useTranslations('reports');
  const tc = useTranslations('common');

  const [startDate, setStartDate] = useClientDateInput(getIsoCurrentMonthStart);
  const [endDate, setEndDate] = useClientDateInput(getIsoCurrentMonthEnd);
  const [data, setData] = useState<VATReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!startDate || !endDate) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await reportsApi.getVATReport(startDate, endDate);
      setData(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (!startDate || !endDate) {
      return;
    }

    fetchData();
  }, [endDate, fetchData, startDate]);

  const handleExportKmd = async () => {
    if (!startDate || !endDate || !data?.period) return;
    try {
      const blob = await reportsApi.downloadKmdXml(startDate, endDate);
      const period = startDate.slice(0, 7);
      downloadBlob(blob, `KMD_${period}.xml`);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleExportKmdInf = async () => {
    if (!startDate || !endDate || !data?.period) return;
    try {
      const blob = await reportsApi.downloadKmdInfXml(startDate, endDate);
      const period = startDate.slice(0, 7);
      downloadBlob(blob, `KMD_INF_${period}.xml`);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  if (loading || !startDate || !endDate) {
    return <PageSkeleton hasStats tableRows={6} tableColumns={3} />;
  }

  if (error) {
    return (
      <div>
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {t('vatReport')}
          </h1>
        </div>
        <ErrorState message={error} onRetry={fetchData} />
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {t('vatReport')}
          </h1>
        </div>
        <EmptyState
          icon={FileText}
          title={t('vatReport')}
          message={t('noTransactions')}
        />
      </div>
    );
  }

  const canExport = data.period !== null;

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {t('vatReport')}
        </h1>
        <p className="mt-1 text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
          {t('vatReportDescription')}
        </p>
      </div>

      {/* Date Range Selector */}
      <div className="card mb-6 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                <Calendar className="inline h-4 w-4 mr-1" />
                {tc('startDate')}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full sm:w-auto px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                style={{ border: '1px solid var(--border)', color: 'var(--text-primary)', backgroundColor: 'var(--surface)' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                <Calendar className="inline h-4 w-4 mr-1" />
                {tc('endDate')}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full sm:w-auto px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                style={{ border: '1px solid var(--border)', color: 'var(--text-primary)', backgroundColor: 'var(--surface)' }}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleExportKmd}
              disabled={!canExport}
              title={canExport ? undefined : t('kmdPeriodNotMonth')}
              className="flex-1 sm:flex-none px-4 py-2 text-white rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              <Download className="h-5 w-5" />
              <span>{t('kmdExport')}</span>
            </button>
            <button
              onClick={handleExportKmdInf}
              disabled={!canExport}
              title={canExport ? undefined : t('kmdPeriodNotMonth')}
              className="flex-1 sm:flex-none px-4 py-2 text-white rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              <Download className="h-5 w-5" />
              <span>{t('kmdInfExport')}</span>
            </button>
            <button
              onClick={() => {
                if (!data) return;
                const allInvoices = [...data.sales_invoices, ...data.purchase_invoices];
                const rows = allInvoices.map((inv) => ({
                  invoice_number: inv.invoice_number,
                  type: inv.type,
                  partner: inv.partner_name || '',
                  date: inv.invoice_date,
                  subtotal: inv.subtotal.toFixed(2),
                  tax_amount: inv.tax_amount.toFixed(2),
                  total: inv.total.toFixed(2),
                }));
                downloadCsv(rows, `VAT_${startDate}_${endDate}.csv`);
              }}
              className="flex-1 sm:flex-none px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:opacity-80"
              style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              <Download className="h-5 w-5" />
              <span>{t('exportCsv')}</span>
            </button>
          </div>
        </div>
      </div>

      {!canExport && (
        <div className="card mb-6 p-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {t('kmdPeriodNotMonth')}
        </div>
      )}

      {data.warnings.length > 0 && (
        <div className="card mb-6 p-4 sm:p-6" style={{ borderLeft: '4px solid var(--warning, #d97706)' }}>
          <h3 className="mb-2 flex items-center gap-2 font-semibold" style={{ color: 'var(--text-primary)' }}>
            <AlertTriangle className="h-4 w-4" style={{ color: 'var(--warning, #d97706)' }} />
            {t('kmdWarnings')}
          </h3>
          <ul className="list-disc space-y-1 pl-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {data.warnings.map((warning, i) => <li key={i}>{warning}</li>)}
          </ul>
        </div>
      )}

      {/* KMD form */}
      <div className="card p-4 sm:p-8 mb-6">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            KMD
          </h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            {startDate} — {endDate}
          </p>
        </div>

        <div className="space-y-3">
          {KMD_FORM.map((group) => (
            <div key={group.section} className="space-y-3">
              {group.section !== 'other' && (
                <h3 className="text-lg font-bold mt-4" style={{ color: 'var(--text-primary)' }}>
                  {group.section === 'output' ? t('outputVat') : t('inputVat')}
                </h3>
              )}
              {group.section === 'other' && <div className="mt-4" />}
              {group.rows.map((row) => (
                <KmdLine
                  key={row.key}
                  row={row}
                  label={t(`kmdForm.l${row.key}`)}
                  value={data.lines[row.key]}
                  untrackedHint={t('kmdNotTracked')}
                />
              ))}
            </div>
          ))}

          {/* Result: line 12 or 13 */}
          <div
            className="flex justify-between pt-3 font-bold text-lg p-3 rounded mt-4"
            style={{ backgroundColor: 'var(--surface-elevated)', borderTop: '4px solid var(--text-primary)' }}
          >
            <span style={{ color: 'var(--text-primary)' }}>
              {data.lines['13'] > 0 ? `13 ${t('kmdForm.l13')}` : `12 ${t('kmdForm.l12')}`}
            </span>
            <span style={{ color: data.lines['13'] > 0 ? 'var(--success, #16a34a)' : 'var(--danger, #dc2626)' }}>
              &euro;{formatCurrency(data.lines['13'] > 0 ? data.lines['13'] : data.lines['12'])}
            </span>
          </div>

          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('kmdComputedNote')}</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6">
        <div className="card p-4">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('outputVat')}</p>
          <p className="text-2xl font-bold mt-2" style={{ color: 'var(--text-primary)' }}>
            &euro;{formatCurrency(data.lines['4'])}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('inputVat')}</p>
          <p className="text-2xl font-bold mt-2" style={{ color: 'var(--text-primary)' }}>
            &euro;{formatCurrency(data.lines['5'])}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>KMD INF</p>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-primary)' }}>
            {t('kmdInfCounts', { sales: data.sales_annex_count, purchases: data.purchases_annex_count })}
          </p>
        </div>
      </div>

      {/* Sales Invoices Detail */}
      {data.sales_invoices.length > 0 && (
        <div className="card p-4 sm:p-6 mb-6">
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            {t('salesInvoices')} ({data.sales_invoices.length})
          </h3>
          <InvoiceTable invoices={data.sales_invoices} t={(key) => key === 'date' ? tc('date') : key === 'total' ? tc('total') : t(key)} />
        </div>
      )}

      {/* Purchase Invoices Detail */}
      {data.purchase_invoices.length > 0 && (
        <div className="card p-4 sm:p-6">
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
            {t('purchaseInvoices')} ({data.purchase_invoices.length})
          </h3>
          <InvoiceTable invoices={data.purchase_invoices} t={(key) => key === 'date' ? tc('date') : key === 'total' ? tc('total') : t(key)} />
        </div>
      )}
    </div>
  );
}
