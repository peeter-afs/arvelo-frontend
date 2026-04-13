'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, Download, Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { reportsApi, type VATReportData, type VATInvoiceSummary } from '@/lib/api/reports.api';
import { getErrorMessage } from '@/lib/api/client';
import { PageSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { downloadCsv } from '@/lib/utils/csvExport';

function getDefaultStartDate(): string {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  // Default to current month
  return `${year}-${String(month + 1).padStart(2, '0')}-01`;
}

function getDefaultEndDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function generateKmdXml(data: VATReportData): string {
  const period = data.startDate.slice(0, 7); // YYYY-MM
  return `<?xml version="1.0" encoding="UTF-8"?>
<KMD xmlns="http://www.emta.ee/KMD">
  <Header>
    <Period>${period}</Period>
  </Header>
  <Body>
    <Line1>${data.line1_taxable_22.toFixed(2)}</Line1>
    <Line2>${data.line2_taxable_9.toFixed(2)}</Line2>
    <Line3>${data.line3_taxable_0.toFixed(2)}</Line3>
    <Line4>${data.line4_output_vat.toFixed(2)}</Line4>
    <Line5>${data.line5_input_vat.toFixed(2)}</Line5>
    <Line6>${data.line6_net_vat.toFixed(2)}</Line6>
  </Body>
</KMD>`;
}

function downloadXml(xml: string, filename: string) {
  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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

  const [startDate, setStartDate] = useState(getDefaultStartDate);
  const [endDate, setEndDate] = useState(getDefaultEndDate);
  const [data, setData] = useState<VATReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
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
    fetchData();
  }, [fetchData]);

  const handleExportKmd = () => {
    if (!data) return;
    const xml = generateKmdXml(data);
    const period = data.startDate.slice(0, 7);
    downloadXml(xml, `KMD_${period}.xml`);
  };

  if (loading) {
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

          <button
            onClick={handleExportKmd}
            className="flex-1 sm:flex-none px-4 py-2 text-white rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <Download className="h-5 w-5" />
            <span>{t('kmdExport')}</span>
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
            <span>CSV</span>
          </button>
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

          <div className="ml-4 flex justify-between pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>1. {t('kmdLine1')}</span>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>&euro;{formatCurrency(data.line1_taxable_22)}</span>
          </div>
          <div className="ml-4 flex justify-between pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>2. {t('kmdLine2')}</span>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>&euro;{formatCurrency(data.line2_taxable_9)}</span>
          </div>
          <div className="ml-4 flex justify-between pb-2" style={{ borderBottom: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--text-secondary)' }}>3. {t('kmdLine3')}</span>
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>&euro;{formatCurrency(data.line3_taxable_0)}</span>
          </div>
          <div className="ml-4 flex justify-between pb-2 font-semibold" style={{ borderBottom: '2px solid var(--border)' }}>
            <span style={{ color: 'var(--text-primary)' }}>4. {t('kmdLine4')}</span>
            <span style={{ color: 'var(--text-primary)' }}>&euro;{formatCurrency(data.line4_output_vat)}</span>
          </div>

          {/* Input VAT section */}
          <h3 className="text-lg font-bold mt-6" style={{ color: 'var(--text-primary)' }}>
            {t('inputVat')}
          </h3>

          <div className="ml-4 flex justify-between pb-2 font-semibold" style={{ borderBottom: '2px solid var(--border)' }}>
            <span style={{ color: 'var(--text-primary)' }}>5. {t('kmdLine5')}</span>
            <span style={{ color: 'var(--text-primary)' }}>&euro;{formatCurrency(data.line5_input_vat)}</span>
          </div>

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
