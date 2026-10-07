/** Kulukohad ja projektid (handoff §3.4): ledger dimensions, optional draft invoices. */

import type { DimensionReportData, DimensionReportRow } from '@/lib/api/reports.api';
import type { ReportModel, ReportRow } from '../types';
import { dm } from '../format';

export type DimensionRowData = { row: DimensionReportRow; revenue: number; costs: number };

export function buildDimensions(data: DimensionReportData, opts: { kind: 'projects' | 'cost_centers'; drafts: boolean }) {
  const projects = opts.kind === 'projects';
  const list = projects ? data.projects : data.cost_centers;
  const T = { revenue: 0, costs: 0, wip: 0 };

  const rows: Array<ReportRow<DimensionRowData>> = list.map((d) => {
    const revenue = d.revenue + (opts.drafts ? d.draft_revenue || 0 : 0);
    const costs = d.costs + (opts.drafts ? d.draft_costs || 0 : 0);
    const result = revenue - costs;
    T.revenue += revenue; T.costs += costs; T.wip += d.wip_balance || 0;
    const v: Array<number | null> = [revenue, -costs, result, revenue ? (result / revenue) * 100 : null];
    if (projects) v.push(d.wip_balance || 0);
    return {
      t: 'ln', key: `d:${d.id ?? 'none'}`, code: d.code || '', name: d.name || 'Määramata', sub: d.partner_name || undefined,
      tag: projects && d.id
        ? d.status === 'completed' ? { label: `Lõpetatud${d.completed_at ? ` ${dm(d.completed_at)}` : ''}`, kind: 'ok' } : { label: 'Pooleli', kind: 'info' }
        : undefined,
      v, tone: [undefined, undefined, result < -0.005 ? 'neg' : undefined],
      data: { row: d, revenue, costs },
    };
  });
  const result = T.revenue - T.costs;
  const tv: Array<number | null> = [T.revenue, -T.costs, result, T.revenue ? (result / T.revenue) * 100 : null];
  if (projects) tv.push(T.wip);
  rows.push({ t: 'gr', key: 'gr', name: 'Kokku', v: tv, tone: [undefined, undefined, result < -0.005 ? 'neg' : undefined], sumOf: rows.map((r) => r.key) });

  const model: ReportModel<DimensionRowData> = {
    cols: [
      { label: projects ? 'Projekt' : 'Kulukoht' },
      { label: 'Tulud', numeric: true },
      { label: 'Kulud', numeric: true },
      { label: 'Tulem', numeric: true },
      { label: 'Marginaal', numeric: true, pct: true, width: '92px', hide: 1, calc: { kind: 'ratio', a: 2, b: 0 } },
      ...(projects ? [{ label: 'Lõpetamata tööd', numeric: true, hide: 2 }] : []),
    ],
    rows,
    wideCode: true,
  };
  return { model, totals: { revenue: T.revenue, costs: T.costs, result, wip: T.wip }, count: list.length };
}
