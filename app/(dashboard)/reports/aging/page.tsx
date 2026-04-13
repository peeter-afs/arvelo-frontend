'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, Calendar, Download } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { reportsApi, type AgingReportData } from '@/lib/api/reports.api';
import { getErrorMessage } from '@/lib/api/client';
import { PageSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { downloadCsv } from '@/lib/utils/csvExport';

function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function BucketBar({ current, d1, d31, d61, over90, total }: { current: number; d1: number; d31: number; d61: number; over90: number; total: number }) {
  if (total === 0) return null;
  const pct = (v: number) => Math.max(0, (v / total) * 100);
  return (
    <div className="flex h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
      {current > 0 && <div style={{ width: `${pct(current)}%`, backgroundColor: 'var(--success, #16a34a)' }} />}
      {d1 > 0 && <div style={{ width: `${pct(d1)}%`, backgroundColor: '#eab308' }} />}
      {d31 > 0 && <div style={{ width: `${pct(d31)}%`, backgroundColor: '#f97316' }} />}
      {d61 > 0 && <div style={{ width: `${pct(d61)}%`, backgroundColor: '#ef4444' }} />}
      {over90 > 0 && <div style={{ width: `${pct(over90)}%`, backgroundColor: '#991b1b' }} />}
    </div>
  );
}

export default function AgingReportPage() {
  const t = useTranslations('reports');
  const tc = useTranslations('common');

  const [direction, setDirection] = useState<'receivable' | 'payable'>('receivable');
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<AgingReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPartners, setExpandedPartners] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await reportsApi.getAgingReport(direction, asOfDate);
      setData(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [direction, asOfDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const togglePartner = (id: string) => {
    setExpandedPartners((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (loading) return <PageSkeleton hasStats tableRows={6} tableColumns={6} />;

  if (error) {
    return (
      <div>
        <div className="mb-6"><h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('agingReport')}</h1></div>
        <ErrorState message={error} onRetry={fetchData} />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('agingReport')}</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{t('agingReportDescription')}</p>
      </div>

      {data && data.partners.length > 0 && (
        <button
          onClick={() => {
            const rows = data.partners.map((p) => ({
              partner: p.partner_name,
              current: p.current.toFixed(2),
              '1-30': p.days_1_30.toFixed(2),
              '31-60': p.days_31_60.toFixed(2),
              '61-90': p.days_61_90.toFixed(2),
              '90+': p.over_90.toFixed(2),
              total: p.total.toFixed(2),
            }));
            downloadCsv(rows, `aging-${direction}-${asOfDate}.csv`);
          }}
          className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      )}

      {/* Controls */}
      <div className="card mb-6 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>{t('direction')}</label>
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as 'receivable' | 'payable')}
              className="px-4 py-2 rounded-lg"
              style={{ border: '1px solid var(--border)', color: 'var(--text-primary)', backgroundColor: 'var(--surface)' }}
            >
              <option value="receivable">{t('accountsReceivable')}</option>
              <option value="payable">{t('accountsPayable')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
              <Calendar className="inline h-4 w-4 mr-1" />
              {t('asOfDate')}
            </label>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="px-4 py-2 rounded-lg"
              style={{ border: '1px solid var(--border)', color: 'var(--text-primary)', backgroundColor: 'var(--surface)' }}
            />
          </div>
        </div>
      </div>

      {!data || data.partners.length === 0 ? (
        <EmptyState icon={FileText} title={t('agingReport')} message={t('noOpenInvoices')} />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <SummaryCard label={t('current')} amount={data.summary.current} color="var(--success, #16a34a)" />
            <SummaryCard label="1-30" amount={data.summary.days_1_30} color="#eab308" />
            <SummaryCard label="31-60" amount={data.summary.days_31_60} color="#f97316" />
            <SummaryCard label="61-90" amount={data.summary.days_61_90} color="#ef4444" />
            <SummaryCard label="90+" amount={data.summary.over_90} color="#991b1b" />
            <SummaryCard label={tc('total')} amount={data.summary.total} color="var(--text-primary)" />
          </div>

          {/* Overall bar */}
          <div className="card p-4 mb-6">
            <BucketBar
              current={data.summary.current}
              d1={data.summary.days_1_30}
              d31={data.summary.days_31_60}
              d61={data.summary.days_61_90}
              over90={data.summary.over_90}
              total={data.summary.total}
            />
          </div>

          {/* Partner table */}
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)', backgroundColor: 'var(--surface-elevated)' }}>
                  <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('partner')}</th>
                  <th className="text-right py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{t('current')}</th>
                  <th className="text-right py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>1-30</th>
                  <th className="text-right py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>31-60</th>
                  <th className="text-right py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>61-90</th>
                  <th className="text-right py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>90+</th>
                  <th className="text-right py-3 px-4 font-medium" style={{ color: 'var(--text-secondary)' }}>{tc('total')}</th>
                </tr>
              </thead>
              <tbody>
                {data.partners.map((partner) => (
                  <>
                    <tr
                      key={partner.partner_id}
                      className="cursor-pointer hover:opacity-80"
                      style={{ borderBottom: '1px solid var(--border)' }}
                      onClick={() => togglePartner(partner.partner_id)}
                    >
                      <td className="py-2.5 px-4 font-medium" style={{ color: 'var(--text-primary)' }}>
                        {partner.partner_name}
                        <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>({partner.invoices.length})</span>
                      </td>
                      <td className="py-2.5 px-4 text-right" style={{ color: 'var(--text-primary)' }}>{formatCurrency(partner.current)}</td>
                      <td className="py-2.5 px-4 text-right" style={{ color: partner.days_1_30 > 0 ? '#eab308' : 'var(--text-muted)' }}>{formatCurrency(partner.days_1_30)}</td>
                      <td className="py-2.5 px-4 text-right" style={{ color: partner.days_31_60 > 0 ? '#f97316' : 'var(--text-muted)' }}>{formatCurrency(partner.days_31_60)}</td>
                      <td className="py-2.5 px-4 text-right" style={{ color: partner.days_61_90 > 0 ? '#ef4444' : 'var(--text-muted)' }}>{formatCurrency(partner.days_61_90)}</td>
                      <td className="py-2.5 px-4 text-right" style={{ color: partner.over_90 > 0 ? '#991b1b' : 'var(--text-muted)' }}>{formatCurrency(partner.over_90)}</td>
                      <td className="py-2.5 px-4 text-right font-semibold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(partner.total)}</td>
                    </tr>
                    {expandedPartners.has(partner.partner_id) && partner.invoices.map((inv) => (
                      <tr key={inv.id} style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface-elevated)' }}>
                        <td className="py-2 px-4 pl-8 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {inv.invoice_number || inv.id.slice(0, 8)} &mdash; {inv.invoice_date}
                          {inv.days_overdue > 0 && (
                            <span className="ml-2" style={{ color: inv.days_overdue > 90 ? '#991b1b' : inv.days_overdue > 60 ? '#ef4444' : inv.days_overdue > 30 ? '#f97316' : '#eab308' }}>
                              {inv.days_overdue}d overdue
                            </span>
                          )}
                        </td>
                        <td colSpan={5} />
                        <td className="py-2 px-4 text-right text-xs" style={{ color: 'var(--text-primary)' }}>{formatCurrency(inv.open_amount)}</td>
                      </tr>
                    ))}
                  </>
                ))}
                {/* Totals row */}
                <tr style={{ borderTop: '3px solid var(--text-primary)' }}>
                  <td className="py-3 px-4 font-bold" style={{ color: 'var(--text-primary)' }}>{tc('total')}</td>
                  <td className="py-3 px-4 text-right font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(data.summary.current)}</td>
                  <td className="py-3 px-4 text-right font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(data.summary.days_1_30)}</td>
                  <td className="py-3 px-4 text-right font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(data.summary.days_31_60)}</td>
                  <td className="py-3 px-4 text-right font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(data.summary.days_61_90)}</td>
                  <td className="py-3 px-4 text-right font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(data.summary.over_90)}</td>
                  <td className="py-3 px-4 text-right font-bold" style={{ color: 'var(--text-primary)' }}>{formatCurrency(data.summary.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, amount, color }: { label: string; amount: number; color: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-xl font-bold mt-1" style={{ color }}>&euro;{formatCurrency(amount)}</p>
    </div>
  );
}
