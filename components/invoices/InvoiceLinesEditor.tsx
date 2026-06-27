'use client';

import { useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { AccountOption } from '@/lib/api/accounting.api';

export type SupplyType = 'domestic' | 'intra_community' | 'reverse_charge' | 'third_country';

export type EditorLine = {
  description: string;
  account_id: string;
  quantity: string;
  unit_price: string;
  discount_percent: string;
  tax_rate: string;
  supply_type?: SupplyType;
};

export const emptyEditorLine = (): EditorLine => ({
  description: '',
  account_id: '',
  quantity: '1',
  unit_price: '',
  discount_percent: '0',
  tax_rate: '22',
  supply_type: 'domestic',
});

export function lineNet(line: EditorLine): number {
  const quantity = Number(line.quantity || 0);
  const unitPrice = Number(line.unit_price || 0);
  const discount = Number(line.discount_percent || 0);
  const net = quantity * unitPrice * (1 - discount / 100);
  return Number.isFinite(net) ? net : 0;
}

export function lineTax(line: EditorLine): number {
  const tax = lineNet(line) * (Number(line.tax_rate || 0) / 100);
  return Number.isFinite(tax) ? tax : 0;
}

export function computeTotals(lines: EditorLine[]): { subtotal: number; tax: number; total: number } {
  const acc = lines.reduce(
    (sum, line) => {
      sum.subtotal += lineNet(line);
      sum.tax += lineTax(line);
      return sum;
    },
    { subtotal: 0, tax: 0 }
  );
  return { ...acc, total: acc.subtotal + acc.tax };
}

const inputClass =
  'h-8 w-full rounded border border-[var(--a-border)] bg-[var(--a-surface)] px-2 text-[12.5px] text-[var(--a-text)] placeholder:text-[var(--a-text-3)] outline-none focus:border-[var(--a-accent)]';
const numberClass = `${inputClass} text-right font-mono tabular-nums`;

type Props = {
  lines: EditorLine[];
  onChange: (lines: EditorLine[]) => void;
  accounts: AccountOption[];
  showSupplyType?: boolean;
  currency?: string;
};

export default function InvoiceLinesEditor({
  lines,
  onChange,
  accounts,
  showSupplyType = false,
  currency = 'EUR',
}: Props) {
  const t = useTranslations('invoices');

  const activeAccounts = useMemo(() => accounts.filter((account) => account.is_active), [accounts]);
  const totals = useMemo(() => computeTotals(lines), [lines]);

  const update = (index: number, patch: Partial<EditorLine>) =>
    onChange(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  const remove = (index: number) =>
    onChange(lines.length > 1 ? lines.filter((_, i) => i !== index) : lines);
  const add = () => onChange([...lines, emptyEditorLine()]);

  const gridCols = showSupplyType
    ? 'minmax(160px,1fr) 150px 64px 96px 76px 66px 140px 100px 32px'
    : 'minmax(160px,1fr) 150px 64px 96px 76px 66px 100px 32px';
  const minWidth = showSupplyType ? 900 : 760;

  return (
    <div className="overflow-x-auto rounded-[10px] border border-[var(--a-border)]">
      <div style={{ minWidth }}>
        {/* Header */}
        <div
          className="grid items-center gap-2 border-b border-[var(--a-border)] bg-[var(--a-surface-2)] px-3.5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--a-text-3)]"
          style={{ gridTemplateColumns: gridCols }}
        >
          <div>{t('description')}</div>
          <div>{t('account')}</div>
          <div className="text-right">{t('qty')}</div>
          <div className="text-right">{t('unitPrice')}</div>
          <div className="text-right">{t('discount')}</div>
          <div className="text-right">{t('vatRate')}</div>
          {showSupplyType && <div>{t('supplyType')}</div>}
          <div className="text-right">{t('lineTotal')}</div>
          <div />
        </div>

        {/* Rows */}
        <div>
          {lines.map((line, index) => (
            <div
              key={index}
              className="grid items-center gap-2 border-b border-[var(--a-border)] px-3.5 py-2"
              style={{ gridTemplateColumns: gridCols }}
            >
              <input
                value={line.description}
                onChange={(event) => update(index, { description: event.target.value })}
                placeholder={t('description')}
                className={inputClass}
              />
              <select
                value={line.account_id}
                onChange={(event) => update(index, { account_id: event.target.value })}
                className={`${inputClass} text-[12px]`}
              >
                <option value="">{t('account')}</option>
                {activeAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.code} {account.name}
                  </option>
                ))}
              </select>
              <input
                inputMode="decimal"
                value={line.quantity}
                onChange={(event) => update(index, { quantity: event.target.value })}
                placeholder={t('qty')}
                className={numberClass}
              />
              <input
                inputMode="decimal"
                value={line.unit_price}
                onChange={(event) => update(index, { unit_price: event.target.value })}
                placeholder={t('unitPrice')}
                className={numberClass}
              />
              <input
                inputMode="decimal"
                value={line.discount_percent}
                onChange={(event) => update(index, { discount_percent: event.target.value })}
                placeholder="0"
                className={numberClass}
              />
              <input
                inputMode="decimal"
                value={line.tax_rate}
                onChange={(event) => update(index, { tax_rate: event.target.value })}
                placeholder="0"
                className={numberClass}
              />
              {showSupplyType && (
                <select
                  value={line.supply_type || 'domestic'}
                  onChange={(event) => update(index, { supply_type: event.target.value as SupplyType })}
                  className={`${inputClass} text-[12px]`}
                >
                  <option value="domestic">{t('supplyDomestic')}</option>
                  <option value="intra_community">{t('supplyIntraCommunity')}</option>
                  <option value="reverse_charge">{t('supplyReverseCharge')}</option>
                  <option value="third_country">{t('supplyThirdCountry')}</option>
                </select>
              )}
              <div className="text-right font-mono text-[12.5px] font-medium tabular-nums text-[var(--a-text)]">
                {lineNet(line).toFixed(2)}
              </div>
              <button
                type="button"
                onClick={() => remove(index)}
                disabled={lines.length === 1}
                className="flex h-7 w-7 items-center justify-center rounded text-[var(--a-text-3)] hover:bg-[var(--a-neg-soft)] hover:text-[var(--a-neg)] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--a-text-3)]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        {/* Add line */}
        <div className="px-3.5 py-2">
          <button
            type="button"
            onClick={add}
            className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--a-text-3)] hover:text-[var(--a-text)]"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('addLine')}
          </button>
        </div>

        {/* Totals */}
        <div className="flex flex-col items-end gap-1 border-t border-[var(--a-border)] bg-[var(--a-surface-2)] px-3.5 py-3 text-[12.5px]">
          <div className="flex w-full max-w-[260px] justify-between text-[var(--a-text-2)]">
            <span>{t('subtotal')}</span>
            <span className="font-mono tabular-nums text-[var(--a-text)]">{totals.subtotal.toFixed(2)} {currency}</span>
          </div>
          <div className="flex w-full max-w-[260px] justify-between text-[var(--a-text-2)]">
            <span>{t('taxTotal')}</span>
            <span className="font-mono tabular-nums text-[var(--a-text)]">{totals.tax.toFixed(2)} {currency}</span>
          </div>
          <div className="flex w-full max-w-[260px] justify-between border-t border-[var(--a-border)] pt-1 font-semibold text-[var(--a-text)]">
            <span>{t('total')}</span>
            <span className="font-mono tabular-nums">{totals.total.toFixed(2)} {currency}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
