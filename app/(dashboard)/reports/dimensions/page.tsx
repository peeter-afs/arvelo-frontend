'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Calendar, ChevronDown, ChevronRight, Download, PieChart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { reportsApi, type DimensionReportData, type DimensionReportLine, type DimensionReportRow } from '@/lib/api/reports.api';
import { getErrorMessage } from '@/lib/api/client';
import { useClientDateInput } from '@/lib/hooks/useClientDateInput';
import { downloadCsv } from '@/lib/utils/csvExport';
import { getIsoCurrentYearStart, getIsoToday } from '@/lib/utils/date';
import { PageSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';

type View = 'cost_center' | 'project';

const fmt = (n: number) => n.toLocaleString('et-EE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateText = (iso: string) => { const [y, m, d] = iso.slice(0, 10).split('-'); return `${d}.${m}.${y}`; };
const th = 'px-4 py-3 text-xs font-medium uppercase tracking-wider';
const td = 'px-4 py-3 whitespace-nowrap text-sm';

/** Revenue and costs by cost centre / project, built from invoice lines (see DimensionReportService). */
export default function DimensionReportPage() {
  const t = useTranslations('reports');
  const tAccounting = useTranslations('accounting');
  const tc = useTranslations('common');
  const tInvoices = useTranslations('invoices');

  const [startDate, setStartDate] = useClientDateInput(getIsoCurrentYearStart);
  const [endDate, setEndDate] = useClientDateInput(getIsoToday);
  const [includeDrafts, setIncludeDrafts] = useState(false);
  const [view, setView] = useState<View>('cost_center');
  const [data, setData] = useState<DimensionReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoading(true); setError(null);
    try { setData(await reportsApi.getDimensionReport(startDate, endDate, includeDrafts)); }
    catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [startDate, endDate, includeDrafts]);
  useEffect(() => { void fetchData(); }, [fetchData]);

  const rows: DimensionReportRow[] = useMemo(() => (view === 'cost_center' ? data?.cost_centers : data?.projects) || [], [data, view]);
  const linesFor = (row: DimensionReportRow): DimensionReportLine[] =>
    (data?.lines || []).filter((l) => (view === 'cost_center' ? l.cost_center_id : l.project_id) === row.id);
  const rowKey = (row: DimensionReportRow) => row.id || 'unassigned';
  const rowName = (row: DimensionReportRow) => (row.id ? row.name : t('dimUnassigned'));

  const header = (
    <div className="mb-8">
      <h1 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('dimensionReport')}</h1>
      <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>{t('dimensionReportDescription')}</p>
    </div>
  );

  if (loading || !startDate || !endDate) return <PageSkeleton hasStats tableRows={8} tableColumns={6} />;
  if (error) return <div>{header}<ErrorState message={error} onRetry={fetchData} /></div>;

  const handleExport = () => {
    downloadCsv(
      rows.map((r) => ({ code: r.code || '', name: rowName(r), cost_center: r.cost_center_name || '', partner: r.partner_name || '', revenue: r.revenue, costs: r.costs, result: r.result })),
      `${view === 'cost_center' ? 'cost-centers' : 'projects'}-${startDate}-${endDate}.csv`,
      [
        { key: 'code', label: tAccounting('dimensionCode') }, { key: 'name', label: tAccounting('dimensionName') },
        ...(view === 'project' ? [{ key: 'cost_center', label: tAccounting('parentCostCenter') }, { key: 'partner', label: t('dimPartner') }] : []),
        { key: 'revenue', label: t('dimRevenue') }, { key: 'costs', label: t('dimCosts') }, { key: 'result', label: t('dimResult') },
      ]
    );
  };

  const totals = data?.totals || { revenue: 0, costs: 0, result: 0 };
  const inputStyle = { border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' };

  return (
    <div>
      {header}

      <div className="card mb-6 flex flex-col gap-4 p-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}><Calendar className="mr-1 inline h-4 w-4" />{tAccounting('startDate')}</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="rounded-lg px-4 py-2 focus:outline-none focus:ring-2" style={inputStyle} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}><Calendar className="mr-1 inline h-4 w-4" />{tAccounting('endDate')}</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="rounded-lg px-4 py-2 focus:outline-none focus:ring-2" style={inputStyle} />
          </div>
          <div className="inline-flex rounded-lg p-1" style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
            {(['cost_center', 'project'] as View[]).map((v) => (
              <button key={v} type="button" onClick={() => { setView(v); setOpen(null); }} className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
                style={view === v ? { backgroundColor: 'var(--surface)', color: 'var(--text-primary)', boxShadow: '0 1px 2px rgba(0,0,0,.07)' } : { color: 'var(--text-secondary)' }}>
                {v === 'cost_center' ? t('dimByCostCenter') : t('dimByProject')}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 pb-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={includeDrafts} onChange={(e) => setIncludeDrafts(e.target.checked)} className="h-4 w-4" />
            {t('dimIncludeDrafts')}
          </label>
        </div>
        <button onClick={handleExport} className="flex items-center space-x-2 rounded-lg px-4 py-2 text-white transition-opacity hover:opacity-90" style={{ backgroundColor: 'var(--primary)' }}>
          <Download className="h-5 w-5" /><span>{tc('export')}</span>
        </button>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[[t('dimRevenue'), totals.revenue, 'var(--success)'], [t('dimCosts'), totals.costs, 'var(--text-primary)'], [t('dimResult'), totals.result, totals.result < 0 ? 'var(--danger, #c0392b)' : 'var(--primary)']].map(([label, value, color]) => (
          <div key={String(label)} className="card p-5">
            <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</div>
            <div className="mt-1 font-mono text-2xl font-bold tabular-nums" style={{ color: String(color) }}>{fmt(Number(value))}</div>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={PieChart} title={t('dimensionReport')} message={t('dimNoRows')} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead style={{ backgroundColor: 'var(--surface-elevated)' }}>
                <tr>
                  <th className={`${th} w-8`} />
                  <th className={`${th} text-left`} style={{ color: 'var(--text-muted)' }}>{tAccounting('dimensionCode')}</th>
                  <th className={`${th} text-left`} style={{ color: 'var(--text-muted)' }}>{tAccounting('dimensionName')}</th>
                  {view === 'project' && <th className={`${th} text-left`} style={{ color: 'var(--text-muted)' }}>{tAccounting('parentCostCenter')}</th>}
                  {view === 'project' && <th className={`${th} text-left`} style={{ color: 'var(--text-muted)' }}>{t('dimPartner')}</th>}
                  <th className={`${th} text-right`} style={{ color: 'var(--text-muted)' }}>{t('dimInvoices')}</th>
                  <th className={`${th} text-right border-l`} style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>{t('dimRevenue')}</th>
                  <th className={`${th} text-right`} style={{ color: 'var(--text-muted)' }}>{t('dimCosts')}</th>
                  <th className={`${th} text-right border-l`} style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>{t('dimResult')}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const key = rowKey(row); const expanded = open === key; const lines = expanded ? linesFor(row) : [];
                  return (
                    <Fragment key={key}>
                      <tr onClick={() => setOpen(expanded ? null : key)} className="cursor-pointer transition-colors hover:bg-[var(--surface-elevated)]" style={{ borderBottom: '1px solid var(--border)', opacity: row.is_active ? 1 : 0.6 }}>
                        <td className={`${td} pr-0`} style={{ color: 'var(--text-muted)' }} title={expanded ? t('dimHideLines') : t('dimShowLines')}>{expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</td>
                        <td className={`${td} font-mono font-bold`} style={{ color: 'var(--primary)' }}>{row.code || '—'}</td>
                        <td className={td} style={{ color: 'var(--text-primary)', fontStyle: row.id ? undefined : 'italic' }}>{rowName(row)}</td>
                        {view === 'project' && <td className={td} style={{ color: 'var(--text-secondary)' }}>{row.cost_center_name || '—'}</td>}
                        {view === 'project' && <td className={td} style={{ color: 'var(--text-secondary)' }}>{row.partner_name || '—'}</td>}
                        <td className={`${td} text-right font-mono tabular-nums`} style={{ color: 'var(--text-secondary)' }}>{row.sales_invoices + row.purchase_invoices}</td>
                        <td className={`${td} text-right font-mono tabular-nums border-l`} style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}>{row.revenue ? fmt(row.revenue) : '-'}</td>
                        <td className={`${td} text-right font-mono tabular-nums`} style={{ color: 'var(--text-primary)' }}>{row.costs ? fmt(row.costs) : '-'}</td>
                        <td className={`${td} text-right font-mono font-semibold tabular-nums border-l`} style={{ color: row.result < 0 ? 'var(--danger, #c0392b)' : 'var(--text-primary)', borderColor: 'var(--border)' }}>{fmt(row.result)}</td>
                      </tr>
                      {expanded && (
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <td colSpan={view === 'project' ? 9 : 7} className="px-4 py-3" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                            {lines.length === 0 ? (
                              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('dimNoLines')}</div>
                            ) : (
                              <table className="min-w-full text-sm">
                                <thead>
                                  <tr style={{ color: 'var(--text-muted)' }}>
                                    <th className="px-3 py-1 text-left text-[11px] font-medium uppercase tracking-wider">{t('dimDate')}</th>
                                    <th className="px-3 py-1 text-left text-[11px] font-medium uppercase tracking-wider">{t('dimInvoice')}</th>
                                    <th className="px-3 py-1 text-left text-[11px] font-medium uppercase tracking-wider">{t('dimPartner')}</th>
                                    <th className="px-3 py-1 text-left text-[11px] font-medium uppercase tracking-wider">{t('dimDescription')}</th>
                                    <th className="px-3 py-1 text-right text-[11px] font-medium uppercase tracking-wider">{t('dimRevenue')}</th>
                                    <th className="px-3 py-1 text-right text-[11px] font-medium uppercase tracking-wider">{t('dimCosts')}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {lines.map((l, i) => (
                                    <tr key={`${l.invoice_id}-${i}`} style={{ borderTop: '1px dashed var(--border)' }}>
                                      <td className="px-3 py-1.5 font-mono tabular-nums" style={{ color: 'var(--text-secondary)' }}>{dateText(l.invoice_date)}</td>
                                      <td className="px-3 py-1.5 font-mono"><Link href={`/invoices/${l.invoice_id}/edit`} className="hover:underline" style={{ color: 'var(--primary)' }}>{l.invoice_number || l.invoice_id.slice(0, 8)}</Link>{l.status === 'draft' && <span className="ml-1 text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>{tInvoices('draft')}</span>}</td>
                                      <td className="px-3 py-1.5" style={{ color: 'var(--text-secondary)' }}>{l.partner_name || '—'}</td>
                                      <td className="max-w-[420px] truncate px-3 py-1.5" style={{ color: 'var(--text-primary)' }} title={l.description}>{l.description}</td>
                                      <td className="px-3 py-1.5 text-right font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>{l.kind === 'revenue' ? fmt(l.amount) : ''}</td>
                                      <td className="px-3 py-1.5 text-right font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>{l.kind === 'cost' ? fmt(l.amount) : ''}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="font-bold" style={{ backgroundColor: 'var(--surface-elevated)', borderTop: '3px solid var(--text-primary)' }}>
                  <td colSpan={view === 'project' ? 6 : 4} className="px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>{tc('total')}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm tabular-nums border-l" style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}>{fmt(totals.revenue)}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm tabular-nums" style={{ color: 'var(--text-primary)' }}>{fmt(totals.costs)}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm tabular-nums border-l" style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}>{fmt(totals.result)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
