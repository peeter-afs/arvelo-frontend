/** Aegumisaruanne (handoff §3.3): partners by bucket, sorted by total. */

import type { AgingPartnerLine, AgingReportData } from '@/lib/api/reports.api';
import type { CellTone, ReportModel, ReportRow } from '../types';

export const BUCKET_LABELS = ['Tähtaeg ees', '1–30', '31–60', '61–90', '90+'];
const TONES: Array<CellTone | undefined> = [undefined, 'b1', 'b2', 'b3', 'b4', undefined];

export function buildAging(data: AgingReportData, opts: { overdueOnly: boolean }) {
  const partners = [...data.partners]
    .filter((p) => !opts.overdueOnly || p.total - p.current > 0.005)
    .sort((a, b) => b.total - a.total);

  const rows: Array<ReportRow<AgingPartnerLine>> = partners.map((p) => {
    const v = [p.current, p.days_1_30, p.days_31_60, p.days_61_90, p.over_90, p.total];
    return {
      t: 'ln', key: `p:${p.partner_id}`, name: p.partner_name, sub: `${p.invoices.length} arvet`,
      v, tone: v.map((x, i) => (x > 0.005 ? TONES[i] : undefined)), data: p,
    };
  });
  const sum = [0, 0, 0, 0, 0];
  for (const p of partners) [p.current, p.days_1_30, p.days_31_60, p.days_61_90, p.over_90].forEach((x, i) => { sum[i] += x; });
  const total = sum.reduce((s, x) => s + x, 0);
  rows.push({ t: 'gr', key: 'gr', name: 'Kokku', v: [...sum, total], sumOf: rows.map((r) => r.key) });

  const model: ReportModel<AgingPartnerLine> = {
    cols: [
      { label: data.direction === 'receivable' ? 'Ostja' : 'Tarnija' },
      { label: 'Tähtaeg ees', numeric: true, width: '112px' },
      { label: '1–30 p', numeric: true, width: '104px' },
      { label: '31–60 p', numeric: true, width: '104px' },
      { label: '61–90 p', numeric: true, width: '104px' },
      { label: 'Üle 90 p', numeric: true, width: '104px' },
      { label: 'Kokku', numeric: true, width: '120px' },
    ],
    rows,
    flatLines: true,
  };
  return { model, buckets: sum, total, count: partners.length };
}
