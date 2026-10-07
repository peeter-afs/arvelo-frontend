/** Partneri kontokaart: per side (receivable / payable) opening, entries and closing balance. */

import type { PartnerStatement, PartnerStatementSide } from '@/lib/api/reports.api';
import type { ReportModel, ReportRow } from '../types';
import { dmy } from '../format';

export const SIDE_NAME: Record<PartnerStatementSide['side'], string> = { receivable: 'Nõuded ostjale', payable: 'Võlad tarnijale' };

export type StatementRowData = PartnerStatementSide['entries'][number];

const KIND: Record<StatementRowData['kind'], string> = { invoice: 'Arve', credit_note: 'Kreeditarve', payment: 'Makse', refund: 'Tagasimakse' };
export const entryKind = (e: StatementRowData) => KIND[e.kind] ?? e.kind;

export function buildPartnerStatement(data: PartnerStatement) {
  const rows: Array<ReportRow<StatementRowData>> = [];
  for (const side of data.sides) {
    rows.push({ t: 'sec', key: `sec:${side.side}`, name: SIDE_NAME[side.side] });
    rows.push({ t: 'tot', key: `ob:${side.side}`, name: 'Algsaldo', v: [null, null, side.opening_balance] });
    const keys: string[] = [];
    side.entries.forEach((e, i) => {
      const key = `${side.side}:${i}`;
      keys.push(key);
      rows.push({
        t: 'ln', key, code: dmy(e.date), name: e.document_number || entryKind(e),
        sub: `${e.description}${e.due_date && e.kind === 'invoice' ? ` · tähtaeg ${dmy(e.due_date)}` : ''}`,
        v: [e.debit || 0, e.credit || 0, e.balance],
        data: e,
      });
    });
    rows.push({ t: 'gr', key: `cb:${side.side}`, name: `Lõppsaldo (${data.currency})`, v: [side.total_debit, side.total_credit, side.closing_balance], sumOf: keys });
  }
  const model: ReportModel<StatementRowData> = {
    cols: [{ label: 'Kuupäev · dokument' }, { label: 'Deebet', numeric: true }, { label: 'Kreedit', numeric: true }, { label: 'Saldo', numeric: true, noSum: true }],
    rows,
    codeWidth: 76,
  };
  return { model };
}
