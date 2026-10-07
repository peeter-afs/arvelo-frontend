/**
 * Excel export (handoff §7): mirrors the row model. Numbers are numeric cells
 * with #,##0.00, tot/gr/res rows are SUM formulas over their lines and derived
 * columns (Muutus, %, Marginaal) are row formulas, so edits in Excel recalc.
 * exceljs is loaded on demand.
 */

import type { ReportModel } from './types';
import { downloadCsv } from '@/lib/utils/csvExport';

export type ExportMeta = {
  /** Sheet name and title row ("Bilanss"). */
  title: string;
  company: string;
  /** "Seisuga 07.10.2026 · võrdlus 31.12.2025 · summad eurodes". */
  periodLine: string;
  /** Without extension: "bilanss_2026-10-07". */
  filename: string;
  showZero: boolean;
};

export const colLetter = (n: number) => {
  let s = '';
  for (let i = n; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
  return s;
};

/** "C10:C12,C15" from row numbers. */
export function ranges(col: string, rows: number[]) {
  const sorted = [...rows].sort((a, b) => a - b);
  const parts: string[] = [];
  for (let i = 0; i < sorted.length; ) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j += 1;
    parts.push(i === j ? `${col}${sorted[i]}` : `${col}${sorted[i]}:${col}${sorted[j]}`);
    i = j + 1;
  }
  return parts.join(',');
}

type CellSpec = { value?: string | number; formula?: string; result?: number | string; numFmt?: string };
export type SheetRow = { cells: CellSpec[]; bold?: boolean; strongTop?: boolean };

/** The sheet as plain data (testable without exceljs): header at row 5, data below. */
export function sheetRows(model: ReportModel, meta: ExportMeta) {
  const rows = meta.showZero ? model.rows : model.rows.filter((r) => !r.zero);
  const hasCodes = rows.some((r) => r.code);
  const first = hasCodes ? 3 : 2; // first numeric column, 1-based
  const numCols = model.cols.slice(1);
  const HEADER = 5;
  const rowNo = new Map<string, number>();
  rows.forEach((r, i) => rowNo.set(r.key, HEADER + 1 + i));

  const header: CellSpec[] = [
    ...(hasCodes ? [{ value: 'Kood' }] : []),
    { value: model.cols[0].label },
    ...numCols.map((c) => ({ value: c.label })),
  ];

  const data: SheetRow[] = rows.map((r, i) => {
    const n = HEADER + 1 + i;
    const cells: CellSpec[] = [
      ...(hasCodes ? [{ value: r.code ?? '' }] : []),
      { value: r.sub ? `${r.name} · ${r.sub}` : r.name },
    ];
    if (r.v) {
      const sumRows = r.sumOf?.map((k) => rowNo.get(k)).filter((x): x is number => x != null) ?? [];
      numCols.forEach((c, j) => {
        const value = r.v?.[j];
        const numFmt = c.pct ? '0.0' : '#,##0.00';
        const L = (k: number) => colLetter(first + k);
        if (c.calc) {
          const A = `${L(c.calc.a)}${n}`, B = `${L(c.calc.b)}${n}`;
          const formula = c.calc.kind === 'diff' ? `${A}-${B}`
            : c.calc.kind === 'pct' ? `IF(ABS(${B})<0.005,"",(${A}-${B})/ABS(${B})*100)`
            : `IF(ABS(${B})<0.005,"",${A}/${B}*100)`;
          cells.push({ formula, result: value ?? '', numFmt });
        } else if (r.t !== 'ln' && sumRows.length && !c.noSum) {
          cells.push({ formula: `SUM(${ranges(colLetter(first + j), sumRows)})`, result: value ?? 0, numFmt });
        } else {
          cells.push(value == null ? { numFmt } : { value, numFmt });
        }
      });
    }
    return { cells, bold: r.t !== 'ln', strongTop: r.t === 'gr' || r.t === 'res' };
  });

  return { header, data, hasCodes, HEADER, numCols };
}

export async function exportXlsx(model: ReportModel, meta: ExportMeta) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Arvelo';
  const ws = wb.addWorksheet(meta.title.slice(0, 31).replace(/[\\/?*[\]:]/g, ' '));
  const { header, data, hasCodes, HEADER, numCols } = sheetRows(model, meta);

  ws.getCell('A1').value = meta.company;
  ws.getCell('A1').font = { bold: true };
  ws.getCell('A2').value = meta.title;
  ws.getCell('A2').font = { bold: true, size: 14 };
  ws.getCell('A3').value = meta.periodLine;
  ws.getCell('A3').font = { color: { argb: 'FF666666' } };

  ws.columns = [
    ...(hasCodes ? [{ width: 9 }] : []),
    { width: 46 },
    ...numCols.map((c) => ({ width: c.pct ? 10 : 16 })),
  ];

  const head = ws.getRow(HEADER);
  header.forEach((c, i) => {
    const cell = head.getCell(i + 1);
    cell.value = c.value ?? null;
    cell.font = { bold: true };
    cell.border = { bottom: { style: 'thin' } };
    if (i >= (hasCodes ? 2 : 1)) cell.alignment = { horizontal: 'right' };
  });

  data.forEach((r, i) => {
    const row = ws.getRow(HEADER + 1 + i);
    r.cells.forEach((c, j) => {
      const cell = row.getCell(j + 1);
      if (c.formula) cell.value = { formula: c.formula, result: c.result } as never;
      else if (c.value !== undefined) cell.value = c.value;
      if (c.numFmt) cell.numFmt = c.numFmt;
    });
    if (r.bold) row.font = { bold: true };
    if (r.strongTop) for (let j = 1; j <= header.length; j += 1) row.getCell(j).border = { top: { style: 'medium' } };
  });

  ws.views = [{ state: 'frozen', ySplit: HEADER }];

  const buffer = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${meta.filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** CSV stays as before (downloadCsv): lines only, no formatting. */
export function exportCsv(model: ReportModel, meta: ExportMeta) {
  const lines = (meta.showZero ? model.rows : model.rows.filter((r) => !r.zero)).filter((r) => r.t === 'ln');
  const columns = [
    { key: 'code', label: 'Kood' },
    { key: 'name', label: model.cols[0].label },
    ...model.cols.slice(1).map((c, i) => ({ key: `v${i}`, label: c.label })),
  ];
  downloadCsv(
    lines.map((r) => ({
      code: r.code ?? '',
      name: r.sub ? `${r.name} · ${r.sub}` : r.name,
      ...Object.fromEntries((r.v ?? []).map((v, i) => [`v${i}`, v == null ? '' : v.toFixed(model.cols[i + 1]?.pct ? 1 : 2)])),
    })),
    `${meta.filename}.csv`,
    columns,
  );
}
