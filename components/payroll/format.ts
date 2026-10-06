import type { PayrollRunStatus } from '@/lib/api/payroll.api';

export const money = (value: number | null | undefined) =>
  Number(value || 0).toLocaleString('et-EE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const dateText = (value: string | null | undefined) => (value ? value.slice(0, 10).split('-').reverse().join('.') : '—');

/** 2026-09-01 → 09.2026 */
export const monthText = (value: string) => {
  const [year, month] = value.slice(0, 7).split('-');
  return `${month}.${year}`;
};

export const RUN_STATUS_TONE: Record<PayrollRunStatus, string> = {
  draft: 'bg-[var(--a-surface-2)] text-[var(--a-text-2)]',
  approved: 'bg-[var(--a-warn-soft)] text-[var(--a-warn)]',
  posted: 'bg-[var(--a-pos-soft)] text-[var(--a-pos)]',
  cancelled: 'bg-[var(--a-neg-soft)] text-[var(--a-neg)]',
};

/** Previous calendar month as YYYY-MM — the month a new run is usually for. */
export function previousMonth(today = new Date()): string {
  const d = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function currentMonth(today = new Date()): string {
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
}

/** Number input text → number; accepts a decimal comma. */
export function parseAmount(text: string): number {
  const n = Number(String(text).replace(/\s+/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}
