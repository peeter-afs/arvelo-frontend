'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, Loader2, Package, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { productsApi, type Product } from '@/lib/api/products.api';
import { accountingApi, type AccountOption } from '@/lib/api/accounting.api';
import { getErrorMessage } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';
import { ProductModal } from '@/components/invoices/ProductModal';

const fieldInput =
  'h-9 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] px-3 text-[13px] text-[var(--a-text)] placeholder:text-[var(--a-text-3)] outline-none focus:border-[var(--a-accent)]';

export default function ProductsPage() {
  const t = useTranslations('invoices');
  const [products, setProducts] = useState<Product[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  // Only real sales (revenue) accounts — no fallback to all active accounts.
  const revenueAccounts = useMemo(() => accounts.filter((a) => a.is_active && a.type === 'revenue'), [accounts]);
  const accountLabel = useMemo(() => {
    const map = new Map<string, string>();
    accounts.forEach((a) => map.set(a.id, `${a.code} ${a.name}`));
    return map;
  }, [accounts]);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await productsApi.list({ search: search.trim() || undefined });
      setProducts(items);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    accountingApi.getAccounts().then(setAccounts).catch(() => {});
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => void load(), 250);
    return () => clearTimeout(handle);
  }, [load]);

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (product: Product) => { setEditing(product); setModalOpen(true); };

  const handleDelete = async (product: Product) => {
    if (!window.confirm(t('deleteProductConfirm', { name: product.name }))) return;
    try {
      await productsApi.remove(product.id);
      await load();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const fmt = (v: number | string | null) => (v === null || v === '' ? '—' : Number(v).toFixed(2));

  return (
    <div className="flex min-h-full flex-col gap-4">
      <div className="flex flex-col gap-3 border-b border-[var(--a-border)] pb-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="micro text-[var(--a-text-3)]">{t('productsSubtitle')}</div>
          <h1 className="mt-1 text-[28px] font-semibold leading-none text-[var(--a-text)]">{t('productsTitle')}</h1>
          <p className="mt-2 text-[13px] text-[var(--a-text-2)]">{t('productsCount', { count: products.length })}</p>
        </div>
        <Button variant="primary" onClick={openCreate}>
          <Plus className="h-3.5 w-3.5" />
          {t('addProduct')}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-[var(--a-neg-soft)] bg-[var(--a-neg-soft)] px-4 py-3 text-[13px] text-[var(--a-neg)]">
          <div className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /><span>{error}</span></div>
        </div>
      )}

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--a-text-3)]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('searchProducts')}
          className={`${fieldInput} pl-9`}
        />
      </div>

      <div className="overflow-x-auto rounded-[10px] border border-[var(--a-border)]">
        <table className="min-w-full">
          <thead className="bg-[var(--a-surface-2)] text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--a-text-3)]">
            <tr>
              <th className="px-3.5 py-2.5 text-left">{t('productName')}</th>
              <th className="px-3.5 py-2.5 text-left">{t('productCode')}</th>
              <th className="px-3.5 py-2.5 text-right">{t('unitPrice')}</th>
              <th className="px-3.5 py-2.5 text-right">{t('purchasePrice')}</th>
              <th className="px-3.5 py-2.5 text-right">{t('vatRate')}</th>
              <th className="px-3.5 py-2.5 text-left">{t('account')}</th>
              <th className="px-3.5 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-3.5 py-8 text-center text-[13px] text-[var(--a-text-3)]"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={7} className="px-3.5 py-10 text-center text-[13px] text-[var(--a-text-3)]">
                <Package className="mx-auto mb-2 h-5 w-5" />{t('noProducts')}
              </td></tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="border-t border-[var(--a-border)] hover:bg-[var(--a-surface-2)]">
                  <td className="px-3.5 py-2.5 text-[13px] font-medium text-[var(--a-text)]">{p.name}</td>
                  <td className="px-3.5 py-2.5 text-[12.5px] text-[var(--a-text-2)]">{p.code || '—'}</td>
                  <td className="px-3.5 py-2.5 text-right font-mono text-[12.5px] tabular-nums text-[var(--a-text)]">{fmt(p.unit_price)}</td>
                  <td className="px-3.5 py-2.5 text-right font-mono text-[12.5px] tabular-nums text-[var(--a-text-2)]">{fmt(p.purchase_price)}</td>
                  <td className="px-3.5 py-2.5 text-right font-mono text-[12.5px] tabular-nums text-[var(--a-text-2)]">{fmt(p.tax_rate)}</td>
                  <td className="px-3.5 py-2.5 text-[12px] text-[var(--a-text-2)]">{p.sales_account_id ? (accountLabel.get(p.sales_account_id) || '—') : '—'}</td>
                  <td className="px-3.5 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(p)} className="flex h-7 w-7 items-center justify-center rounded text-[var(--a-text-3)] hover:bg-[var(--a-surface)] hover:text-[var(--a-text)]"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => void handleDelete(p)} className="flex h-7 w-7 items-center justify-center rounded text-[var(--a-text-3)] hover:bg-[var(--a-neg-soft)] hover:text-[var(--a-neg)]"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <ProductModal
          product={editing}
          accounts={revenueAccounts}
          onClose={() => setModalOpen(false)}
          onSaved={async () => { setModalOpen(false); await load(); }}
        />
      )}
    </div>
  );
}
