/** Number and date formatting shared by report screens, print and export. */

const NUM = new Intl.NumberFormat('et-EE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const PCT = new Intl.NumberFormat('et-EE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const isZero = (v: number | null | undefined) => v == null || Math.abs(v) < 0.005;

/** "1 234,56", negatives with a real minus sign (U+2212); zero → "–". */
export function fmtNum(v: number | null | undefined): string {
  if (v == null || isZero(v)) return '–';
  const s = NUM.format(Math.abs(v));
  return v < 0 ? `−${s}` : s;
}

/** Like fmtNum but keeps 0,00 (strip cells, balances). */
export function fmtAmount(v: number | null | undefined): string {
  const n = Number(v || 0);
  const s = NUM.format(Math.abs(n));
  return n < -0.004 ? `−${s}` : s;
}

export const fmtEur = (v: number | null | undefined) => `${fmtAmount(v)} €`;

/** "+12,4%" with one decimal; null → "–". */
export function fmtPct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '–';
  const s = PCT.format(Math.abs(v));
  return `${v > 0.05 ? '+' : v < -0.05 ? '−' : ''}${s}%`;
}

export const pctChange = (cur: number, base: number) => (Math.abs(base) > 0.005 ? ((cur - base) / Math.abs(base)) * 100 : null);

const pad = (n: number) => String(n).padStart(2, '0');

/** Local date → "2026-10-07". */
export const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** "2026-10-07" → local Date at midnight. */
export const fromIso = (s: string) => {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};
/** "2026-10-07" → "07.10.2026". */
export const dmy = (iso?: string | null) => {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return d && m && y ? `${d}.${m}.${y}` : iso;
};
/** "2026-10-07" → "07.10". */
export const dm = (iso?: string | null) => (iso ? dmy(iso).slice(0, 5) : '');
/** "07.10.2026" (or 7.10.26) → "2026-10-07"; null when not a real date. */
export function parseDmy(s: string): string | null {
  const m = /^\s*(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})\s*$/.exec(s);
  if (!m) return null;
  const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  const d = new Date(y, Number(m[2]) - 1, Number(m[1]));
  if (d.getFullYear() !== y || d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[1])) return null;
  return toIso(d);
}
export const rangeText = (from: string, to: string) => `${dmy(from)} – ${dmy(to)}`;

/** Diacritic-insensitive lowercase, for report search ("kaibeandmik" finds "Käibeandmik"). */
export const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
