'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Ban, Printer } from 'lucide-react';
import { accountingApi } from '@/lib/api/accounting.api';
import { cashOrdersApi, type CashOrder } from '@/lib/api/cashExpense.api';
import { getErrorMessage } from '@/lib/api/client';
import { invoicesApi } from '@/lib/api/invoices.api';
import { useAuthStore } from '@/lib/stores/auth.store';
import { showToast } from '@/components/ui/Toast';

const money = (value: number) => value.toLocaleString('et-EE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateText = (value: string) => value.split('-').reverse().join('.');

type Details = { order: CashOrder; partnerName: string | null; basis: string };

/** One cash order on a page, for printing and signing. */
export default function CashOrderPrintPage() {
  const t = useTranslations('cash');
  const { id } = useParams<{ id: string }>();
  const tenant = useAuthStore((state) => state.tenant);
  const [details, setDetails] = useState<Details | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voiding, setVoiding] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      const order = await cashOrdersApi.get(id);
      const [partners, accounts, invoice] = await Promise.all([
        accountingApi.getPartners(),
        accountingApi.getAccounts(),
        order.invoice_id ? invoicesApi.getInvoice(order.invoice_id).catch(() => null) : Promise.resolve(null),
      ]);
      const partnerName = partners.find((p) => p.id === order.partner_id)?.name ?? null;
      const account = accounts.find((a) => a.id === order.counter_account_id);
      const basis = invoice
        ? `${t('invoice')} ${invoice.invoice.invoice_number ?? ''}`
        : account
          ? `${account.code} ${account.name}`
          : '—';
      if (live) setDetails({ order, partnerName, basis });
    })().catch((err) => live && setError(getErrorMessage(err)));
    return () => {
      live = false;
    };
  }, [id, t]);

  if (error) return <div className="py-10 text-center text-[13px] text-[var(--a-neg)]">{error}</div>;
  if (!details) return <div className="py-10 text-center text-[13px] text-[var(--a-text-3)]">{t('loading')}</div>;

  const { order, partnerName, basis } = details;
  const voidOrder = async () => {
    const reason = window.prompt(t('voidPrompt', { number: order.order_number }));
    if (reason === null) return;
    setVoiding(true);
    try {
      const updated = await cashOrdersApi.void(order.id, reason || undefined);
      setDetails({ ...details, order: updated });
      showToast.success(t('voided', { number: order.order_number }));
    } catch (err) {
      showToast.error(getErrorMessage(err));
    } finally {
      setVoiding(false);
    }
  };
  const isReceipt = order.order_type === 'receipt';
  const counterparty = [partnerName, order.person_name].filter(Boolean).join(' · ') || '—';

  return (
    <div className="mx-auto w-full max-w-3xl py-4">
      <div className="mb-4 flex justify-between print:hidden">
        <Link href="/accounting/cash" className="text-[13px] text-[var(--a-accent)] hover:underline">← {t('title')}</Link>
        <div className="flex gap-2">
          {order.status === 'posted' && (
            <button type="button" onClick={() => void voidOrder()} disabled={voiding} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[var(--a-border)] px-3 text-[13px] font-semibold text-[var(--a-neg)] disabled:opacity-60">
              <Ban className="h-3.5 w-3.5" />
              {t('void')}
            </button>
          )}
          <button type="button" onClick={() => window.print()} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[var(--a-accent)] px-3 text-[13px] font-semibold text-[var(--a-accent-on)]">
            <Printer className="h-3.5 w-3.5" />
            {t('print')}
          </button>
        </div>
      </div>

      <div className="rounded-[12px] border border-[var(--a-border)] bg-[var(--a-surface)] p-4 sm:p-8 print:border-0 print:p-0">
        <div className="flex flex-col-reverse items-start justify-between gap-3 border-b border-[var(--a-border)] pb-4 sm:flex-row sm:gap-6 print:flex-row print:gap-6">
          <div className="text-[12.5px] leading-5 text-[var(--a-text-2)]">
            <div className="font-semibold text-[var(--a-text)]">{tenant?.name}</div>
            {tenant?.registry_code && <div>{t('regCode')}: {tenant.registry_code}</div>}
            {tenant?.address && <div>{tenant.address}</div>}
          </div>
          <div className="sm:text-right print:text-right">
            <div className="text-[18px] font-semibold text-[var(--a-text)]">{isReceipt ? t('receiptOrderTitle') : t('disbursementOrderTitle')}</div>
            <div className="font-mono text-[14px] text-[var(--a-text)]">{order.order_number}</div>
            {order.status === 'void' && <div className="mt-1 text-[13px] font-semibold uppercase text-[var(--a-neg)]">{t('voidStamp')}</div>}
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-y-0.5 text-[13.5px] sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-y-2.5 print:grid-cols-[180px_minmax(0,1fr)] print:gap-y-2.5 [&>dd]:break-words max-sm:[&>dd]:mb-2 print:[&>dd]:mb-0">
          <dt className="text-[var(--a-text-3)]">{t('date')}</dt>
          <dd className="text-[var(--a-text)]">{dateText(order.order_date)}</dd>
          <dt className="text-[var(--a-text-3)]">{isReceipt ? t('receivedFrom') : t('paidTo')}</dt>
          <dd className="text-[var(--a-text)]">{counterparty}</dd>
          <dt className="text-[var(--a-text-3)]">{t('description')}</dt>
          <dd className="text-[var(--a-text)]">{order.description}</dd>
          <dt className="text-[var(--a-text-3)]">{t('basis')}</dt>
          <dd className="text-[var(--a-text)]">{basis}</dd>
          <dt className="text-[var(--a-text-3)]">{t('amount')}</dt>
          <dd className="font-mono text-[18px] font-semibold text-[var(--a-text)]">{money(order.amount)} {order.currency}</dd>
        </dl>

        <div className="mt-14 grid grid-cols-2 gap-4 text-[12.5px] sm:gap-10 print:gap-10 text-[var(--a-text-2)]">
          <div className="border-t border-[var(--a-text-3)] pt-1">{t('cashierSignature')}</div>
          <div className="border-t border-[var(--a-text-3)] pt-1">{isReceipt ? t('payerSignature') : t('recipientSignature')}</div>
        </div>
      </div>
    </div>
  );
}
