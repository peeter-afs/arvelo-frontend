import type { ReportCol } from '../types';
import { pctChange } from '../format';

/** Value columns of a two-period report: current, then Võrdlus · Muutus · % when comparing. */
export function periodCols(first: string, current: string, compare: string | null): ReportCol[] {
  const cols: ReportCol[] = [{ label: first }, { label: current, numeric: true }];
  if (compare) {
    cols.push(
      { label: compare, numeric: true },
      { label: 'Muutus', numeric: true, hide: 2, calc: { kind: 'diff', a: 0, b: 1 } },
      { label: '%', numeric: true, pct: true, width: '64px', hide: 1, calc: { kind: 'pct', a: 0, b: 1 } },
    );
  }
  return cols;
}

export const periodValues = (v: number, cv: number, compare: boolean) =>
  compare ? [v, cv, v - cv, pctChange(v, cv)] : [v];

export const isZeroPair = (v: number, cv: number) => Math.abs(v) < 0.005 && Math.abs(cv) < 0.005;
