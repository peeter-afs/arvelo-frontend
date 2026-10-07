/**
 * One row model for screen, print and export (docs2/design_handoff_aruanded §3).
 * Builders in ./build turn an API response into a ReportModel; ReportTable,
 * PrintSheet and the Excel/CSV exporters all render the same model.
 */

export type RowType = 'sec' | 'grp' | 'ln' | 'tot' | 'gr' | 'res';

/** Excel formula for a derived column, by value index (0 = first numeric column). */
export type ColCalc =
  | { kind: 'diff'; a: number; b: number } // a − b
  | { kind: 'pct'; a: number; b: number } // (a − b) / |b| · 100, blank when b = 0
  | { kind: 'ratio'; a: number; b: number }; // a / b · 100, blank when b = 0

export type ReportCol = {
  label: string;
  /** Numeric column (right-aligned, et-EE number). The first column never is. */
  numeric?: boolean;
  /** Grid track; numeric columns default to 128px. */
  width?: string;
  /** Percent column: "+12,4%", coloured by sign. */
  pct?: boolean;
  /** Narrow screens drop columns with the lowest number first (handoff: %, then Muutus). */
  hide?: number;
  /** Excel: write a row-wise formula instead of the value. */
  calc?: ColCalc;
  /** Excel: totals do not sum this column (e.g. a running balance). */
  noSum?: boolean;
};

export type CellTone = 'pos' | 'neg' | 'warn' | 'mut' | 'b1' | 'b2' | 'b3' | 'b4';

export type ReportRow<D = unknown> = {
  t: RowType;
  key: string;
  /** Account / project code, shown muted before the name. */
  code?: string;
  name: string;
  /** Small grey text after the name ("3 arvet", partner). */
  sub?: string;
  tag?: { label: string; kind: 'ok' | 'info' | 'draft' | 'bad' | 'pend' };
  /** Values per numeric column; null renders as "–". */
  v?: Array<number | null>;
  tone?: Array<CellTone | undefined>;
  /** Both period values are zero: hidden unless "Näita nullsaldoga kontosid". */
  zero?: boolean;
  /** Excel: tot/gr/res rows are SUM formulas over these row keys. */
  sumOf?: string[];
  /** Row-level data for the drill panel. */
  data?: D;
};

export type ReportModel<D = unknown> = {
  cols: ReportCol[];
  rows: Array<ReportRow<D>>;
  /** Code column 44px (projects) instead of 34px (accounts). */
  wideCode?: boolean;
  /** Code column width in px when it holds something else (a date in ledgers). */
  codeWidth?: number;
  /** Line rows sit flush left (aging partners) instead of indented under a group. */
  flatLines?: boolean;
};
