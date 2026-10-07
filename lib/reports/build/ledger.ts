/** Proovibilanss, Käibeandmik and Pearaamat: account-level ledger reports. */

import type { GeneralLedgerData, TrialBalanceData, TurnoverReportData } from '@/lib/api/reports.api';
import type { ReportModel, ReportRow } from '../types';
import { dmy } from '../format';
import type { AccountRowData } from './profitLoss';

const TYPE_ORDER = ['asset', 'liability', 'equity', 'revenue', 'expense'];
const TYPE_NAME: Record<string, string> = { asset: 'Varad', liability: 'Kohustised', equity: 'Omakapital', revenue: 'Tulud', expense: 'Kulud' };

/** Groups account lines by account type, in chart order. */
function byType<L extends { account_type: string; account_code: string }>(lines: L[]) {
  const types = [...TYPE_ORDER, ...new Set(lines.map((l) => l.account_type).filter((t) => !TYPE_ORDER.includes(t)))];
  return types
    .map((t) => ({ type: t, name: TYPE_NAME[t] || t, lines: lines.filter((l) => l.account_type === t).sort((a, b) => a.account_code.localeCompare(b.account_code)) }))
    .filter((g) => g.lines.length);
}

export function buildTrialBalance(data: TrialBalanceData) {
  const rows: Array<ReportRow<AccountRowData>> = [];
  const keys: string[] = [];
  for (const g of byType(data.accounts)) {
    rows.push({ t: 'sec', key: `sec:${g.type}`, name: g.name });
    const gKeys: string[] = [];
    let d = 0, c = 0, b = 0;
    for (const l of g.lines) {
      const key = `a:${l.account_id || l.account_code}`;
      gKeys.push(key);
      d += l.debit; c += l.credit; b += l.balance;
      rows.push({
        t: 'ln', key, code: l.account_code, name: l.account_name, v: [l.debit, l.credit, l.balance],
        data: { accountId: l.account_id ?? null, code: l.account_code, name: l.account_name, group: g.name },
      });
    }
    rows.push({ t: 'tot', key: `t:${g.type}`, name: `${g.name} kokku`, v: [d, c, b], sumOf: gKeys });
    keys.push(...gKeys);
  }
  rows.push({ t: 'gr', key: 'gr', name: 'Kokku', v: [data.totalDebit, data.totalCredit, data.totalDebit - data.totalCredit], sumOf: keys });
  const model: ReportModel<AccountRowData> = {
    cols: [{ label: 'Konto' }, { label: 'Deebet', numeric: true }, { label: 'Kreedit', numeric: true }, { label: 'Saldo', numeric: true }],
    rows,
  };
  return { model, diff: data.totalDebit - data.totalCredit };
}

export function buildTurnover(data: TurnoverReportData) {
  const rows: Array<ReportRow<AccountRowData>> = [];
  const keys: string[] = [];
  const T = [0, 0, 0, 0, 0, 0];
  for (const g of byType(data.accounts)) {
    rows.push({ t: 'sec', key: `sec:${g.type}`, name: g.name });
    const gKeys: string[] = [];
    const S = [0, 0, 0, 0, 0, 0];
    for (const l of g.lines) {
      const key = `a:${l.account_id}`;
      const v = [l.opening_debit, l.opening_credit, l.period_debit, l.period_credit, l.closing_debit, l.closing_credit];
      v.forEach((x, i) => { S[i] += x; T[i] += x; });
      gKeys.push(key);
      rows.push({
        t: 'ln', key, code: l.account_code, name: l.account_name, v,
        data: { accountId: l.account_id, code: l.account_code, name: l.account_name, group: g.name },
      });
    }
    rows.push({ t: 'tot', key: `t:${g.type}`, name: `${g.name} kokku`, v: S, sumOf: gKeys });
    keys.push(...gKeys);
  }
  rows.push({ t: 'gr', key: 'gr', name: 'Kokku', v: T, sumOf: keys });
  const col = (label: string, hide?: number) => ({ label, numeric: true, width: '104px', hide });
  const model: ReportModel<AccountRowData> = {
    cols: [{ label: 'Konto' }, col('Algsaldo D', 2), col('Algsaldo K', 2), col('Käive D'), col('Käive K'), col('Lõppsaldo D', 1), col('Lõppsaldo K', 1)],
    rows,
  };
  return { model, totals: { periodDebit: T[2], periodCredit: T[3] } };
}

export type LedgerRowData = { entryId: string; date: string; reference: string | null; description: string | null; partner: string | null; debit: number; credit: number };

export function buildGeneralLedger(data: GeneralLedgerData) {
  const rows: Array<ReportRow<LedgerRowData>> = [];
  rows.push({ t: 'tot', key: 'ob', name: 'Algsaldo', v: [null, null, data.openingBalance] });
  const keys: string[] = [];
  data.transactions.forEach((t, i) => {
    const key = `e:${t.id}:${i}`;
    keys.push(key);
    rows.push({
      t: 'ln', key, code: dmy(t.date), name: t.reference || t.description || 'Kanne',
      sub: [t.reference ? t.description : null, t.partner].filter(Boolean).join(' · ') || undefined,
      v: [t.debit || 0, t.credit || 0, t.balance],
      data: { entryId: t.id, date: t.date, reference: t.reference, description: t.description, partner: t.partner, debit: t.debit || 0, credit: t.credit || 0 },
    });
  });
  rows.push({ t: 'gr', key: 'cb', name: 'Lõppsaldo', v: [data.totalDebit, data.totalCredit, data.closingBalance], sumOf: keys });
  const model: ReportModel<LedgerRowData> = {
    cols: [{ label: 'Kuupäev · dokument' }, { label: 'Deebet', numeric: true }, { label: 'Kreedit', numeric: true }, { label: 'Saldo', numeric: true, noSum: true }],
    rows,
    codeWidth: 76,
  };
  return { model };
}
