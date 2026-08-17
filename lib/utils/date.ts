export function getIsoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getIsoCurrentYearStart(): string {
  return `${new Date().getFullYear()}-01-01`;
}

export function getIsoCurrentMonthStart(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

export function getIsoCurrentMonthEnd(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

export function getCurrentDateLabelEtEe(): string {
  return new Intl.DateTimeFormat('et-EE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());
}

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Shift an ISO date by whole years, clamping Feb 29 to Feb 28. */
export function shiftYearsIso(iso: string, years: number): string {
  const [y, m, day] = iso.split('-').map(Number);
  const target = new Date(Date.UTC(y + years, m - 1, day));
  if (target.getUTCMonth() !== m - 1) {
    return new Date(Date.UTC(y + years, m, 0)).toISOString().slice(0, 10);
  }
  return target.toISOString().slice(0, 10);
}

export function isFirstOfMonthIso(iso: string): boolean {
  return iso.slice(8, 10) === '01';
}

export function isLastOfMonthIso(iso: string): boolean {
  const d = new Date(`${iso}T00:00:00Z`);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return d.getUTCDate() === last.getUTCDate();
}
