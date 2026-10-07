/**
 * Period presets of the report filter row (handoff §2.3). Presets stay relative —
 * a saved view with "Eelmise kuu lõpp" moves every month — and are fiscal-year
 * aware: "Aasta algusest" starts at the fiscal year that contains today.
 */

import { fromIso, rangeText, dmy, toIso } from './format';

export type FiscalYearSpan = { date_start: string; date_end: string };
export type ReportFilters = Record<string, string>;

export type AsOfPreset = 'today' | 'pm' | 'pq' | 'py' | 'custom';
export type RangePreset = 'ytd' | 'cm' | 'pm' | 'cq' | 'pq' | 'py' | 'custom';

export const AS_OF_PRESETS: Array<[Exclude<AsOfPreset, 'custom'>, string]> = [
  ['today', 'Täna'],
  ['pm', 'Eelmise kuu lõpp'],
  ['pq', 'Eelmise kvartali lõpp'],
  ['py', 'Eelmise aasta lõpp'],
];
export const RANGE_PRESETS: Array<[Exclude<RangePreset, 'custom'>, string]> = [
  ['ytd', 'Aasta algusest'],
  ['cm', 'Jooksev kuu'],
  ['pm', 'Eelmine kuu'],
  ['cq', 'Jooksev kvartal'],
  ['pq', 'Eelmine kvartal'],
  ['py', 'Eelmine aasta'],
];

const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const addYears = (d: Date, n: number) => {
  const r = new Date(d.getFullYear() + n, d.getMonth(), d.getDate());
  // 29.02 → 28.02 instead of rolling into March.
  return r.getMonth() !== d.getMonth() ? new Date(r.getFullYear(), r.getMonth(), 0) : r;
};
const monthEnd = (y: number, m: number) => new Date(y, m + 1, 0);

/** Fiscal year containing `day`: from the company's fiscal years, else the calendar year. */
export function fiscalYearOf(day: Date, years: FiscalYearSpan[] = []): { start: Date; end: Date } {
  const iso = toIso(day);
  const fy = years.find((y) => y.date_start.slice(0, 10) <= iso && y.date_end.slice(0, 10) >= iso);
  if (fy) return { start: fromIso(fy.date_start), end: fromIso(fy.date_end) };
  // No fiscal year row: infer its start month from the nearest one, else January.
  const ref = years[0] ? fromIso(years[0].date_start) : null;
  const m = ref ? ref.getMonth() : 0;
  const d = ref ? ref.getDate() : 1;
  let start = new Date(day.getFullYear(), m, d);
  if (start > day) start = new Date(day.getFullYear() - 1, m, d);
  return { start, end: addDays(addYears(start, 1), -1) };
}

export function asOfDate(preset: string, custom: string | undefined, years: FiscalYearSpan[], today = new Date()): string {
  const y = today.getFullYear(), m = today.getMonth();
  switch (preset) {
    case 'pm': return toIso(monthEnd(y, m - 1));
    case 'pq': return toIso(monthEnd(y, Math.floor(m / 3) * 3 - 1));
    case 'py': return toIso(addDays(fiscalYearOf(today, years).start, -1));
    case 'custom': return custom || toIso(today);
    default: return toIso(today);
  }
}

export function rangeDates(preset: string, from: string | undefined, to: string | undefined, years: FiscalYearSpan[], today = new Date()): [string, string] {
  const y = today.getFullYear(), m = today.getMonth();
  const q = Math.floor(m / 3) * 3;
  switch (preset) {
    case 'cm': return [toIso(new Date(y, m, 1)), toIso(monthEnd(y, m))];
    case 'pm': return [toIso(new Date(y, m - 1, 1)), toIso(monthEnd(y, m - 1))];
    case 'cq': return [toIso(new Date(y, q, 1)), toIso(monthEnd(y, q + 2))];
    case 'pq': return [toIso(new Date(y, q - 3, 1)), toIso(monthEnd(y, q - 1))];
    case 'py': {
      const prev = fiscalYearOf(addDays(fiscalYearOf(today, years).start, -1), years);
      return [toIso(prev.start), toIso(prev.end)];
    }
    case 'custom': return [from || toIso(fiscalYearOf(today, years).start), to || toIso(today)];
    default: return [toIso(fiscalYearOf(today, years).start), toIso(today)];
  }
}

/* ── comparison (Bilanss: a date, Kasumiaruanne: a period) ── */

export const BS_COMPARE: Array<[string, string]> = [
  ['none', 'Võrdlus puudub'],
  ['pye', 'Eelmise aasta lõpp'],
  ['sdly', 'Sama kuupäev eelmisel aastal'],
  ['custom', 'Kohandatud kuupäev…'],
];
export const PL_COMPARE: Array<[string, string]> = [
  ['none', 'Võrdlus puudub'],
  ['spy', 'Sama periood eelmisel aastal'],
  ['pp', 'Eelmine periood'],
  ['custom', 'Kohandatud periood…'],
];

export function compareAsOf(cmp: string, asOf: string, custom: string | undefined, years: FiscalYearSpan[]): string | null {
  const d = fromIso(asOf);
  if (cmp === 'pye') return toIso(addDays(fiscalYearOf(d, years).start, -1));
  if (cmp === 'sdly') return toIso(addYears(d, -1));
  if (cmp === 'custom') return custom || null;
  return null;
}

export function compareRange(cmp: string, from: string, to: string, cFrom?: string, cTo?: string): [string, string] | null {
  const a = fromIso(from), b = fromIso(to);
  if (cmp === 'spy') return [toIso(addYears(a, -1)), toIso(addYears(b, -1))];
  if (cmp === 'pp') {
    const days = Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1;
    return [toIso(addDays(a, -days)), toIso(addDays(a, -1))];
  }
  if (cmp === 'custom') return cFrom && cTo ? [cFrom, cTo] : null;
  return null;
}

/** "01.01.–07.10.2025" — compact range for column heads and the compare button. */
export function shortRange(from: string, to: string) {
  const f = dmy(from), t = dmy(to);
  return f.slice(6) === t.slice(6) ? `${f.slice(0, 6)}–${t}` : `${f} – ${t}`;
}

export { rangeText };
