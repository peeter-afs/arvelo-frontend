/** KMD aruanne: the KMD form (from period 07.2025) as rows; lines with invoices drill down. */

import type { KmdLineKey, VATInvoiceSummary, VATReportData } from '@/lib/api/reports.api';
import type { ReportModel, ReportRow } from '../types';

type FormLine = { key: KmdLineKey; num: string; label: string; total?: boolean; untracked?: boolean };

export const KMD_SECTIONS: Array<{ name: string; lines: FormLine[] }> = [
  {
    name: 'Väljundkäibemaks',
    lines: [
      { key: '1', num: '1', label: '24% määraga maksustatavad toimingud ja tehingud' },
      { key: '1_1', num: '1¹', label: '20% määraga maksustatavad toimingud ja tehingud' },
      { key: '1_2', num: '1²', label: '22% määraga maksustatavad toimingud ja tehingud' },
      { key: '2', num: '2', label: '9% määraga maksustatavad toimingud ja tehingud' },
      { key: '2_1', num: '2¹', label: '5% määraga maksustatavad toimingud ja tehingud' },
      { key: '2_2', num: '2²', label: '13% määraga maksustatavad toimingud ja tehingud' },
      { key: '3', num: '3', label: '0% määraga maksustatavad toimingud ja tehingud, sh' },
      { key: '3_1', num: '3.1', label: 'kauba ühendusesisene käive ja teise liikmesriigi maksukohustuslasele osutatud teenuste käive kokku, sh' },
      { key: '3_1_1', num: '3.1.1', label: 'kauba ühendusesisene käive' },
      { key: '3_2', num: '3.2', label: 'kauba eksport, sh' },
      { key: '3_2_1', num: '3.2.1', label: 'käibemaksutagastusega müük reisijale', untracked: true },
      { key: '4', num: '4', label: 'Käibemaks kokku', total: true },
    ],
  },
  {
    name: 'Sisendkäibemaks',
    lines: [
      { key: '5', num: '5', label: 'Kokku sisendkäibemaksusumma, mis on seadusega lubatud maha arvata, sh', total: true },
      { key: '5_1', num: '5.1', label: 'impordilt tasutud või tasumisele kuuluv käibemaks', untracked: true },
      { key: '5_2', num: '5.2', label: 'põhivara soetamiselt tasutud või tasumisele kuuluv käibemaks', untracked: true },
      { key: '5_3', num: '5.3', label: 'ettevõtluses (100%) kasutatava sõiduauto soetamiselt ja kasutamiselt tasutud käibemaks', untracked: true },
      { key: '5_4', num: '5.4', label: 'osaliselt ettevõtluses kasutatava sõiduauto soetamiselt ja kasutamiselt tasutud käibemaks', untracked: true },
    ],
  },
  {
    name: 'Muud andmed',
    lines: [
      { key: '6', num: '6', label: 'Kauba ühendusesisene soetamine ja teise liikmesriigi maksukohustuslaselt saadud teenused kokku, sh' },
      { key: '6_1', num: '6.1', label: 'kauba ühendusesisene soetamine' },
      { key: '7', num: '7', label: 'Muu kauba soetamine ja teenuse saamine, mida maksustatakse käibemaksuga, sh', untracked: true },
      { key: '7_1', num: '7.1', label: 'erikorra alusel maksustatava kinnisasja, metallijäätmete ja väärismetalli soetamine (KMS § 41¹)', untracked: true },
      { key: '8', num: '8', label: 'Maksuvaba käive', untracked: true },
      { key: '9', num: '9', label: 'Erikorra alusel maksustatava kinnisasja, metallijäätmete ja väärismetalli käive (KMS § 41¹) ning teises liikmesriigis paigaldatava või kokkupandava kauba maksustatav väärtus', untracked: true },
      { key: '10', num: '10', label: 'Täpsustused (+)', untracked: true },
      { key: '11', num: '11', label: 'Täpsustused (−)', untracked: true },
    ],
  },
];

/** Sales lines of a single rate: which invoices make up the line. */
const SALES_RATE: Partial<Record<KmdLineKey, number>> = { '1': 24, '1_1': 20, '1_2': 22, '2': 9, '2_1': 5, '2_2': 13, '3': 0 };

export type KmdRowData = { num: string; label: string; invoices: VATInvoiceSummary[]; rate: number | null; side: 'sales' | 'purchase' };

export function buildKmd(data: VATReportData) {
  const rows: Array<ReportRow<KmdRowData>> = [];
  for (const s of KMD_SECTIONS) {
    rows.push({ t: 'sec', key: `sec:${s.name}`, name: s.name });
    for (const l of s.lines) {
      const value = data.lines[l.key] ?? 0;
      let drill: KmdRowData | undefined;
      const rate = SALES_RATE[l.key];
      if (rate !== undefined) {
        const invoices = data.sales_invoices.filter((i) => i.tax_rate_breakdown.some((b) => Math.abs(b.tax_rate - rate) < 0.001));
        if (invoices.length) drill = { num: l.num, label: l.label, invoices, rate, side: 'sales' };
      } else if (l.key === '4' && data.sales_invoices.length) {
        drill = { num: l.num, label: l.label, invoices: data.sales_invoices, rate: null, side: 'sales' };
      } else if (l.key === '5' && data.purchase_invoices.length) {
        drill = { num: l.num, label: l.label, invoices: data.purchase_invoices, rate: null, side: 'purchase' };
      }
      rows.push({
        t: l.total ? 'tot' : 'ln', key: `l:${l.key}`, code: l.num, name: l.label, v: [value],
        tone: [l.untracked && Math.abs(value) < 0.005 ? 'mut' : undefined],
        data: drill,
      });
    }
  }
  const refund = (data.lines['13'] ?? 0) > 0;
  rows.push({
    t: 'res', key: 'res', code: refund ? '13' : '12',
    name: refund ? 'Enammakstud käibemaks' : 'Tasumisele kuuluv käibemaks',
    v: [refund ? data.lines['13'] : data.lines['12']],
  });
  const model: ReportModel<KmdRowData> = { cols: [{ label: 'Rida' }, { label: 'Summa', numeric: true, width: '140px' }], rows, wideCode: true };
  return { model, output: data.lines['4'] ?? 0, input: data.lines['5'] ?? 0, payable: data.lines['12'] ?? 0, refund: data.lines['13'] ?? 0 };
}
