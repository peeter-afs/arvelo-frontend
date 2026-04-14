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
