'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, Download, Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { reportsApi, type VATReportData, type VATInvoiceSummary } from '@/lib/api/reports.api';
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

function KmdLine({ num, label, value, bold }: { num: number; label: string; value: number; bold?: boolean }) {
  const cls = bold ? 'font-semibold' : '';
  const borderStyle = bold ? '2px solid var(--border)' : '1px solid var(--border)';
  return (
    <div className={`ml-4 flex justify-between pb-2 ${cls}`} style={{ borderBottom: borderStyle }}>
      <span style={{ color: bold ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
        {num}. {label}
      </span>
      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
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
              <td className="py-2 pr-4" style={{ color: 'var(--text-primary)' }}>{inv.invoice_number}</td>
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
    if (!startDate || !endDate) return;
    try {
      const blob = await reportsApi.downloadKmdXml(startDate, endDate);
      const period = startDate.slice(0, 7);
      downloadBlob(blob, `KMD_${period}.xml`);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleExportKmdInf = async () => {
    if (!startDate || !endDate) return;
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

  const isPayable = data.line6_net_vat > 0;

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
              className="flex-1 sm:flex-none px-4 py-2 text-white rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              <Download className="h-5 w-5" />
              <span>{t('kmdExport')}</span>
            </button>
            <button
              onClick={handleExportKmdInf}
              className="flex-1 sm:flex-none px-4 py-2 text-white rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
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

      {/* KMD Summary */}
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
          {/* Output VAT section */}
          <h3 className="text-lg font-bold mt-2" style={{ color: 'var(--text-primary)' }}>
            {t('outputVat')}
          </h3>

          <KmdLine num={1} label={t('kmdLine1')} value={data.line1_taxable_22} />
          <KmdLine num={2} label={t('kmdLine2')} value={data.line2_taxable_9} />
          <KmdLine num={3} label={t('kmdLine3')} value={data.line3_taxable_0} />
          <KmdLine num={4} label={t('kmdLine4')} value={data.line4_output_vat} bold />

          {/* Input VAT section */}
          <h3 className="text-lg font-bold mt-6" style={{ color: 'var(--text-primary)' }}>
            {t('inputVat')}
          </h3>

          <KmdLine num={5} label={t('kmdLine5')} value={data.line5_input_vat} bold />

          {/* Net VAT */}
          <div
            className="flex justify-between pt-3 font-bold text-lg p-3 rounded mt-4"
            style={{ backgroundColor: 'var(--surface-elevated)', borderTop: '4px solid var(--text-primary)' }}
          >
            <span style={{ color: 'var(--text-primary)' }}>
              6. {t('kmdLine6')}
            </span>
            <span style={{ color: isPayable ? 'var(--danger, #dc2626)' : 'var(--success, #16a34a)' }}>
              &euro;{formatCurrency(Math.abs(data.line6_net_vat))}
              {' '}
              <span className="text-sm font-normal">
                ({isPayable ? t('vatPayable') : t('vatRefundable')})
              </span>
            </span>
          </div>

          {/* Intra-community / Reverse charge / Third country */}
          <h3 className="text-lg font-bold mt-6" style={{ color: 'var(--text-primary)' }}>
            {t('intraCommunityAndOther')}
          </h3>

          <KmdLine num={7} label={t('kmdLine7')} value={data.line7_intra_community_supply} />
          <KmdLine num={8} label={t('kmdLine8')} value={data.line8_intra_community_vat} />
          <KmdLine num={9} label={t('kmdLine9')} value={data.line9_reverse_charge_supply} />
          <KmdLine num={10} label={t('kmdLine10')} value={data.line10_reverse_charge_vat} />
          <KmdLine num={11} label={t('kmdLine11')} value={data.line11_third_country_supply} />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6">
        <div className="card p-4">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('outputVat')}</p>
          <p className="text-2xl font-bold mt-2" style={{ color: 'var(--text-primary)' }}>
            &euro;{formatCurrency(data.line4_output_vat)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('inputVat')}</p>
          <p className="text-2xl font-bold mt-2" style={{ color: 'var(--text-primary)' }}>
            &euro;{formatCurrency(data.line5_input_vat)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('netVat')}</p>
          <p className="text-2xl font-bold mt-2" style={{ color: isPayable ? 'var(--danger, #dc2626)' : 'var(--success, #16a34a)' }}>
            &euro;{formatCurrency(data.line6_net_vat)}
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
