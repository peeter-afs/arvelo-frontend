'use client';

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useTranslations } from 'next-intl';
import { Loader2, X } from 'lucide-react';
import { accountingApi, type AccountOption, type PartnerOption } from '@/lib/api/accounting.api';
import { cashOrdersApi, type CashOrder, type CashOrderType } from '@/lib/api/cashExpense.api';
import { getErrorMessage } from '@/lib/api/client';
import { invoicesApi, type InvoiceListItem } from '@/lib/api/invoices.api';
import { getIsoToday } from '@/lib/utils/date';

const INVOICE_TYPES: Record<CashOrderType, string[]> = {
  receipt: ['sales_invoice', 'purchase_credit_note'],
  disbursement: ['purchase_invoice', 'sales_credit_note'],
};

const openAmount = (invoice: InvoiceListItem) =>
  Number(invoice.open_amount ?? Number(invoice.total || 0) - Number(invoice.paid_amount || 0));

export type CashOrderPreset = {
  counter_account_id?: string;
  partner_id?: string;
  amount?: number;
  description?: string;
};

/**
 * New cash receipt (KSO) or disbursement (KVO) order. Either settles an open
 * invoice (the payment goes through the cash desk's payment method) or posts
 * against any other account.
 */
export function CashOrderDialog({
  paymentMethodId,
  cashAccountId,
  orderType,
  preset,
  onClose,
  onCreated,
}: {
  paymentMethodId: string;
  cashAccountId: string;
  orderType: CashOrderType;
  preset?: CashOrderPreset;
  onClose: () => void;
  onCreated: (order: CashOrder) => void | Promise<void>;
}) {
  const t = useTranslations('cash');
  const [target, setTarget] = useState<'invoice' | 'account'>(preset?.counter_account_id ? 'account' : 'invoice');
  const [date, setDate] = useState(getIsoToday());
  const [amount, setAmount] = useState(preset?.amount ? preset.amount.toFixed(2) : '');
  const [description, setDescription] = useState(preset?.description ?? '');
  const [invoiceId, setInvoiceId] = useState('');
  const [accountId, setAccountId] = useState(preset?.counter_account_id ?? '');
  const [partnerId, setPartnerId] = useState(preset?.partner_id ?? '');
  const [personName, setPersonName] = useState('');
  const [invoices, setInvoices] = useState<InvoiceListItem[] | null>(null);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [negativeWarning, setNegativeWarning] = useState<string | null>(null);

  useEffect(() => {
    Promise.all(INVOICE_TYPES[orderType].map((type) => invoicesApi.listInvoices({ type, limit: 200 })))
      .then((lists) => setInvoices(lists.flat().filter((invoice) => invoice.status !== 'draft' && invoice.status !== 'cancelled' && openAmount(invoice) > 0.005)))
      .catch(() => setInvoices([]));
    accountingApi.getAccounts().then((rows) => setAccounts(rows.filter((row) => row.id !== cashAccountId))).catch(() => {});
    accountingApi.getPartners().then(setPartners).catch(() => {});
  }, [orderType, cashAccountId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const pickedInvoice = useMemo(() => invoices?.find((invoice) => invoice.id === invoiceId) ?? null, [invoices, invoiceId]);
  const parsedAmount = Number(amount.replace(',', '.'));
  const valid =
    Number.isFinite(parsedAmount) && parsedAmount > 0 && description.trim().length > 0 &&
    (target === 'invoice' ? Boolean(invoiceId) : Boolean(accountId));

  const submit = async (allowNegative = false) => {
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      const order = await cashOrdersApi.create({
        payment_method_id: paymentMethodId,
        order_type: orderType,
        order_date: date,
        amount: parsedAmount,
        description: description.trim(),
        ...(target === 'invoice'
          ? { invoice_id: invoiceId }
          : { counter_account_id: accountId, partner_id: partnerId || null, person_name: personName.trim() || null }),
        allow_negative: allowNegative || undefined,
      });
      await onCreated(order);
      onClose();
    } catch (err) {
      const code = axios.isAxiosError(err) ? (err.response?.data as { error?: { code?: string } } | undefined)?.error?.code : undefined;
      if (code === 'CASH_NEGATIVE') setNegativeWarning(getErrorMessage(err));
      else setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const field = 'h-10 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-bg)] px-3';

  return (
    <div className="fixed inset-0 z-50 grid items-end bg-black/30 p-0 sm:place-items-center sm:p-4" onPointerDown={(event) => event.target === event.currentTarget && !saving && onClose()}>
      <form
        className="flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-xl border border-[var(--a-border)] bg-[var(--a-surface)] shadow-xl sm:max-h-[90dvh] sm:rounded-xl"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--a-border)] px-4 py-3">
          <div className="text-[15px] font-semibold text-[var(--a-text)]">{orderType === 'receipt' ? t('newReceipt') : t('newDisbursement')}</div>
          <button type="button" onClick={onClose} disabled={saving} aria-label={t('cancel')} className="grid h-9 w-9 place-items-center sm:h-8 sm:w-8 rounded-md text-[var(--a-text-3)] hover:bg-[var(--a-surface-2)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 text-[13px]">
          <div className="flex gap-1 rounded-lg bg-[var(--a-surface-2)] p-1">
            {(['invoice', 'account'] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTarget(key)}
                className={`flex-1 rounded-md px-3 py-1.5 text-[12.5px] font-medium ${target === key ? 'bg-[var(--a-surface)] text-[var(--a-text)] shadow-sm' : 'text-[var(--a-text-3)]'}`}
              >
                {key === 'invoice' ? (orderType === 'receipt' ? t('targetSalesInvoice') : t('targetPurchaseInvoice')) : t('targetAccount')}
              </button>
            ))}
          </div>

          {target === 'invoice' ? (
            <label className="block">
              <span className="mb-1 block font-medium text-[var(--a-text-2)]">{t('invoice')}</span>
              <select
                value={invoiceId}
                disabled={invoices === null}
                onChange={(event) => {
                  const invoice = invoices?.find((row) => row.id === event.target.value);
                  setInvoiceId(event.target.value);
                  if (invoice) {
                    setAmount(openAmount(invoice).toFixed(2));
                    if (!description.trim()) setDescription(`${t('invoice')} ${invoice.invoice_number ?? ''} ${invoice.partner_name ?? ''}`.trim());
                  }
                }}
                className={field}
              >
                <option value="">{invoices === null ? t('loading') : invoices.length ? t('selectInvoice') : t('noOpenInvoices')}</option>
                {(invoices ?? []).map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.invoice_number ?? '—'} · {invoice.partner_name ?? '—'} · {openAmount(invoice).toFixed(2)} €
                  </option>
                ))}
              </select>
              {pickedInvoice && <span className="mt-1 block text-[12px] text-[var(--a-text-3)]">{t('invoiceOpen', { amount: openAmount(pickedInvoice).toFixed(2) })}</span>}
            </label>
          ) : (
            <>
              <label className="block">
                <span className="mb-1 block font-medium text-[var(--a-text-2)]">{t('counterAccount')}</span>
                <select value={accountId} onChange={(event) => setAccountId(event.target.value)} className={field}>
                  <option value="">{t('selectAccount')}</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>{account.code} · {account.name}</option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block font-medium text-[var(--a-text-2)]">{t('partner')}</span>
                  <select value={partnerId} onChange={(event) => setPartnerId(event.target.value)} className={field}>
                    <option value="">—</option>
                    {partners.map((partner) => (
                      <option key={partner.id} value={partner.id}>{partner.name}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block font-medium text-[var(--a-text-2)]">{orderType === 'receipt' ? t('payer') : t('recipient')}</span>
                  <input value={personName} onChange={(event) => setPersonName(event.target.value)} maxLength={200} className={field} />
                </label>
              </div>
            </>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="block min-w-0">
              <span className="mb-1 block font-medium text-[var(--a-text-2)]">{t('amount')}</span>
              <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" className={`${field} font-mono`} />
            </label>
            <label className="block min-w-0">
              <span className="mb-1 block font-medium text-[var(--a-text-2)]">{t('date')}</span>
              <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={field} />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block font-medium text-[var(--a-text-2)]">{t('description')}</span>
            <input value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} placeholder={t('descriptionPlaceholder')} className={field} />
          </label>

          {negativeWarning && (
            <div className="rounded-lg bg-[var(--a-warn-soft)] px-3 py-2 text-[12.5px] text-[var(--a-warn)]">
              {negativeWarning}
              <button type="button" onClick={() => void submit(true)} disabled={saving} className="ml-2 font-semibold underline">
                {t('saveAnyway')}
              </button>
            </div>
          )}
          {error && <div className="rounded-lg bg-[var(--a-neg-soft)] px-3 py-2 text-[12.5px] text-[var(--a-neg)]">{error}</div>}
        </div>

        <div className="flex flex-shrink-0 justify-end gap-2 border-t border-[var(--a-border)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3">
          <button type="button" onClick={onClose} disabled={saving} className="h-9 rounded-lg border border-[var(--a-border)] px-4 text-[13px] font-medium text-[var(--a-text-2)] hover:bg-[var(--a-surface-2)]">
            {t('cancel')}
          </button>
          <button type="submit" disabled={!valid || saving} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--a-accent)] px-4 text-[13px] font-semibold text-[var(--a-accent-on)] disabled:opacity-50">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {t('post')}
          </button>
        </div>
      </form>
    </div>
  );
}
