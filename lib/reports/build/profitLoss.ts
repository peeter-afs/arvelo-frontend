/** Kasumiaruanne (handoff §3.1): Estonian schema 1, revenue positive, expenses negative. */

import type { ProfitLossData, ProfitLossLine, ReportLine } from '@/lib/api/reports.api';
import type { ReportModel, ReportRow } from '../types';
import { periodCols, periodValues, isZeroPair } from './common';

export type AccountRowData = { accountId: string | null; code: string; name: string; group: string };

const GROUPS: Array<{ line: ReportLine; name: string; after?: string }> = [
  { line: 'revenue', name: 'Müügitulu' },
  { line: 'other_income', name: 'Muud äritulud' },
  { line: 'goods_materials_services', name: 'Kaubad, toore, materjal ja teenused' },
  { line: 'operating_expenses', name: 'Mitmesugused tegevuskulud' },
  { line: 'labour', name: 'Tööjõukulud' },
  { line: 'depreciation', name: 'Põhivara kulum' },
  { line: 'other_expenses', name: 'Muud ärikulud', after: 'Ärikasum (-kahjum)' },
  { line: 'financial', name: 'Finantstulud ja -kulud', after: 'Kasum (kahjum) enne tulumaksu' },
  { line: 'income_tax', name: 'Tulumaks', after: 'Aruandeaasta kasum (kahjum)' },
];
const INCOME: ReportLine[] = ['revenue', 'other_income'];

/** Older backends send no report_line: revenue → Müügitulu, expenses → Mitmesugused tegevuskulud. */
const lineOf = (l: ProfitLossLine): ReportLine => l.report_line || (l.account_type === 'revenue' ? 'revenue' : 'operating_expenses');

export function buildProfitLoss(data: ProfitLossData, opts: { periodLabel: string; compareLabel: string | null }) {
  const compare = !!opts.compareLabel;
  // Display sign: revenue as-is, expenses negated (they arrive debit-positive).
  const signed = [
    ...data.revenue.map((l) => ({ l, v: l.amount, cv: l.compare_amount ?? 0 })),
    ...data.expenses.map((l) => ({ l, v: -l.amount, cv: -(l.compare_amount ?? 0) })),
  ];

  const rows: Array<ReportRow<AccountRowData>> = [];
  const lnKeys: string[] = [];
  let run = 0, runC = 0, income = 0;

  for (const g of GROUPS) {
    const lines = signed.filter((x) => lineOf(x.l) === g.line).sort((a, b) => a.l.account_code.localeCompare(b.l.account_code));
    if (lines.length) {
      rows.push({ t: 'grp', key: `g:${g.line}`, name: g.name });
      const keys: string[] = [];
      let sum = 0, sumC = 0;
      for (const { l, v, cv } of lines) {
        const key = `a:${l.account_id || l.account_code}`;
        keys.push(key);
        sum += v; sumC += cv;
        rows.push({
          t: 'ln', key, code: l.account_code, name: l.account_name,
          v: periodValues(v, cv, compare), zero: isZeroPair(v, compare ? cv : 0),
          data: { accountId: l.account_id ?? null, code: l.account_code, name: l.account_name, group: g.name },
        });
      }
      if (lines.length > 1) rows.push({ t: 'tot', key: `t:${g.line}`, name: `${g.name} kokku`, v: periodValues(sum, sumC, compare), sumOf: keys });
      lnKeys.push(...keys);
      run += sum; runC += sumC;
      if (INCOME.includes(g.line)) income += sum;
    }
    if (g.after) rows.push({ t: 'res', key: `r:${g.line}`, name: g.after, v: periodValues(run, runC, compare), sumOf: [...lnKeys] });
  }

  const model: ReportModel<AccountRowData> = { cols: periodCols('Konto', opts.periodLabel, opts.compareLabel), rows };
  return { model, totals: { income, expenses: run - income, net: run } };
}
