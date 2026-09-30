'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Printer, Wallet } from 'lucide-react';
import { cashOrdersApi, type CashBook, type CashOrderType } from '@/lib/api/cashExpense.api';
import { getErrorMessage } from '@/lib/api/client';
import { paymentMethodsApi, type PaymentMethod } from '@/lib/api/paymentMethods.api';
import { getIsoToday } from '@/lib/utils/date';
import { CashOrderDialog } from '@/components/accounting/cash/CashOrderDialog';
import { AskAssistantButton } from '@/components/assistant/AskAssistantButton';
import { HelpLink } from '@/components/guides/HelpLink';
import { showToast } from '@/components/ui/Toast';

const money = (value: number) => value.toLocaleString('et-EE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateText = (value: string) => value.split('-').reverse().join('.');

export default function CashDeskPage() {
  const t = useTranslations('cash');
  const today = getIsoToday();
  const [desks, setDesks] = useState<PaymentMethod[] | null>(null);
  const [deskId, setDeskId] = useState('');
  const [dateFrom, setDateFrom] = useState(`${today.slice(0, 8)}01`);
  const [dateTo, setDateTo] = useState(today);
  const [book, setBook] = useState<{ key: string; data?: CashBook; error?: string } | null>(null);
  const [dialog, setDialog] = useState<CashOrderType | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    paymentMethodsApi
      .list()
      .then((rows) => {
        const cash = rows.filter((row) => row.kind === 'cash');
        setDesks(cash);
        if (cash[0]) setDeskId((current) => current || cash[0].id);
      })
      .catch(() => setDesks([]));
  }, []);

  const key = deskId ? `${deskId}|${dateFrom}|${dateTo}|${reloadTick}` : '';
  useEffect(() => {
    if (!key) return;
    let live = true;
    cashOrdersApi
      .cashBook({ payment_method_id: deskId, date_from: dateFrom, date_to: dateTo })
      .then((data) => live && setBook({ key, data }))
      .catch((err) => live && setBook({ key, error: getErrorMessage(err) }));
    return () => {
      live = false;
    };
  }, [key, deskId, dateFrom, dateTo]);

  const current = book?.key === key ? book : null;
  const data = current?.data ?? null;
  const desk = desks?.find((row) => row.id === deskId) ?? null;
  const reload = useCallback(() => setReloadTick((tick) => tick + 1), []);

  const voidOrder = async (orderId: string, orderNumber: string) => {
    const reason = window.prompt(t('voidPrompt', { number: orderNumber }));
    if (reason === null) return;
    try {
      await cashOrdersApi.void(orderId, reason || undefined);
      showToast.success(t('voided', { number: orderNumber }));
      reload();
    } catch (err) {
      showToast.error(getErrorMessage(err));
    }
  };

  if (desks !== null && desks.length === 0) {
    return (
      <div className="mx-auto max-w-2xl py-10 text-center">
        <Wallet className="mx-auto h-8 w-8 text-[var(--a-text-3)]" />
        <h1 className="mt-3 text-[18px] font-semibold text-[var(--a-text)]">{t('title')}</h1>
        <p className="mt-2 text-[13.5px] leading-6 text-[var(--a-text-2)]">{t('noDesks')}</p>
        <div className="mt-4 flex justify-center gap-2">
          <Link href="/settings?tab=company" className="inline-flex h-9 items-center rounded-md bg-[var(--a-accent)] px-4 text-[13px] font-semibold text-[var(--a-accent-on)]">
            {t('addDesk')}
          </Link>
          <AskAssistantButton prompt={t('assistantSetupPrompt')} label={t('assistantSetup')} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl py-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-[20px] font-semibold text-[var(--a-text)]">{t('title')}</h1>
          <p className="mt-1 text-[13px] text-[var(--a-text-2)]">{t('subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <HelpLink slug="kassa-ja-kuluaruanded" />
          <button type="button" onClick={() => window.print()} disabled={!data} aria-label={t('printBook')} title={t('printBook')} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[var(--a-border)] bg-[var(--a-surface)] px-3 text-[13px] text-[var(--a-text-2)] disabled:opacity-50">
            <Printer className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('printBook')}</span>
          </button>
          <button type="button" onClick={() => setDialog('disbursement')} disabled={!desk} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[var(--a-border)] bg-[var(--a-surface)] px-3 text-[13px] font-medium text-[var(--a-text)] disabled:opacity-50">
            <ArrowUpRight className="h-3.5 w-3.5" />
            {t('newDisbursement')}
          </button>
          <button type="button" onClick={() => setDialog('receipt')} disabled={!desk} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[var(--a-accent)] px-3 text-[13px] font-semibold text-[var(--a-accent-on)] disabled:opacity-50">
            <ArrowDownLeft className="h-3.5 w-3.5" />
            {t('newReceipt')}
          </button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 rounded-[12px] border border-[var(--a-border)] bg-[var(--a-surface)] p-3 sm:grid-cols-3 sm:p-4 print:hidden">
        <label className="col-span-2 block text-[12.5px] sm:col-span-1">
          <span className="mb-1 block font-medium text-[var(--a-text-2)]">{t('desk')}</span>
          <select value={deskId} onChange={(event) => setDeskId(event.target.value)} className="h-9 w-full rounded-md border border-[var(--a-border)] bg-[var(--a-bg)] px-2">
            {(desks ?? []).map((row) => (
              <option key={row.id} value={row.id}>{row.name}{row.account_code ? ` · ${row.account_code}` : ''}</option>
            ))}
          </select>
        </label>
        <label className="block min-w-0 text-[12.5px]">
          <span className="mb-1 block font-medium text-[var(--a-text-2)]">{t('dateFrom')}</span>
          <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="h-9 w-full rounded-md border border-[var(--a-border)] bg-[var(--a-bg)] px-2" />
        </label>
        <label className="block min-w-0 text-[12.5px]">
          <span className="mb-1 block font-medium text-[var(--a-text-2)]">{t('dateTo')}</span>
          <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="h-9 w-full rounded-md border border-[var(--a-border)] bg-[var(--a-bg)] px-2" />
        </label>
      </div>

      {current?.error && <div className="mb-4 rounded-lg bg-[var(--a-neg-soft)] px-3 py-2 text-[13px] text-[var(--a-neg)]">{current.error}</div>}

      {!data ? (
        <div className="py-10 text-center text-[13px] text-[var(--a-text-3)]">{t('loading')}</div>
      ) : (
        <div className="rounded-[12px] border border-[var(--a-border)] bg-[var(--a-surface)] p-3 sm:p-5 print:border-0 print:p-0">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-[17px] font-semibold text-[var(--a-text)]">{t('cashBook')}: {data.cash_desk.name}</div>
              <div className="text-[12.5px] text-[var(--a-text-2)]">
                {data.account.code} {data.account.name} · {dateText(data.date_from)} – {dateText(data.date_to)}
              </div>
            </div>
            <div className="grid w-full grid-cols-2 gap-x-4 gap-y-2 text-[12px] sm:w-auto sm:grid-cols-4 sm:gap-4 sm:text-right">
              {[
                [t('opening'), data.opening_balance],
                [t('receipts'), data.total_receipts],
                [t('disbursements'), data.total_disbursements],
                [t('closing'), data.closing_balance],
              ].map(([label, value]) => (
                <div key={label as string}>
                  <div className="text-[var(--a-text-3)]">{label}</div>
                  <div className="font-mono text-[14px] font-semibold tabular-nums text-[var(--a-text)]">{money(value as number)}</div>
                </div>
              ))}
            </div>
          </div>

          {data.went_negative && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-[var(--a-warn-soft)] px-3 py-2 text-[12.5px] text-[var(--a-warn)]">
              <AlertTriangle className="h-4 w-4" />
              {t('wentNegative')}
            </div>
          )}

          <div className="overflow-x-auto print:overflow-visible">
          <table className="w-full min-w-[720px] border-collapse text-[12.5px] print:min-w-0">
            <thead>
              <tr className="border-b border-[var(--a-border)] text-left text-[11px] uppercase tracking-wide text-[var(--a-text-3)]">
                <th className="px-2 py-1.5">{t('date')}</th>
                <th className="px-2 py-1.5">{t('orderNo')}</th>
                <th className="px-2 py-1.5">{t('description')}</th>
                <th className="px-2 py-1.5">{t('partner')}</th>
                <th className="px-2 py-1.5 text-right">{t('receipt')}</th>
                <th className="px-2 py-1.5 text-right">{t('disbursement')}</th>
                <th className="px-2 py-1.5 text-right">{t('balance')}</th>
                <th className="px-2 py-1.5 print:hidden" />
              </tr>
            </thead>
            <tbody className="tabular-nums">
              <tr className="border-b border-[var(--a-border)] bg-[var(--a-surface-2)] print:bg-transparent">
                <td className="px-2 py-1.5" colSpan={6}>{t('opening')}</td>
                <td className="px-2 py-1.5 text-right font-mono font-semibold">{money(data.opening_balance)}</td>
                <td className="print:hidden" />
              </tr>
              {data.lines.map((line) => (
                <tr key={line.journal_entry_id} className={`border-b border-[var(--a-border)] ${line.order_status === 'void' ? 'text-[var(--a-text-3)] line-through' : ''}`}>
                  <td className="px-2 py-1.5 font-mono">{dateText(line.date)}</td>
                  <td className="px-2 py-1.5 font-mono">
                    {line.order_id ? (
                      <Link href={`/accounting/cash/orders/${line.order_id}`} className="text-[var(--a-accent)] hover:underline print:text-inherit">{line.order_number}</Link>
                    ) : '—'}
                  </td>
                  <td className="px-2 py-1.5">{line.description}</td>
                  <td className="px-2 py-1.5">{line.partner ?? ''}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{line.receipt ? money(line.receipt) : ''}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{line.disbursement ? money(line.disbursement) : ''}</td>
                  <td className={`px-2 py-1.5 text-right font-mono ${line.balance < 0 ? 'text-[var(--a-neg)]' : ''}`}>{money(line.balance)}</td>
                  <td className="px-2 py-1.5 text-right print:hidden">
                    {line.order_id && line.order_status === 'posted' && (
                      <button type="button" onClick={() => void voidOrder(line.order_id!, line.order_number!)} className="text-[12px] text-[var(--a-text-3)] hover:text-[var(--a-neg)] max-lg:py-2">
                        {t('void')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {data.lines.length === 0 && (
                <tr><td colSpan={8} className="px-2 py-6 text-center text-[var(--a-text-3)]">{t('noMovements')}</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {dialog && desk && (
        <CashOrderDialog
          paymentMethodId={desk.id}
          cashAccountId={desk.account_id}
          orderType={dialog}
          onClose={() => setDialog(null)}
          onCreated={(order) => {
            showToast.success(t('created', { number: order.order_number }));
            reload();
          }}
        />
      )}
    </div>
  );
}
