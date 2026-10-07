#!/usr/bin/env node
/**
 * Checks the report row-model builders and the Excel sheet layout
 * (docs2/design_handoff_aruanded). No test runner in this repo, so this runs
 * the TypeScript sources through jiti:  node scripts/check-report-builders.mjs
 */
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createJiti } from 'jiti';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jiti = createJiti(import.meta.url, { alias: { '@': root } });
const load = (p) => jiti.import(path.join(root, p));

const { buildBalanceSheet } = await load('lib/reports/build/balanceSheet.ts');
const { buildProfitLoss } = await load('lib/reports/build/profitLoss.ts');
const { buildAging } = await load('lib/reports/build/aging.ts');
const { buildDimensions } = await load('lib/reports/build/dimensions.ts');
const { sheetRows, ranges } = await load('lib/reports/exportXlsx.ts');
const periods = await load('lib/reports/periods.ts');
const fmt = await load('lib/reports/format.ts');

let failures = 0;
const test = (name, fn) => {
  try { fn(); console.log(`✓ ${name}`); } catch (e) { failures += 1; console.error(`✗ ${name}\n  ${e.message}`); }
};

const bs = {
  assets: [
    { account_id: 'a1', account_code: '1000', account_name: 'Pank', account_type: 'asset', balance: 700, compare_balance: 500, report_line: 'current_assets' },
    { account_id: 'a2', account_code: '1710', account_name: 'Masinad', account_type: 'asset', balance: 500, compare_balance: 0, report_line: 'fixed_assets' },
    { account_id: 'a3', account_code: '1010', account_name: 'Kassa', account_type: 'asset', balance: 0, compare_balance: 0, report_line: 'current_assets' },
  ],
  liabilities: [{ account_id: 'l1', account_code: '2600', account_name: 'Laen', account_type: 'liability', balance: 400, compare_balance: 400, report_line: 'long_term_liabilities' }],
  equity: [
    { account_id: 'e1', account_code: '2900', account_name: 'Osakapital', account_type: 'equity', balance: 2500, compare_balance: 2500, report_line: 'equity' },
    { account_id: null, account_code: '', account_name: 'Aruandeaasta kasum (kahjum)', account_type: 'equity', balance: -1700, compare_balance: -2400, report_line: 'equity', special: 'current_year_earnings' },
  ],
  totalAssets: 1200, totalLiabilities: 400, totalEquity: 800, asOfDate: '2026-10-07',
};

test('balance sheet balances and groups by schema line', () => {
  const { model, totals, check } = buildBalanceSheet(bs, { periodLabel: '07.10.2026', compareLabel: '31.12.2025' });
  assert.equal(check.ok, true);
  assert.equal(totals.assets, 1200);
  const names = model.rows.map((r) => `${r.t}:${r.name}`);
  assert.deepEqual(names.slice(0, 4), ['sec:Varad', 'grp:Käibevara', 'ln:Pank', 'ln:Kassa']);
  assert.ok(names.includes('grp:Pikaajalised kohustised'));
  assert.ok(names.includes('ln:Aruandeaasta kasum (kahjum) (arvutuslik)'));
  assert.equal(model.rows.find((r) => r.name === 'Kassa').zero, true);
  const pank = model.rows.find((r) => r.name === 'Pank');
  assert.deepEqual(pank.v.slice(0, 3), [700, 500, 200]);
  assert.equal(Math.round(pank.v[3] * 10) / 10, 40);
  assert.equal(model.cols.length, 5);
});

test('balance sheet flags an imbalance', () => {
  const broken = { ...bs, liabilities: [{ ...bs.liabilities[0], balance: 450 }] };
  const { check } = buildBalanceSheet(broken, { periodLabel: 'x', compareLabel: null });
  assert.equal(check.ok, false);
  assert.equal(Math.round(check.diff), -50);
});

test('profit and loss: expenses negative, result lines run', () => {
  const pl = {
    revenue: [
      { account_id: 'r1', account_code: '3000', account_name: 'Müük', account_type: 'revenue', amount: 1000, report_line: 'revenue' },
      { account_id: 'r2', account_code: '3200', account_name: 'Intress', account_type: 'revenue', amount: 10, report_line: 'financial' },
    ],
    expenses: [
      { account_id: 'x1', account_code: '4210', account_name: 'Palk', account_type: 'expense', amount: 300, report_line: 'labour' },
      { account_id: 'x2', account_code: '4220', account_name: 'Sotsiaalmaks', account_type: 'expense', amount: 99, report_line: 'labour' },
      { account_id: 'x3', account_code: '4600', account_name: 'Tulumaks', account_type: 'expense', amount: 20, report_line: 'income_tax' },
    ],
    totalRevenue: 1010, totalExpenses: 419, netIncome: 591, startDate: '2026-01-01', endDate: '2026-10-07',
  };
  const { model, totals } = buildProfitLoss(pl, { periodLabel: 'Periood', compareLabel: null });
  const res = model.rows.filter((r) => r.t === 'res').map((r) => [r.name, r.v[0]]);
  assert.deepEqual(res, [['Ärikasum (-kahjum)', 601], ['Kasum (kahjum) enne tulumaksu', 611], ['Aruandeaasta kasum (kahjum)', 591]]);
  assert.equal(model.rows.find((r) => r.name === 'Palk').v[0], -300);
  assert.ok(model.rows.some((r) => r.t === 'tot' && r.name === 'Tööjõukulud kokku'));
  assert.ok(!model.rows.some((r) => r.t === 'tot' && r.name === 'Müügitulu kokku'), 'single-line group has no subtotal');
  assert.equal(totals.income, 1000);
  assert.equal(totals.net, 591);
});

test('profit and loss without report_line falls back by type', () => {
  const { model } = buildProfitLoss({
    revenue: [{ account_code: '3000', account_name: 'Müük', account_type: 'revenue', amount: 5 }],
    expenses: [{ account_code: '4000', account_name: 'Kulu', account_type: 'expense', amount: 2 }],
  }, { periodLabel: 'Periood', compareLabel: null });
  assert.deepEqual(model.rows.filter((r) => r.t === 'grp').map((r) => r.name), ['Müügitulu', 'Mitmesugused tegevuskulud']);
});

test('aging: only overdue hides partners within terms', () => {
  const p = (id, current, d30, total) => ({ partner_id: id, partner_name: id, current, days_1_30: d30, days_31_60: 0, days_61_90: 0, over_90: 0, total, invoices: [{}] });
  const data = { direction: 'receivable', as_of_date: '2026-10-07', summary: {}, partners: [p('A', 100, 0, 100), p('B', 0, 50, 50)] };
  assert.equal(buildAging(data, { overdueOnly: false }).count, 2);
  const only = buildAging(data, { overdueOnly: true });
  assert.equal(only.count, 1);
  assert.equal(only.total, 50);
  assert.equal(only.model.rows[0].tone[1], 'b1');
});

test('dimensions add drafts and compute margin', () => {
  const row = { id: 'p1', code: 'P-1', name: 'Maja', is_active: true, status: 'in_progress', revenue: 100, costs: 60, result: 40, wip_balance: 5, draft_revenue: 20, draft_costs: 10, sales_invoices: 1, purchase_invoices: 1 };
  const data = { period: {}, include_drafts: true, cost_centers: [], projects: [row], totals: {}, lines: [] };
  const { model, totals } = buildDimensions(data, { kind: 'projects', drafts: true });
  assert.deepEqual(model.rows[0].v.slice(0, 3), [120, -70, 50]);
  assert.equal(Math.round(model.rows[0].v[3] * 10) / 10, 41.7);
  assert.equal(totals.wip, 5);
  assert.equal(model.rows[0].tag.label, 'Pooleli');
});

test('excel: totals are SUM formulas, derived columns are row formulas', () => {
  const { model } = buildBalanceSheet(bs, { periodLabel: '07.10.2026', compareLabel: '31.12.2025' });
  const { data, header, HEADER } = sheetRows(model, { title: 'Bilanss', company: 'X', periodLine: '', filename: 'b', showZero: false });
  assert.deepEqual(header.map((h) => h.value), ['Kood', 'Konto', '07.10.2026', '31.12.2025', 'Muutus', '%']);
  const keys = model.rows.filter((r) => !r.zero).map((r) => r.key);
  const at = (key) => data[keys.indexOf(key)];
  const assetsTotal = at('gr:a');
  assert.match(assetsTotal.cells[2].formula, /^SUM\(C\d+(:C\d+)?(,C\d+)*\)$/);
  assert.equal(assetsTotal.cells[2].result, 1200);
  const pank = at('a:a1');
  assert.equal(pank.cells[2].value, 700);
  assert.equal(pank.cells[4].formula, `C${HEADER + 1 + keys.indexOf('a:a1')}-D${HEADER + 1 + keys.indexOf('a:a1')}`);
  assert.match(pank.cells[5].formula, /^IF\(ABS\(D\d+\)<0.005,"",\(C\d+-D\d+\)\/ABS\(D\d+\)\*100\)$/);
  assert.equal(ranges('C', [7, 8, 9, 12]), 'C7:C9,C12');
});

test('periods: presets, comparison and parsing', () => {
  const today = new Date(2026, 9, 7);
  const years = [{ date_start: '2026-01-01', date_end: '2026-12-31' }];
  assert.equal(periods.asOfDate('pm', undefined, years, today), '2026-09-30');
  assert.equal(periods.asOfDate('pq', undefined, years, today), '2026-09-30');
  assert.equal(periods.asOfDate('py', undefined, years, today), '2025-12-31');
  assert.deepEqual(periods.rangeDates('ytd', undefined, undefined, years, today), ['2026-01-01', '2026-10-07']);
  assert.deepEqual(periods.rangeDates('pq', undefined, undefined, years, today), ['2026-07-01', '2026-09-30']);
  assert.deepEqual(periods.rangeDates('py', undefined, undefined, years, today), ['2025-01-01', '2025-12-31']);
  // Fiscal year from July: "Aasta algusest" starts 01.07.
  const july = [{ date_start: '2026-07-01', date_end: '2027-06-30' }];
  assert.deepEqual(periods.rangeDates('ytd', undefined, undefined, july, today), ['2026-07-01', '2026-10-07']);
  assert.equal(periods.compareAsOf('pye', '2026-10-07', undefined, years), '2025-12-31');
  assert.equal(periods.compareAsOf('sdly', '2024-02-29', undefined, []), '2023-02-28');
  assert.deepEqual(periods.compareRange('pp', '2026-01-01', '2026-10-07'), ['2025-03-27', '2025-12-31']);
  assert.deepEqual(periods.compareRange('spy', '2026-01-01', '2026-10-07'), ['2025-01-01', '2025-10-07']);
  assert.equal(fmt.parseDmy('07.10.2026'), '2026-10-07');
  assert.equal(fmt.parseDmy('31.02.2026'), null);
  assert.equal(fmt.fmtNum(-12345.5), '−12\u00a0345,50');
  assert.equal(fmt.fmtNum(0), '–');
  assert.equal(fmt.fmtPct(12.44), '+12,4%');
  assert.equal(fmt.norm('Käibeandmik'), 'kaibeandmik');
});

if (failures) { console.error(`\n${failures} failed`); process.exit(1); }
console.log('\nall report builder checks passed');
