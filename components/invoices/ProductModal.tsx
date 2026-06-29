'use client';

import { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { productsApi, type Product, type ProductInput, type SupplyType } from '@/lib/api/products.api';
import type { AccountOption } from '@/lib/api/accounting.api';
import { getErrorMessage } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';

const SUPPLY_TYPES: SupplyType[] = ['domestic', 'intra_community', 'reverse_charge', 'third_country'];
const fieldInput =
  'h-9 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] px-3 text-[13px] text-[var(--a-text)] placeholder:text-[var(--a-text-3)] outline-none focus:border-[var(--a-accent)]';

export function supplyKey(s: SupplyType): string {
  return s === 'intra_community'
    ? 'supplyIntraCommunity'
    : s === 'reverse_charge'
      ? 'supplyReverseCharge'
      : s === 'third_country'
        ? 'supplyThirdCountry'
        : 'supplyDomestic';
}

const baseDraft = (): ProductInput => ({
  code: '', name: '', description: '', unit: '', unit_price: null, tax_rate: 22, supply_type: 'domestic', sales_account_id: '', is_active: true,
});

type Props = {
  /** When set, the modal edits this product; otherwise it creates a new one. */
  product?: Product | null;
  /** Prefill values for create mode (e.g. quick-add from an invoice line). */
  initial?: Partial<ProductInput>;
  accounts: AccountOption[];
  onClose: () => void;
  onSaved: (product: Product) => void;
};

export function ProductModal({ product, initial, accounts, onClose, onSaved }: Props) {
  const t = useTranslations('invoices');
  const [draft, setDraft] = useState<ProductInput>(() =>
    product
      ? {
          code: product.code || '', name: product.name, description: product.description || '', unit: product.unit || '',
          unit_price: product.unit_price === null ? null : Number(product.unit_price),
          tax_rate: product.tax_rate === null ? null : Number(product.tax_rate),
          supply_type: product.supply_type, sales_account_id: product.sales_account_id || '', is_active: product.is_active,
        }
      : { ...baseDraft(), ...initial }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<ProductInput>) => setDraft((c) => ({ ...c, ...patch }));

  const save = async () => {
    if (!draft.name?.trim()) { setError(t('productNameRequired')); return; }
    setSaving(true);
    setError(null);
    try {
      const payload: ProductInput = {
        ...draft,
        unit_price: draft.unit_price === null || (draft.unit_price as unknown as string) === '' ? null : Number(draft.unit_price),
        tax_rate: draft.tax_rate === null || (draft.tax_rate as unknown as string) === '' ? null : Number(draft.tax_rate),
        sales_account_id: draft.sales_account_id || null,
      };
      const saved = product ? await productsApi.update(product.id, payload) : await productsApi.create(payload);
      onSaved(saved);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-[var(--a-border)] bg-[var(--a-surface)] shadow-xl sm:max-h-[88vh] sm:max-w-[560px] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--a-border)] px-6 py-4">
          <h2 className="text-[15px] font-semibold text-[var(--a-text)]">{product ? t('editProduct') : t('addProduct')}</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--a-text-3)] hover:bg-[var(--a-surface-2)] hover:text-[var(--a-text)]"><X className="h-4 w-4" /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {error && <div className="mb-4 rounded-lg border border-[var(--a-neg-soft)] bg-[var(--a-neg-soft)] px-3 py-2.5 text-[12.5px] text-[var(--a-neg)]">{error}</div>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t('productName')} full><input value={draft.name} onChange={(e) => set({ name: e.target.value })} className={fieldInput} autoFocus /></Field>
            <Field label={t('productCode')}><input value={draft.code || ''} onChange={(e) => set({ code: e.target.value })} className={fieldInput} /></Field>
            <Field label={t('productUnit')}><input value={draft.unit || ''} onChange={(e) => set({ unit: e.target.value })} placeholder={t('unitPlaceholder')} className={fieldInput} /></Field>
            <Field label={t('unitPrice')}><input inputMode="decimal" value={draft.unit_price ?? ''} onChange={(e) => set({ unit_price: e.target.value === '' ? null : Number(e.target.value) })} className={fieldInput} /></Field>
            <Field label={t('vatRate')}><input inputMode="decimal" value={draft.tax_rate ?? ''} onChange={(e) => set({ tax_rate: e.target.value === '' ? null : Number(e.target.value) })} className={fieldInput} /></Field>
            <Field label={t('supplyType')}>
              <select value={draft.supply_type} onChange={(e) => set({ supply_type: e.target.value as SupplyType })} className={fieldInput}>
                {SUPPLY_TYPES.map((s) => <option key={s} value={s}>{t(supplyKey(s))}</option>)}
              </select>
            </Field>
            <Field label={t('productSalesAccount')} full>
              <select value={draft.sales_account_id || ''} onChange={(e) => set({ sales_account_id: e.target.value })} className={fieldInput}>
                <option value="">{t('selectAccountOptional')}</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
              </select>
            </Field>
            <Field label={t('productDescription')} full>
              <textarea value={draft.description || ''} onChange={(e) => set({ description: e.target.value })} className={`${fieldInput} min-h-[60px] py-2`} />
            </Field>
          </div>
          <label className="mt-3 flex items-center gap-2 text-[12.5px] text-[var(--a-text-2)]">
            <input type="checkbox" checked={draft.is_active ?? true} onChange={(e) => set({ is_active: e.target.checked })} />
            {t('productActive')}
          </label>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-[var(--a-border)] px-6 py-3.5">
          <Button onClick={onClose}>{t('cancel')}</Button>
          <Button variant="primary" onClick={save} disabled={saving || !draft.name?.trim()}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {t('saveProduct')}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? 'sm:col-span-2' : ''}`}>
      <span className="micro mb-1.5 block text-[var(--a-text-3)]">{label}</span>
      {children}
    </label>
  );
}
