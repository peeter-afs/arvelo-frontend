'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Calendar, ChevronDown, ChevronRight, Download, PieChart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { reportsApi, type DimensionAccountRow, type DimensionReportData, type DimensionReportLine, type DimensionReportRow } from '@/lib/api/reports.api';
import { costCentersApi, projectsApi, dimensionLabel, type CostCenter, type Project } from '@/lib/api/dimensions.api';
import { getErrorMessage } from '@/lib/api/client';
import { useClientDateInput } from '@/lib/hooks/useClientDateInput';
import { downloadCsv } from '@/lib/utils/csvExport';
import { getIsoCurrentYearStart, getIsoToday } from '@/lib/utils/date';
import { PageSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';

type View = 'cost_center' | 'project';

const fmt = (n: number) => n.toLocaleString('et-EE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n: number | null | undefined) => (n === null || n === undefined ? '—' : `${n.toLocaleString('et-EE', { maximumFractionDigits: 1 })}%`);
const dateText = (iso: string) => { const [y, m, d] = iso.slice(0, 10).split('-'); return `${d}.${m}.${y}`; };
const th = 'px-4 py-3 text-xs font-medium uppercase tracking-wider';
const td = 'px-4 py-3 whitespace-nowrap text-sm';
const subTh = 'px-3 py-1 text-[11px] font-medium uppercase tracking-wider';

/** Revenue, costs and lõpetamata tööd by cost centre / project, from the general ledger (see DimensionReportService). */
export default function DimensionReportPage() {
  const t = useTranslations('reports');
  const tAccounting = useTranslations('accounting');
  const tc = useTranslations('common');
  const tInvoices = useTranslations('invoices');

  const [startDate, setStartDate] = useClientDateInput(getIsoCurrentYearStart);
  const [endDate, setEndDate] = useClientDateInput(getIsoToday);
  const [includeDrafts, setIncludeDrafts] = useState(false);
  const [view, setView] = useState<View>('project');
  const [projectFilter, setProjectFilter] = useState('');
  const [costCenterFilter, setCostCenterFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'in_progress' | 'completed'>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [data, setData] = useState<DimensionReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    projectsApi.list({ include_inactive: true }).then(setProjects).catch(() => {});
    costCentersApi.list({ include_inactive: true }).then(setCostCenters).catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoading(true); setError(null);
    try {
      setData(await reportsApi.getDimensionReport(startDate, endDate, includeDrafts, { project_id: projectFilter || undefined, cost_center_id: costCenterFilter || undefined, project_status: statusFilter || undefined }));
    }
    catch (err) { setError(getErrorMessage(err)); }
    finally { setLoading(false); }
  }, [startDate, endDate, includeDrafts, projectFilter, costCenterFilter, statusFilter]);
  useEffect(() => { void fetchData(); }, [fetchData]);

  const rows: DimensionReportRow[] = useMemo(() => (view === 'cost_center' ? data?.cost_centers : data?.projects) || [], [data, view]);
  const rowKey = (row: DimensionReportRow) => row.id || 'unassigned';
  const linesFor = (row: DimensionReportRow): DimensionReportLine[] =>
    (data?.lines || []).filter((l) => (view === 'cost_center' ? l.cost_center_id : l.project_id) === row.id);
  const accountsFor = (row: DimensionReportRow): DimensionAccountRow[] =>
    (view === 'cost_center' ? data?.by_account?.cost_centers : data?.by_account?.projects)?.[rowKey(row)] || [];
  const rowName = (row: DimensionReportRow) => (row.id ? row.name : t('dimUnassigned'));
  const showWip = rows.some((r) => r.wip_balance) || !!data?.totals.wip_balance;
  const showDrafts = includeDrafts;

  const header = (
    <div className="mb-6 sm:mb-8">
      <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('dimensionReport')}</h1>
      <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>{t('dimensionReportDescription')}</p>
    </div>
  );

  if (loading || !startDate || !endDate) return <PageSkeleton hasStats tableRows={8} tableColumns={6} />;
  if (error) return <div>{header}<ErrorState message={error} onRetry={fetchData} /></div>;

  const handleExport = () => {
    downloadCsv(
      rows.map((r) => ({
        code: r.code || '', name: rowName(r), cost_center: r.cost_center_name || '', partner: r.partner_name || '',
        status: r.id && r.status ? (r.status === 'completed' ? t('dimStatusCompleted') : t('dimStatusInProgress')) : '', completed_at: r.completed_at || '',
        revenue: r.revenue, costs: r.costs, result: r.result, margin: r.margin_pct ?? '', wip: r.wip_balance ?? 0,
        draft_revenue: r.draft_revenue ?? 0, draft_costs: r.draft_costs ?? 0,
      })),
      `${view === 'cost_center' ? 'cost-centers' : 'projects'}-${startDate}-${endDate}.csv`,
      [
        { key: 'code', label: tAccounting('dimensionCode') }, { key: 'name', label: tAccounting('dimensionName') },
        ...(view === 'project' ? [{ key: 'cost_center', label: tAccounting('parentCostCenter') }, { key: 'partner', label: t('dimPartner') }, { key: 'status', label: t('dimStatus') }, { key: 'completed_at', label: t('dimCompletedAt') }] : []),
        { key: 'revenue', label: t('dimRevenue') }, { key: 'costs', label: t('dimCosts') }, { key: 'result', label: t('dimResult') },
        { key: 'margin', label: t('dimMargin') }, { key: 'wip', label: t('dimWip') },
        ...(showDrafts ? [{ key: 'draft_revenue', label: t('dimDraftRevenue') }, { key: 'draft_costs', label: t('dimDraftCosts') }] : []),
      ]
    );
  };

  const totals = data?.totals || { revenue: 0, costs: 0, result: 0 };
  const inputStyle = { border: '1px solid var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' };
  const labelCols = view === 'project' ? 7 : 4;
  const colCount = labelCols + 4 + (showWip ? 1 : 0) + (showDrafts ? 2 : 0);
  const cards: Array<[string, number, string]> = [
    [t('dimRevenue'), totals.revenue, 'var(--success)'],
    [t('dimCosts'), totals.costs, 'var(--text-primary)'],
    [t('dimResult'), totals.result, totals.result < 0 ? 'var(--danger, #c0392b)' : 'var(--primary)'],
    ...(showWip ? [[t('dimWip'), totals.wip_balance || 0, 'var(--text-primary)'] as [string, number, string]] : []),
  ];

  const docCell = (l: DimensionReportLine) => {
    if (l.invoice_id) {
      return (
        <Link href={`/invoices/${l.invoice_id}/edit`} className="hover:underline" style={{ color: 'var(--primary)' }}>{l.invoice_number || l.invoice_id.slice(0, 8)}</Link>
      );
    }
    if (l.source_document_schema?.startsWith('accounting.project_wip_release')) {
      return <Link href={`/accounting/projects/wip${l.project_id ? `?project=${l.project_id}` : ''}`} className="hover:underline" style={{ color: 'var(--primary)' }}>{t('dimWipRelease')}</Link>;
    }
    return <span style={{ color: 'var(--text-secondary)' }}>{l.entry_number ? `#${l.entry_number}` : t('dimJournalEntry')}</span>;
  };

  return (
    <div>
      {header}

      {data?.basis === 'invoices' && (
        <div className="mb-4 rounded-lg border px-4 py-3 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', backgroundColor: 'var(--surface-elevated)' }}>{t('dimInvoiceBasis')}</div>
      )}

      <div className="card mb-6 flex flex-col gap-4 p-4 sm:p-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="grid grid-cols-2 items-end gap-3 sm:flex sm:flex-wrap sm:gap-4">
          <div className="min-w-0">
            <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}><Calendar className="mr-1 inline h-4 w-4" />{tAccounting('startDate')}</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full sm:w-auto rounded-lg px-4 py-2 focus:outline-none focus:ring-2" style={inputStyle} />
          </div>
          <div className="min-w-0">
            <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}><Calendar className="mr-1 inline h-4 w-4" />{tAccounting('endDate')}</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full sm:w-auto rounded-lg px-4 py-2 focus:outline-none focus:ring-2" style={inputStyle} />
          </div>
          <div className="min-w-0">
            <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{t('dimByProject')}</label>
            <select value={projectFilter} onChange={(e) => { setProjectFilter(e.target.value); setOpen(null); }} className="w-full sm:w-48 rounded-lg px-3 py-2" style={inputStyle}>
              <option value="">{t('dimAll')}</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{dimensionLabel(p)}</option>)}
            </select>
          </div>
          <div className="min-w-0">
            <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{t('dimByCostCenter')}</label>
            <select value={costCenterFilter} onChange={(e) => { setCostCenterFilter(e.target.value); setOpen(null); }} className="w-full sm:w-48 rounded-lg px-3 py-2" style={inputStyle}>
              <option value="">{t('dimAll')}</option>
              {costCenters.map((c) => <option key={c.id} value={c.id}>{dimensionLabel(c)}</option>)}
            </select>
          </div>
          <div className="min-w-0">
            <label className="mb-2 block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{t('dimStatus')}</label>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as '' | 'in_progress' | 'completed'); setOpen(null); }} className="w-full sm:w-40 rounded-lg px-3 py-2" style={inputStyle}>
              <option value="">{t('dimAll')}</option>
              <option value="in_progress">{t('dimStatusInProgress')}</option>
              <option value="completed">{t('dimStatusCompleted')}</option>
            </select>
          </div>
          <div className="col-span-2 flex sm:inline-flex rounded-lg p-1" style={{ backgroundColor: 'var(--surface-elevated)', border: '1px solid var(--border)' }}>
            {(['project', 'cost_center'] as View[]).map((v) => (
              <button key={v} type="button" onClick={() => { setView(v); setOpen(null); }} className="max-sm:flex-1 max-sm:min-h-9 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
                style={view === v ? { backgroundColor: 'var(--surface)', color: 'var(--text-primary)', boxShadow: '0 1px 2px rgba(0,0,0,.07)' } : { color: 'var(--text-secondary)' }}>
                {v === 'cost_center' ? t('dimByCostCenter') : t('dimByProject')}
              </button>
            ))}
          </div>
          <label className="col-span-2 flex items-center gap-2 pb-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={includeDrafts} onChange={(e) => setIncludeDrafts(e.target.checked)} className="h-4 w-4" />
            {t('dimIncludeDrafts')}
          </label>
        </div>
        <button onClick={handleExport} className="flex items-center max-sm:justify-center space-x-2 rounded-lg px-4 py-2 text-white transition-opacity hover:opacity-90" style={{ backgroundColor: 'var(--primary)' }}>
          <Download className="h-5 w-5" /><span>{tc('export')}</span>
        </button>
      </div>

      <div className={`mb-6 grid grid-cols-2 gap-3 sm:gap-4 ${cards.length === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
        {cards.map(([label, value, color]) => (
          <div key={label} className={`card min-w-0 p-4 sm:p-5 ${cards.length === 3 ? 'last:col-span-2 sm:last:col-span-1' : ''}`}>
            <div className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</div>
            <div className="mt-1 font-mono text-lg sm:text-2xl font-bold tabular-nums max-sm:truncate" style={{ color }}>{fmt(Number(value))}</div>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState icon={PieChart} title={t('dimensionReport')} message={t('dimNoRows')} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto print:overflow-visible">
            <table className="min-w-full">
              <thead style={{ backgroundColor: 'var(--surface-elevated)' }}>
                <tr>
                  <th className={`${th} w-8`} />
                  <th className={`${th} text-left`} style={{ color: 'var(--text-muted)' }}>{tAccounting('dimensionCode')}</th>
                  <th className={`${th} text-left max-sm:sticky max-sm:left-0 max-sm:z-[1] max-sm:bg-[var(--surface-elevated)]`} style={{ color: 'var(--text-muted)' }}>{tAccounting('dimensionName')}</th>
                  {view === 'project' && <th className={`${th} text-left`} style={{ color: 'var(--text-muted)' }}>{tAccounting('parentCostCenter')}</th>}
                  {view === 'project' && <th className={`${th} text-left`} style={{ color: 'var(--text-muted)' }}>{t('dimPartner')}</th>}
                  {view === 'project' && <th className={`${th} text-left`} style={{ color: 'var(--text-muted)' }}>{t('dimStatus')}</th>}
                  <th className={`${th} text-right`} style={{ color: 'var(--text-muted)' }}>{t('dimInvoices')}</th>
                  <th className={`${th} text-right border-l`} style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>{t('dimRevenue')}</th>
                  <th className={`${th} text-right`} style={{ color: 'var(--text-muted)' }}>{t('dimCosts')}</th>
                  <th className={`${th} text-right border-l`} style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>{t('dimResult')}</th>
                  <th className={`${th} text-right`} style={{ color: 'var(--text-muted)' }}>{t('dimMargin')}</th>
                  {showWip && <th className={`${th} text-right border-l`} style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }} title={t('dimWipHint')}>{t('dimWip')}</th>}
                  {showDrafts && <th className={`${th} text-right border-l`} style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>{t('dimDraftRevenue')}</th>}
                  {showDrafts && <th className={`${th} text-right`} style={{ color: 'var(--text-muted)' }}>{t('dimDraftCosts')}</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const key = rowKey(row); const expanded = open === key;
                  const lines = expanded ? linesFor(row) : [];
                  const accounts = expanded ? accountsFor(row) : [];
                  return (
                    <Fragment key={key}>
                      <tr onClick={() => setOpen(expanded ? null : key)} className="cursor-pointer transition-colors hover:bg-[var(--surface-elevated)]" style={{ borderBottom: '1px solid var(--border)', opacity: row.is_active ? 1 : 0.6 }}>
                        <td className={`${td} pr-0`} style={{ color: 'var(--text-muted)' }} title={expanded ? t('dimHideLines') : t('dimShowLines')}>{expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</td>
                        <td className={`${td} font-mono font-bold`} style={{ color: 'var(--primary)' }}>{row.code || '—'}</td>
                        <td className={`${td} max-sm:sticky max-sm:left-0 max-sm:z-[1] max-sm:max-w-[160px] max-sm:truncate max-sm:bg-[var(--a-surface)]`} style={{ color: 'var(--text-primary)', fontStyle: row.id ? undefined : 'italic' }} title={rowName(row)}>{rowName(row)}</td>
                        {view === 'project' && <td className={td} style={{ color: 'var(--text-secondary)' }}>{row.cost_center_name || '—'}</td>}
                        {view === 'project' && <td className={td} style={{ color: 'var(--text-secondary)' }}>{row.partner_name || '—'}</td>}
                        {view === 'project' && (
                          <td className={td}>
                            {row.id ? (
                              <span className="inline-flex items-center gap-1.5">
                                <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${row.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-sky-50 text-sky-700'}`} title={row.completed_at ? t('dimCompletedOn', { date: dateText(row.completed_at) }) : undefined}>
                                  {row.status === 'completed' ? t('dimStatusCompleted') : t('dimStatusInProgress')}
                                </span>
                                {row.status === 'completed' && (row.wip_balance || 0) !== 0 && (
                                  <span title={t('dimCompletedWithWip')} className="text-amber-600"><AlertTriangle className="h-4 w-4" /></span>
                                )}
                              </span>
                            ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                          </td>
                        )}
                        <td className={`${td} text-right font-mono tabular-nums`} style={{ color: 'var(--text-secondary)' }}>{row.sales_invoices + row.purchase_invoices}</td>
                        <td className={`${td} text-right font-mono tabular-nums border-l`} style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}>{row.revenue ? fmt(row.revenue) : '-'}</td>
                        <td className={`${td} text-right font-mono tabular-nums`} style={{ color: 'var(--text-primary)' }}>{row.costs ? fmt(row.costs) : '-'}</td>
                        <td className={`${td} text-right font-mono font-semibold tabular-nums border-l`} style={{ color: row.result < 0 ? 'var(--danger, #c0392b)' : 'var(--text-primary)', borderColor: 'var(--border)' }}>{fmt(row.result)}</td>
                        <td className={`${td} text-right font-mono tabular-nums`} style={{ color: 'var(--text-secondary)' }}>{pct(row.margin_pct)}</td>
                        {showWip && (
                          <td className={`${td} text-right font-mono tabular-nums border-l`} style={{ borderColor: 'var(--border)' }}>
                            {row.wip_balance ? (
                              view === 'project' && row.id
                                ? <Link href={`/accounting/projects/wip?project=${row.id}`} onClick={(e) => e.stopPropagation()} className="hover:underline" style={{ color: 'var(--primary)' }}>{fmt(row.wip_balance)}</Link>
                                : <span style={{ color: 'var(--text-primary)' }}>{fmt(row.wip_balance)}</span>
                            ) : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                          </td>
                        )}
                        {showDrafts && <td className={`${td} text-right font-mono tabular-nums border-l`} style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>{row.draft_revenue ? fmt(row.draft_revenue) : '-'}</td>}
                        {showDrafts && <td className={`${td} text-right font-mono tabular-nums`} style={{ color: 'var(--text-secondary)' }}>{row.draft_costs ? fmt(row.draft_costs) : '-'}</td>}
                      </tr>
                      {expanded && (
                        <tr style={{ borderBottom: '1px solid var(--border)' }}>
                          <td colSpan={colCount} className="px-4 py-3" style={{ backgroundColor: 'var(--surface-elevated)' }}>
                            {lines.length === 0 ? (
                              <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('dimNoLines')}</div>
                            ) : (
                              <div className="space-y-4">
                                {accounts.length > 0 && (
                                  <table className="text-sm">
                                    <thead>
                                      <tr style={{ color: 'var(--text-muted)' }}>
                                        <th className={`${subTh} text-left`}>{t('dimAccount')}</th>
                                        <th className={`${subTh} text-right`}>{t('dimRevenue')}</th>
                                        <th className={`${subTh} text-right`}>{t('dimCosts')}</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {accounts.map((a) => (
                                        <tr key={`${a.kind}-${a.account_id || '-'}`} style={{ borderTop: '1px dashed var(--border)' }}>
                                          <td className="px-3 py-1.5" style={{ color: 'var(--text-primary)' }}><span className="font-mono">{a.code || ''}</span> {a.name}</td>
                                          <td className="px-3 py-1.5 text-right font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>{a.kind === 'revenue' ? fmt(a.amount) : ''}</td>
                                          <td className="px-3 py-1.5 text-right font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>{a.kind === 'cost' ? fmt(a.amount) : ''}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                                <table className="min-w-full text-sm">
                                  <thead>
                                    <tr style={{ color: 'var(--text-muted)' }}>
                                      <th className={`${subTh} text-left`}>{t('dimDate')}</th>
                                      <th className={`${subTh} text-left`}>{t('dimDocument')}</th>
                                      <th className={`${subTh} text-left`}>{t('dimAccount')}</th>
                                      <th className={`${subTh} text-left`}>{t('dimPartner')}</th>
                                      <th className={`${subTh} text-left`}>{t('dimDescription')}</th>
                                      <th className={`${subTh} text-right`}>{t('dimRevenue')}</th>
                                      <th className={`${subTh} text-right`}>{t('dimCosts')}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {lines.map((l, i) => (
                                      <tr key={`${l.journal_entry_id || l.invoice_id}-${i}`} style={{ borderTop: '1px dashed var(--border)', opacity: l.source === 'draft' ? 0.7 : 1 }}>
                                        <td className="px-3 py-1.5 font-mono tabular-nums" style={{ color: 'var(--text-secondary)' }}>{dateText(l.invoice_date)}</td>
                                        <td className="px-3 py-1.5 font-mono">
                                          {docCell(l)}
                                          {l.source === 'draft' && <span className="ml-1 text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>{tInvoices('draft')}</span>}
                                          {l.source === 'invoice_legacy' && <span className="ml-1 text-[10px] uppercase" style={{ color: 'var(--text-muted)' }} title={t('dimLegacyHint')}>{t('dimLegacy')}</span>}
                                        </td>
                                        <td className="px-3 py-1.5 font-mono" style={{ color: 'var(--text-secondary)' }} title={l.account_name || ''}>{l.account_code || '—'}</td>
                                        <td className="px-3 py-1.5" style={{ color: 'var(--text-secondary)' }}>{l.partner_name || '—'}</td>
                                        <td className="max-w-[420px] truncate px-3 py-1.5" style={{ color: 'var(--text-primary)' }} title={l.description}>{l.description}</td>
                                        <td className="px-3 py-1.5 text-right font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>{l.kind === 'revenue' ? fmt(l.amount) : ''}</td>
                                        <td className="px-3 py-1.5 text-right font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>{l.kind === 'cost' ? fmt(l.amount) : ''}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
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
                  <td colSpan={labelCols} className="max-sm:sticky max-sm:left-0 max-sm:z-[1] max-sm:bg-[var(--surface-elevated)] px-4 py-3 text-sm" style={{ color: 'var(--text-primary)' }}>{tc('total')}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm tabular-nums border-l" style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}>{fmt(totals.revenue)}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm tabular-nums" style={{ color: 'var(--text-primary)' }}>{fmt(totals.costs)}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm tabular-nums border-l" style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}>{fmt(totals.result)}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm tabular-nums" style={{ color: 'var(--text-secondary)' }}>{pct(totals.revenue ? Math.round((totals.result / totals.revenue) * 1000) / 10 : null)}</td>
                  {showWip && <td className="px-4 py-3 text-right font-mono text-sm tabular-nums border-l" style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}>{fmt(totals.wip_balance || 0)}</td>}
                  {showDrafts && <td className="px-4 py-3 text-right font-mono text-sm tabular-nums border-l" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>{fmt(totals.draft_revenue || 0)}</td>}
                  {showDrafts && <td className="px-4 py-3 text-right font-mono text-sm tabular-nums" style={{ color: 'var(--text-secondary)' }}>{fmt(totals.draft_costs || 0)}</td>}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
