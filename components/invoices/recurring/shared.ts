import type { Frequency, RecurringTemplate, TemplateLine } from '@/lib/api/recurringInvoices.api';

export const num = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString('et-EE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const eur = (n: number) => `${num(n)} €`;
export const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Parses user input with either "," or "." as decimal separator; '' → null. */
export function parseQty(s: string): number | null {
  const t = s.replace(/\s/g, '').replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export const fmtQty = (n: number | null | undefined) =>
  n == null ? '' : n.toLocaleString('et-EE', { maximumFractionDigits: 4 });

export const isoToEt = (iso?: string | null) => {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
};
export const shortRange = (from: string, to: string) => `${from.slice(8, 10)}.${from.slice(5, 7)}–${to.slice(8, 10)}.${to.slice(5, 7)}`;

export const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function initials(name: string) {
  return name
    .replace(/\b(OÜ|AS|UAB|MTÜ|FIE|SIA|OY|AB)\b/g, '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase();
}

// ─── Schedule (mirrors backend recurringInvoice.service) ───────────────

export function frequencyMonths(t: Pick<RecurringTemplate, 'frequency' | 'interval_count'>): number | null {
  const n = t.interval_count || 1;
  switch (t.frequency) {
    case 'weekly': return null;
    case 'monthly': return n;
    case 'quarterly': return 3 * n;
    case 'yearly': return 12 * n;
  }
}

export function frequencyLabel(t: Pick<RecurringTemplate, 'frequency' | 'interval_count'>) {
  const m = frequencyMonths(t);
  if (m == null) return t.interval_count > 1 ? `Iga ${t.interval_count} nädala järel` : 'Iganädalane';
  if (m === 1) return 'Igakuine';
  if (m === 3) return 'Kvartaalne';
  if (m === 6) return 'Poolaastane';
  if (m === 12) return 'Aastane';
  return `Iga ${m} kuu järel`;
}

/** UI months (1/2/3/6/12) → backend frequency + interval. */
export function toFrequency(months: number): { frequency: Frequency; interval_count: number } {
  if (months === 12) return { frequency: 'yearly', interval_count: 1 };
  if (months === 3) return { frequency: 'quarterly', interval_count: 1 };
  return { frequency: 'monthly', interval_count: months };
}

const d = (iso: string) => new Date(iso.slice(0, 10) + 'T00:00:00Z');
const iso = (x: Date) => x.toISOString().slice(0, 10);

function issueDate(year: number, month0: number, day: number) {
  const last = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, month0, Math.min(day, last)));
}

export function nextRun(t: Pick<RecurringTemplate, 'frequency' | 'interval_count' | 'day_of_month'>, cur: string): string {
  const x = d(cur);
  const m = frequencyMonths(t);
  if (m == null) return iso(new Date(x.getTime() + 7 * (t.interval_count || 1) * 86400000));
  return iso(issueDate(x.getUTCFullYear(), x.getUTCMonth() + m, t.day_of_month || x.getUTCDate()));
}

export function upcomingRuns(t: RecurringTemplate, count: number): string[] {
  const out: string[] = [];
  let cur = t.next_invoice_date;
  for (let i = 0; i < count; i++) {
    if (t.end_date && cur > t.end_date) break;
    out.push(cur);
    cur = nextRun(t, cur);
  }
  return out;
}

export function periodFor(
  t: Pick<RecurringTemplate, 'frequency' | 'interval_count' | 'billing_period_offset'>,
  runDate: string,
): { from: string; to: string } {
  const x = d(runDate);
  const m = frequencyMonths(t);
  const off = t.billing_period_offset || 0;
  if (m == null) {
    const start = new Date(x.getTime() + 7 * (t.interval_count || 1) * off * 86400000);
    return { from: iso(start), to: iso(new Date(start.getTime() + (7 * (t.interval_count || 1) - 1) * 86400000)) };
  }
  const y = x.getUTCFullYear();
  const mo = x.getUTCMonth();
  const aligned = m > 1 && 12 % m === 0;
  const start = (aligned ? Math.floor(mo / m) * m : mo) + off * m;
  return { from: iso(new Date(Date.UTC(y, start, 1))), to: iso(new Date(Date.UTC(y, start + m, 0))) };
}

// ─── Amounts ──────────────────────────────────────────────────────────

type LineLike = Pick<TemplateLine, 'quantity' | 'unit_price' | 'discount_percent' | 'tax_rate' | 'variable_quantity'>;

export const lineNet = (l: LineLike, qty = l.quantity) => r2(qty * l.unit_price * (1 - (l.discount_percent || 0) / 100));
export const lineVat = (l: LineLike, qty = l.quantity) => r2(lineNet(l, qty) * (l.tax_rate || 0) / 100);

/** Fixed part of one invoice (variable-quantity lines excluded). */
export function fixedTotals(lines: LineLike[]) {
  const fixed = lines.filter((l) => !l.variable_quantity);
  const net = r2(fixed.reduce((s, l) => s + lineNet(l), 0));
  const vat = r2(fixed.reduce((s, l) => s + lineVat(l), 0));
  return { net, vat, gross: r2(net + vat) };
}

export const hasVariable = (t: Pick<RecurringTemplate, 'lines'>) => (t.lines || []).some((l) => l.variable_quantity);
export const activeClients = (t: RecurringTemplate) => (t.clients || []).filter((c) => c.is_active);

export function vatLabel(lines: LineLike[]) {
  const rates = [...new Set(lines.map((l) => Number(l.tax_rate)))];
  return rates.length === 1 ? `KM ${rates[0]}%` : 'KM mitu määra';
}

// ─── Derived status ───────────────────────────────────────────────────

export type TemplateState = 'ok' | 'wait' | 'late' | 'paused';

export function templateState(t: RecurringTemplate, today = todayIso()): TemplateState {
  if (!t.is_active) return 'paused';
  const awaiting = (t.open_pending || []).filter((p) => p.status === 'awaiting_quantity' || p.status === 'ready');
  if (awaiting.some((p) => p.run_date < today)) return 'late';
  if (hasVariable(t)) return 'wait';
  return 'ok';
}

export const STATE_LABEL: Record<TemplateState, [string, string]> = {
  ok: ['ok', 'Aktiivne'],
  wait: ['w', 'Ootab kogust'],
  late: ['bad', 'Hilinenud'],
  paused: ['off', 'Peatatud'],
};

/** Failures in the latest run batch (runs sharing the newest period). */
export function lastRunErrors(t: RecurringTemplate): number {
  const runs = t.recent_runs || [];
  if (!runs.length) return 0;
  const latest = runs.reduce((a, r) => (r.period_start > a ? r.period_start : a), runs[0].period_start);
  return runs.filter((r) => r.period_start === latest && (r.status === 'failed' || r.delivery_status === 'failed')).length;
}

export function deliveryLabel(t: RecurringTemplate) {
  if (hasVariable(t)) return 'Mustand';
  return t.delivery === 'auto' ? 'Automaatne' : 'Ülevaatusele';
}

export const PLACEHOLDER_RE = /\{[a-z_]+\}/gi;
export const stripPlaceholders = (s: string) => s.replace(PLACEHOLDER_RE, '').replace(/\s{2,}/g, ' ').trim();
