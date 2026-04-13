/**
 * Convert an array of objects to CSV and trigger download.
 */
export function downloadCsv(
  rows: Record<string, string | number | boolean | null | undefined>[],
  filename: string,
  columns?: { key: string; label: string }[]
) {
  if (rows.length === 0) return;

  const cols = columns || Object.keys(rows[0]).map((key) => ({ key, label: key }));
  const header = cols.map((c) => escapeCsvField(c.label)).join(',');
  const body = rows
    .map((row) => cols.map((c) => escapeCsvField(String(row[c.key] ?? ''))).join(','))
    .join('\n');

  const csv = `\uFEFF${header}\n${body}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeCsvField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
