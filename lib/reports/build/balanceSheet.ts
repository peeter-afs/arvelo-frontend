/** Bilanss (handoff §3.2): Varad | Kohustised ja omakapital, schema 1 groups. */

import type { BalanceSheetData, BalanceSheetLine, ReportLine } from '@/lib/api/reports.api';
import type { ReportModel, ReportRow } from '../types';
import { periodCols, periodValues, isZeroPair } from './common';
import type { AccountRowData } from './profitLoss';

const NAMES: Partial<Record<ReportLine, string>> = {
  current_assets: 'Käibevara',
  fixed_assets: 'Põhivara',
  current_liabilities: 'Lühiajalised kohustised',
  long_term_liabilities: 'Pikaajalised kohustised',
  equity: 'Omakapital',
};

const lineOf = (l: BalanceSheetLine, fallback: ReportLine): ReportLine => l.report_line || fallback;

export function buildBalanceSheet(data: BalanceSheetData, opts: { periodLabel: string; compareLabel: string | null }) {
  const compare = !!opts.compareLabel;
  const rows: Array<ReportRow<AccountRowData>> = [];

  const block = (lines: BalanceSheetLine[], groups: ReportLine[], fallback: ReportLine) => {
    const keys: string[] = [];
    let sum = 0, sumC = 0;
    for (const g of groups) {
      const own = lines.filter((l) => lineOf(l, fallback) === g);
      if (!own.length) continue;
      const name = NAMES[g]!;
      rows.push({ t: 'grp', key: `g:${g}`, name });
      const gKeys: string[] = [];
      let gs = 0, gsC = 0;
      for (const l of own) {
        const key = l.special ? `s:${l.special}` : `a:${l.account_id || l.account_code}`;
        const v = l.balance, cv = l.compare_balance ?? 0;
        gKeys.push(key);
        gs += v; gsC += cv;
        rows.push({
          t: 'ln', key, code: l.account_code || undefined,
          name: l.special ? `${l.account_name} (arvutuslik)` : l.account_name,
          v: periodValues(v, cv, compare), zero: isZeroPair(v, compare ? cv : 0),
          data: { accountId: l.account_id ?? null, code: l.account_code, name: l.account_name, group: name },
        });
      }
      rows.push({ t: 'tot', key: `t:${g}`, name: `${name} kokku`, v: periodValues(gs, gsC, compare), sumOf: gKeys });
      keys.push(...gKeys);
      sum += gs; sumC += gsC;
    }
    return { keys, sum, sumC };
  };

  rows.push({ t: 'sec', key: 'sec:a', name: 'Varad' });
  const A = block(data.assets, ['current_assets', 'fixed_assets'], 'current_assets');
  rows.push({ t: 'gr', key: 'gr:a', name: 'Varad kokku', v: periodValues(A.sum, A.sumC, compare), sumOf: A.keys });

  rows.push({ t: 'sec', key: 'sec:le', name: 'Kohustised ja omakapital' });
  const L = block(data.liabilities, ['current_liabilities', 'long_term_liabilities'], 'current_liabilities');
  rows.push({ t: 'tot', key: 't:liab', name: 'Kohustised kokku', v: periodValues(L.sum, L.sumC, compare), sumOf: L.keys });
  const E = block(data.equity, ['equity'], 'equity');
  rows.push({ t: 'gr', key: 'gr:le', name: 'Kohustised ja omakapital kokku', v: periodValues(L.sum + E.sum, L.sumC + E.sumC, compare), sumOf: [...L.keys, ...E.keys] });

  const diff = A.sum - (L.sum + E.sum);
  const model: ReportModel<AccountRowData> = { cols: periodCols('Konto', opts.periodLabel, opts.compareLabel), rows };
  return { model, totals: { assets: A.sum, liabilities: L.sum, equity: E.sum }, check: { ok: Math.abs(diff) < 0.01, diff } };
}
