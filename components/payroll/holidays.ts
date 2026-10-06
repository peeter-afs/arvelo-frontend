/**
 * Estonian public holidays and holiday-day counting for instant feedback in
 * forms. Mirrors backend services/payroll/absenceCalc.ts, which stays the
 * source of truth for payroll.
 */
const DAY = 86_400_000;
const t = (d: string) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

function easterSunday(year: number): string {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const cache = new Map<number, Set<string>>();
export function publicHolidays(year: number): Set<string> {
  if (!cache.has(year)) {
    const easter = t(easterSunday(year));
    const fixed = ['01-01', '02-24', '05-01', '06-23', '06-24', '08-20', '12-24', '12-25', '12-26'].map((md) => `${year}-${md}`);
    cache.set(year, new Set([...fixed, iso(easter - 2 * DAY), iso(easter), iso(easter + 49 * DAY)]));
  }
  return cache.get(year)!;
}

/** Holiday days of a leave: calendar days minus public holidays (TLS § 55). */
export function vacationDays(start: string, end: string): number {
  if (!start || !end || end < start) return 0;
  let n = 0;
  for (let ms = t(start); ms <= t(end); ms += DAY) {
    const d = iso(ms);
    if (!publicHolidays(Number(d.slice(0, 4))).has(d)) n++;
  }
  return n;
}
