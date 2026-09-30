'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Loader2, X } from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';
import { paymentMethodsApi, type PaymentMethod } from '@/lib/api/paymentMethods.api';
import { paymentsApi } from '@/lib/api/payments.api';
import { getIsoToday } from '@/lib/utils/date';

/**
 * Registers a payment on an invoice by hand — a receipt on a sales invoice or a
 * payment on a purchase invoice — with the payment method that decides where the
 * money is posted (cash desk, card clearing, web shop…). Without a method it goes
 * to the default bank account, like before.
 */
export function RegisterPaymentDialog({
  invoice,
  direction,
  onClose,
  onRegistered,
}: {
  invoice: { id: string; invoice_number?: string | null; currency?: string | null; open_amount: number };
  direction: 'incoming' | 'outgoing';
  onClose: () => void;
  onRegistered: () => void | Promise<void>;
}) {
  const t = useTranslations('paymentMethods');
  const [methods, setMethods] = useState<PaymentMethod[] | null>(null);
  const [methodId, setMethodId] = useState('');
  const [amount, setAmount] = useState(invoice.open_amount > 0 ? invoice.open_amount.toFixed(2) : '');
  const [date, setDate] = useState(getIsoToday());
  const [reference, setReference] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    paymentMethodsApi
      .list()
      .then((rows) => {
        setMethods(rows);
        // Receipts are mostly cash/card at the till; start with the first method.
        if (rows.length > 0) setMethodId(rows[0].id);
      })
      .catch((err) => {
        setMethods([]);
        setError(getErrorMessage(err));
      });
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, saving]);

  const parsedAmount = Number(amount.replace(',', '.'));
  const valid = Number.isFinite(parsedAmount) && parsedAmount > 0 && /^\d{4}-\d{2}-\d{2}$/.test(date);

  const submit = async () => {
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      await paymentsApi.registerPayment({
        invoice_id: invoice.id,
        amount: parsedAmount,
        payment_date: date,
        payment_method_id: methodId || null,
        reference: reference.trim() || null,
      });
      await onRegistered();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const title = direction === 'incoming' ? t('registerReceipt') : t('registerPayment');

  return (
    <div className="fixed inset-0 z-[60] grid items-end justify-items-center bg-black/30 sm:place-items-center sm:p-4" onPointerDown={(event) => event.target === event.currentTarget && !saving && onClose()}>
      <form
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-xl border border-[var(--a-border)] bg-[var(--a-surface)] pb-[env(safe-area-inset-bottom)] shadow-xl sm:max-h-none sm:overflow-visible sm:rounded-xl sm:pb-0"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="flex items-center justify-between border-b border-[var(--a-border)] px-4 py-3">
          <div>
            <div className="text-[15px] font-semibold text-[var(--a-text)]">{title}</div>
            {invoice.invoice_number && <div className="text-[12px] text-[var(--a-text-3)]">{invoice.invoice_number}</div>}
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="grid h-9 w-9 place-items-center rounded-md text-[var(--a-text-3)] sm:h-8 sm:w-8 hover:bg-[var(--a-surface-2)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3 px-4 py-4 text-[13px]">
          <label className="block">
            <span className="mb-1 block font-medium text-[var(--a-text-2)]">{t('method')}</span>
            <select
              value={methodId}
              onChange={(event) => setMethodId(event.target.value)}
              disabled={methods === null}
              className="h-10 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-bg)] px-3"
            >
              {(methods ?? []).map((method) => (
                <option key={method.id} value={method.id}>
                  {method.name}{method.account_code ? ` · ${method.account_code}` : ''}
                </option>
              ))}
              <option value="">{t('defaultBankAccount')}</option>
            </select>
            {methods !== null && methods.length === 0 && (
              <span className="mt-1 block text-[12px] text-[var(--a-text-3)]">
                {t('noMethodsHint')}{' '}
                <Link href="/settings?tab=company" className="text-[var(--a-accent)] underline underline-offset-2">{t('manage')}</Link>
              </span>
            )}
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block font-medium text-[var(--a-text-2)]">{t('amount')} ({invoice.currency || 'EUR'})</span>
              <input
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                inputMode="decimal"
                className="h-10 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-bg)] px-3 font-mono"
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-medium text-[var(--a-text-2)]">{t('date')}</span>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="h-10 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-bg)] px-3"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block font-medium text-[var(--a-text-2)]">{t('reference')}</span>
            <input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              maxLength={200}
              placeholder={t('referencePlaceholder')}
              className="h-10 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-bg)] px-3"
            />
          </label>

          {error && <div className="rounded-lg bg-[var(--a-neg-soft)] px-3 py-2 text-[12.5px] text-[var(--a-neg)]">{error}</div>}
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--a-border)] px-4 py-3">
          <button type="button" onClick={onClose} disabled={saving} className="h-9 rounded-lg border border-[var(--a-border)] px-4 text-[13px] font-medium text-[var(--a-text-2)] hover:bg-[var(--a-surface-2)]">
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={!valid || saving || methods === null}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--a-accent)] px-4 text-[13px] font-semibold text-[var(--a-accent-on)] disabled:opacity-50"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {t('register')}
          </button>
        </div>
      </form>
    </div>
  );
}
