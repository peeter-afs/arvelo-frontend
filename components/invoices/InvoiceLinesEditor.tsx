'use client';

import { useMemo, useState } from 'react';
import { Eye, EyeOff, PackagePlus, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { AccountOption } from '@/lib/api/accounting.api';
import type { Product } from '@/lib/api/products.api';

export type SupplyType = 'domestic' | 'intra_community' | 'reverse_charge' | 'third_country';

export type EditorLine = {
  description: string;
  code?: string;
  account_id: string;
  quantity: string;
  unit_price: string;
  discount_percent: string;
  tax_rate: string;
  supply_type?: SupplyType;
};

export const emptyEditorLine = (): EditorLine => ({
  description: '',
  code: '',
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
  /** Whether the supply-type (VAT treatment) column is available for this editor (off-by-default toggle). */
  showSupplyType?: boolean;
  currency?: string;
  /** Restrict the account picker to a single account type (e.g. 'revenue' for sales, 'expense' for purchases). */
  accountFilterType?: 'revenue' | 'expense';
  /** Default sales account id per supply type; auto-fills an empty line account on add / supply-type change. */
  supplyTypeDefaults?: Partial<Record<SupplyType, string>>;
  /** Catalog products for the line search/pick. */
  products?: Product[];
  /** Quick-add the current line to the product catalog. */
  onQuickAdd?: (line: EditorLine) => void;
  /** When false the tenant is not VAT-liable: the VAT column is hidden and lines carry no VAT. */
  vatEnabled?: boolean;
};

export default function InvoiceLinesEditor({
  lines,
  onChange,
  accounts,
  showSupplyType = false,
  currency = 'EUR',
  accountFilterType,
  supplyTypeDefaults,
  products,
  onQuickAdd,
  vatEnabled = true,
}: Props) {
  const t = useTranslations('invoices');
  // Account and supply-type columns are hidden by default — reveal only when needed.
  const [showAccount, setShowAccount] = useState(false);
  const [showSupply, setShowSupply] = useState(false);
  const [productMenuRow, setProductMenuRow] = useState<number | null>(null);

  const supplyVisible = showSupplyType && showSupply;
  const vatVisible = vatEnabled;

  const productMatches = (query: string): Product[] => {
    if (!products || products.length === 0) return [];
    const s = query.trim().toLowerCase();
    const pool = !s
      ? products
      : products.filter((p) => `${p.name} ${p.code || ''} ${p.description || ''}`.toLowerCase().includes(s));
    return pool.slice(0, 8);
  };

  const applyProduct = (index: number, line: EditorLine, product: Product) => {
    update(index, {
      description: product.description || product.name,
      code: product.code || line.code || '',
      unit_price: product.unit_price != null ? String(product.unit_price) : line.unit_price,
      tax_rate: vatEnabled ? (product.tax_rate != null ? String(product.tax_rate) : line.tax_rate) : '0',
      account_id: product.sales_account_id || line.account_id,
    });
    setProductMenuRow(null);
  };

  // Only real sales (revenue) / expense accounts — no fallback to all active.
  const accountOptions = useMemo(() => {
    const active = accounts.filter((a) => a.is_active);
    return accountFilterType ? active.filter((a) => a.type === accountFilterType) : active;
  }, [accounts, accountFilterType]);

  const accountLabels = useMemo(() => {
    const labels = new Map<string, string>();
    const codes = new Map<string, string>();
    accounts.forEach((a) => {
      labels.set(a.id, `${a.code} ${a.name}`);
      codes.set(a.id, a.code);
    });
    return { labels, codes };
  }, [accounts]);

  const totals = useMemo(() => computeTotals(lines), [lines]);

  const update = (index: number, patch: Partial<EditorLine>) =>
    onChange(lines.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  const remove = (index: number) =>
    onChange(lines.length > 1 ? lines.filter((_, i) => i !== index) : lines);
  const add = () => {
    const line = emptyEditorLine();
    if (!vatEnabled) line.tax_rate = '0';
    const fallback = supplyTypeDefaults?.[line.supply_type || 'domestic'];
    if (fallback) line.account_id = fallback;
    onChange([...lines, line]);
  };

  const changeSupplyType = (index: number, line: EditorLine, supply_type: SupplyType) => {
    const fallback = supplyTypeDefaults?.[supply_type];
    update(index, fallback && !line.account_id ? { supply_type, account_id: fallback } : { supply_type });
  };

  // Column order: code · description · qty · unit price · discount · [VAT] · [supply] · line total · account · delete
  const gridCols = [
    '88px',
    'minmax(150px,1fr)',
    '64px',
    '96px',
    '76px',
    vatVisible ? '66px' : null,
    supplyVisible ? '140px' : null,
    '100px',
    showAccount ? '160px' : '64px',
    onQuickAdd ? '58px' : '32px',
  ]
    .filter(Boolean)
    .join(' ');
  const minWidth =
    574 + (vatVisible ? 66 : 0) + (supplyVisible ? 140 : 0) + (showAccount ? 160 : 64) + (onQuickAdd ? 58 : 32);

  return (
    <div>
      <div className="mb-2 flex justify-end gap-2">
        {showSupplyType && (
          <button
            type="button"
            onClick={() => setShowSupply((v) => !v)}
            title={showSupply ? t('hideSupplyColumn') : t('showSupplyColumn')}
            className="inline-flex items-center gap-1.5 rounded-md border border-[var(--a-border)] px-2 py-1 text-[11.5px] text-[var(--a-text-2)] hover:bg-[var(--a-surface-2)]"
          >
            {showSupply ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {t('supplyType')}
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowAccount((v) => !v)}
          title={showAccount ? t('hideAccountColumn') : t('showAccountColumn')}
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--a-border)] px-2 py-1 text-[11.5px] text-[var(--a-text-2)] hover:bg-[var(--a-surface-2)]"
        >
          {showAccount ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {t('account')}
        </button>
      </div>

      <div className="overflow-x-auto rounded-[10px] border border-[var(--a-border)]">
        <div style={{ minWidth }}>
          {/* Header */}
          <div
            className="grid items-center gap-2 border-b border-[var(--a-border)] bg-[var(--a-surface-2)] px-3.5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--a-text-3)]"
            style={{ gridTemplateColumns: gridCols }}
          >
            <div>{t('productCode')}</div>
            <div>{t('lineDescription')}</div>
            <div className="text-right">{t('qty')}</div>
            <div className="text-right">{t('unitPrice')}</div>
            <div className="text-right">{t('discount')}</div>
            {vatVisible && <div className="text-right">{t('vatRate')}</div>}
            {supplyVisible && <div>{t('supplyType')}</div>}
            <div className="text-right">{t('lineTotal')}</div>
            <div>{t('account')}</div>
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
                  value={line.code || ''}
                  onChange={(event) => update(index, { code: event.target.value })}
                  placeholder={t('productCode')}
                  className={inputClass}
                />
                {products && products.length > 0 ? (
                  <div className="relative">
                    <input
                      value={line.description}
                      onChange={(event) => update(index, { description: event.target.value })}
                      onFocus={() => setProductMenuRow(index)}
                      onBlur={() => setTimeout(() => setProductMenuRow((m) => (m === index ? null : m)), 150)}
                      placeholder={t('selectProduct')}
                      className={inputClass}
                    />
                    {productMenuRow === index && productMatches(line.description).length > 0 && (
                      <div className="absolute left-0 top-full z-20 mt-1 max-h-56 w-[300px] overflow-y-auto rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] py-1 shadow-lg">
                        {productMatches(line.description).map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); applyProduct(index, line, p); }}
                            className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left hover:bg-[var(--a-surface-2)]"
                          >
                            <span className="truncate text-[12.5px] text-[var(--a-text)]">
                              {p.name}{p.code ? ` · ${p.code}` : ''}
                            </span>
                            <span className="shrink-0 font-mono text-[11px] tabular-nums text-[var(--a-text-3)]">
                              {p.unit_price != null ? Number(p.unit_price).toFixed(2) : ''}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    value={line.description}
                    onChange={(event) => update(index, { description: event.target.value })}
                    placeholder={t('lineDescription')}
                    className={inputClass}
                  />
                )}
                <input inputMode="decimal" value={line.quantity} onChange={(e) => update(index, { quantity: e.target.value })} placeholder={t('qty')} className={numberClass} />
                <input inputMode="decimal" value={line.unit_price} onChange={(e) => update(index, { unit_price: e.target.value })} placeholder={t('unitPrice')} className={numberClass} />
                <input inputMode="decimal" value={line.discount_percent} onChange={(e) => update(index, { discount_percent: e.target.value })} placeholder="0" className={numberClass} />
                {vatVisible && (
                  <input inputMode="decimal" value={line.tax_rate} onChange={(e) => update(index, { tax_rate: e.target.value })} placeholder="0" className={numberClass} />
                )}
                {supplyVisible && (
                  <select
                    value={line.supply_type || 'domestic'}
                    onChange={(event) => changeSupplyType(index, line, event.target.value as SupplyType)}
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
                {showAccount ? (
                  <select
                    value={line.account_id}
                    onChange={(event) => update(index, { account_id: event.target.value })}
                    className={`${inputClass} text-[12px]`}
                  >
                    <option value="">{t('account')}</option>
                    {accountOptions.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.code} {account.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div
                    className="truncate font-mono text-[11.5px] tabular-nums text-[var(--a-text-2)]"
                    title={line.account_id ? accountLabels.labels.get(line.account_id) : t('noAccountSelected')}
                  >
                    {line.account_id ? (accountLabels.codes.get(line.account_id) || '·') : '—'}
                  </div>
                )}
                <div className="flex items-center justify-end gap-0.5">
                  {onQuickAdd && (
                    <button
                      type="button"
                      onClick={() => onQuickAdd(line)}
                      disabled={!line.description.trim()}
                      title={t('quickAddToCatalog')}
                      className="flex h-7 w-7 items-center justify-center rounded text-[var(--a-text-3)] hover:bg-[var(--a-accent-soft)] hover:text-[var(--a-accent)] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--a-text-3)]"
                    >
                      <PackagePlus className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={lines.length === 1}
                    className="flex h-7 w-7 items-center justify-center rounded text-[var(--a-text-3)] hover:bg-[var(--a-neg-soft)] hover:text-[var(--a-neg)] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--a-text-3)]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add line */}
          <div className="px-3.5 py-2">
            <button type="button" onClick={add} className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--a-text-3)] hover:text-[var(--a-text)]">
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
            {vatVisible && (
              <div className="flex w-full max-w-[260px] justify-between text-[var(--a-text-2)]">
                <span>{t('taxTotal')}</span>
                <span className="font-mono tabular-nums text-[var(--a-text)]">{totals.tax.toFixed(2)} {currency}</span>
              </div>
            )}
            <div className="flex w-full max-w-[260px] justify-between border-t border-[var(--a-border)] pt-1 font-semibold text-[var(--a-text)]">
              <span>{t('total')}</span>
              <span className="font-mono tabular-nums">{totals.total.toFixed(2)} {currency}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
