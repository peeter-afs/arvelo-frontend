'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Download, FileText, Printer } from 'lucide-react';
import { accountingApi, type PartnerOption } from '@/lib/api/accounting.api';
import { reportsApi, type PartnerStatement, type PartnerStatementSide } from '@/lib/api/reports.api';
import { getErrorMessage } from '@/lib/api/client';
import { downloadCsv } from '@/lib/utils/csvExport';
import { getIsoToday } from '@/lib/utils/date';
import { EmptyState } from '@/components/ui/EmptyState';

const money = (value: number) =>
  value.toLocaleString('et-EE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const dateText = (value: string | null | undefined) => {
  if (!value) return '—';
  const [y, m, d] = value.split('-');
  return `${d}.${m}.${y}`;
};

type Mode = 'card' | 'confirmation';

export default function PartnerStatementPage() {
  return (
    <Suspense fallback={null}>
      <PartnerStatementView />
    </Suspense>
  );
}

function PartnerStatementView() {
  const t = useTranslations('partnerStatement');
  const router = useRouter();
  const searchParams = useSearchParams();
  const partnerId = searchParams.get('partner_id') || '';
  const today = getIsoToday();
  const dateFrom = searchParams.get('date_from') ?? `${today.slice(0, 4)}-01-01`;
  const dateTo = searchParams.get('date_to') ?? today;
  const mode: Mode = searchParams.get('mode') === 'confirmation' ? 'confirmation' : 'card';

  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [query, setQuery] = useState('');
  // Results are keyed by the request that produced them, so "loading" is simply
  // "the latest result belongs to another request" — no state flips in effects.
  const requestKey = partnerId ? `${partnerId}|${mode}|${mode === 'card' ? dateFrom : ''}|${dateTo}` : '';
  const [result, setResult] = useState<{ key: string; data?: PartnerStatement; error?: string } | null>(null);
  const [partnersError, setPartnersError] = useState<string | null>(null);
  const data = result?.key === requestKey ? result.data ?? null : null;
  const loading = Boolean(requestKey) && result?.key !== requestKey;
  const error = partnersError ?? (result?.key === requestKey ? result.error ?? null : null);

  const setParam = useCallback(
    (changes: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === '') params.delete(key);
        else params.set(key, value);
      }
      router.replace(`/reports/partner-statement?${params.toString()}`);
    },
    [router, searchParams]
  );

  useEffect(() => {
    accountingApi.getPartners().then(setPartners).catch((err) => setPartnersError(getErrorMessage(err)));
  }, []);

  useEffect(() => {
    if (!requestKey) return;
    let live = true;
    reportsApi
      .getPartnerStatement({ partner_id: partnerId, date_from: mode === 'card' ? dateFrom : undefined, date_to: dateTo })
      .then((statement) => live && setResult({ key: requestKey, data: statement }))
      .catch((err) => live && setResult({ key: requestKey, error: getErrorMessage(err) }));
    return () => {
      live = false;
    };
  }, [requestKey, partnerId, dateFrom, dateTo, mode]);

  const filteredPartners = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('et');
    const list = needle
      ? partners.filter((p) => `${p.name} ${p.reg_code ?? ''}`.toLocaleLowerCase('et').includes(needle))
      : partners;
    return list.slice(0, 200);
  }, [partners, query]);

  const selectedPartner = partners.find((p) => p.id === partnerId);

  const exportCsv = () => {
    if (!data) return;
    const rows = data.sides.flatMap((side) =>
      side.entries.map((entry) => ({
        [t('side')]: t(`sideLabel.${side.side}`),
        [t('date')]: entry.date,
        [t('document')]: entry.document_number ?? '',
        [t('description')]: entry.description,
        [t('debit')]: entry.debit || '',
        [t('credit')]: entry.credit || '',
        [t('balance')]: entry.balance,
      }))
    );
    downloadCsv(rows, `kontokaart_${data.partner.name}_${data.date_to}.csv`);
  };

  return (
    <div className="mx-auto w-full max-w-5xl py-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-[20px] font-semibold text-[var(--a-text)]">{t('title')}</h1>
          <p className="mt-1 text-[13px] text-[var(--a-text-2)]">{t('subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={exportCsv}
            disabled={!data}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[var(--a-border)] bg-[var(--a-surface)] px-3 text-[13px] text-[var(--a-text-2)] hover:bg-[var(--a-surface-2)] disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!data}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[var(--a-accent)] px-3 text-[13px] font-semibold text-[var(--a-accent-on)] disabled:opacity-50"
          >
            <Printer className="h-3.5 w-3.5" />
            {t('print')}
          </button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 rounded-[12px] border border-[var(--a-border)] bg-[var(--a-surface)] p-4 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))] print:hidden">
        <label className="col-span-2 block text-[12.5px] md:col-span-1">
          <span className="mb-1 block font-medium text-[var(--a-text-2)]">{t('partner')}</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={selectedPartner ? selectedPartner.name : t('searchPartner')}
            className="mb-1.5 h-9 w-full rounded-md border border-[var(--a-border)] bg-[var(--a-bg)] px-2.5"
          />
          <select
            value={partnerId}
            onChange={(event) => {
              setQuery('');
              setParam({ partner_id: event.target.value });
            }}
            className="h-9 w-full rounded-md border border-[var(--a-border)] bg-[var(--a-bg)] px-2"
          >
            <option value="">{t('selectPartner')}</option>
            {filteredPartners.map((partner) => (
              <option key={partner.id} value={partner.id}>
                {partner.name}{partner.reg_code ? ` (${partner.reg_code})` : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-2 block text-[12.5px] md:col-span-1">
          <span className="mb-1 block font-medium text-[var(--a-text-2)]">{t('view')}</span>
          <select
            value={mode}
            onChange={(event) => setParam({ mode: event.target.value === 'confirmation' ? 'confirmation' : null })}
            className="h-9 w-full rounded-md border border-[var(--a-border)] bg-[var(--a-bg)] px-2"
          >
            <option value="card">{t('modeCard')}</option>
            <option value="confirmation">{t('modeConfirmation')}</option>
          </select>
        </label>
        <label className={`block min-w-0 text-[12.5px] ${mode === 'confirmation' ? 'opacity-40' : ''}`}>
          <span className="mb-1 block font-medium text-[var(--a-text-2)]">{t('dateFrom')}</span>
          <input
            type="date"
            value={dateFrom}
            disabled={mode === 'confirmation'}
            onChange={(event) => setParam({ date_from: event.target.value })}
            className="h-9 w-full rounded-md border border-[var(--a-border)] bg-[var(--a-bg)] px-2"
          />
        </label>
        <label className="block min-w-0 text-[12.5px]">
          <span className="mb-1 block font-medium text-[var(--a-text-2)]">{mode === 'confirmation' ? t('asOf') : t('dateTo')}</span>
          <input
            type="date"
            value={dateTo}
            onChange={(event) => setParam({ date_to: event.target.value })}
            className="h-9 w-full rounded-md border border-[var(--a-border)] bg-[var(--a-bg)] px-2"
          />
        </label>
      </div>

      {error && <div className="mb-4 rounded-lg bg-[var(--a-neg-soft)] px-3 py-2 text-[13px] text-[var(--a-neg)]">{error}</div>}

      {!partnerId ? (
        <EmptyState icon={FileText} title={t('title')} message={t('pickPartnerFirst')} />
      ) : loading || (!data && !error) ? (
        <div className="py-10 text-center text-[13px] text-[var(--a-text-3)]">{t('loading')}</div>
      ) : !data ? null : mode === 'confirmation' ? (
        <BalanceConfirmation data={data} />
      ) : (
        <AccountCard data={data} />
      )}
    </div>
  );
}

function Header({ data, title }: { data: PartnerStatement; title: string }) {
  const t = useTranslations('partnerStatement');
  return (
    <div className="mb-5 grid gap-4 border-b border-[var(--a-border)] pb-4 sm:grid-cols-2">
      <div className="min-w-0 break-words">
        <div className="text-[18px] font-semibold text-[var(--a-text)]">{title}</div>
        <div className="mt-1 text-[12.5px] text-[var(--a-text-2)]">
          {data.date_from ? `${dateText(data.date_from)} – ${dateText(data.date_to)}` : t('asOfDate', { date: dateText(data.date_to) })}
        </div>
        {data.company && (
          <div className="mt-3 text-[12.5px] leading-5 text-[var(--a-text-2)]">
            <div className="font-semibold text-[var(--a-text)]">{data.company.name}</div>
            {data.company.registry_code && <div>{t('regCode')}: {data.company.registry_code}</div>}
            {data.company.vat_number && <div>{t('vatNumber')}: {data.company.vat_number}</div>}
            {data.company.address && <div>{data.company.address}</div>}
          </div>
        )}
      </div>
      <div className="min-w-0 break-words text-[12.5px] leading-5 text-[var(--a-text-2)] sm:text-right">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--a-text-3)]">{t('partner')}</div>
        <div className="font-semibold text-[var(--a-text)]">{data.partner.name}</div>
        {data.partner.reg_code && <div>{t('regCode')}: {data.partner.reg_code}</div>}
        {data.partner.vat_number && <div>{t('vatNumber')}: {data.partner.vat_number}</div>}
        {data.partner.address && <div>{data.partner.address}</div>}
      </div>
    </div>
  );
}

function AccountCard({ data }: { data: PartnerStatement }) {
  const t = useTranslations('partnerStatement');
  return (
    <div className="rounded-[12px] border border-[var(--a-border)] bg-[var(--a-surface)] p-4 sm:p-5 print:border-0 print:p-0">
      <Header data={data} title={t('cardTitle')} />
      {data.sides.length === 0 && <p className="text-[13px] text-[var(--a-text-3)]">{t('noMovements')}</p>}
      {data.sides.map((side) => (
        <SideTable key={side.side} side={side} currency={data.currency} />
      ))}
    </div>
  );
}

function SideTable({ side, currency }: { side: PartnerStatementSide; currency: string }) {
  const t = useTranslations('partnerStatement');
  const cell = 'px-2 py-1.5';
  return (
    <section className="mb-6 break-inside-avoid">
      <h2 className="mb-2 text-[14px] font-semibold text-[var(--a-text)]">{t(`sideLabel.${side.side}`)}</h2>
      <div className="max-w-full overflow-x-auto print:overflow-visible">
      <table className="w-full min-w-[620px] border-collapse text-[12.5px] md:min-w-0 print:min-w-0">
        <thead>
          <tr className="border-b border-[var(--a-border)] text-left text-[11px] uppercase tracking-wide text-[var(--a-text-3)]">
            <th className={`${cell} max-md:sticky max-md:left-0 max-md:z-[1] max-md:bg-[var(--a-surface)] print:static print:bg-transparent`}>{t('date')}</th>
            <th className={cell}>{t('document')}</th>
            <th className={cell}>{t('description')}</th>
            <th className={`${cell} text-right`}>{t('debit')}</th>
            <th className={`${cell} text-right`}>{t('credit')}</th>
            <th className={`${cell} text-right`}>{t('balance')}</th>
          </tr>
        </thead>
        <tbody className="font-mono tabular-nums">
          <tr className="border-b border-[var(--a-border)] bg-[var(--a-surface-2)] print:bg-transparent">
            <td className={`${cell} max-md:sticky max-md:left-0 max-md:z-[1] max-md:bg-[var(--a-surface-2)] print:static print:bg-transparent`} colSpan={5}><span className="font-sans">{t('openingBalance')}</span></td>
            <td className={`${cell} text-right font-semibold`}>{money(side.opening_balance)}</td>
          </tr>
          {side.entries.map((entry, index) => (
            <tr key={`${entry.invoice_id}-${entry.payment_id ?? 'doc'}-${index}`} className="border-b border-[var(--a-border)]">
              <td className={`${cell} whitespace-nowrap max-md:sticky max-md:left-0 max-md:z-[1] max-md:bg-[var(--a-surface)] print:static print:bg-transparent`}>{dateText(entry.date)}</td>
              <td className={cell}>
                <Link href={`/invoices/${entry.invoice_id}/edit`} className="text-[var(--a-accent)] hover:underline print:text-inherit">
                  {entry.document_number ?? '—'}
                </Link>
              </td>
              <td className={`${cell} font-sans`}>{entry.description}{entry.due_date && entry.kind === 'invoice' ? ` · ${t('due')} ${dateText(entry.due_date)}` : ''}</td>
              <td className={`${cell} text-right`}>{entry.debit ? money(entry.debit) : ''}</td>
              <td className={`${cell} text-right`}>{entry.credit ? money(entry.credit) : ''}</td>
              <td className={`${cell} text-right`}>{money(entry.balance)}</td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className={`${cell} max-md:sticky max-md:left-0 max-md:z-[1] max-md:bg-[var(--a-surface)] print:static print:bg-transparent`} colSpan={3}><span className="font-sans">{t('closingBalance')} ({currency})</span></td>
            <td className={`${cell} text-right`}>{money(side.total_debit)}</td>
            <td className={`${cell} text-right`}>{money(side.total_credit)}</td>
            <td className={`${cell} text-right`}>{money(side.closing_balance)}</td>
          </tr>
        </tbody>
      </table>
      </div>
      {side.unexplained_difference !== null && Math.abs(side.unexplained_difference) > 0.005 && (
        <p className="mt-2 text-[12px] text-[var(--a-warn)] print:hidden">
          {t('unexplainedDifference', { amount: money(side.unexplained_difference) })}
        </p>
      )}
    </section>
  );
}

function BalanceConfirmation({ data }: { data: PartnerStatement }) {
  const t = useTranslations('partnerStatement');
  const cell = 'px-2 py-1.5';
  return (
    <div className="rounded-[12px] border border-[var(--a-border)] bg-[var(--a-surface)] p-4 sm:p-6 print:border-0 print:p-0">
      <Header data={data} title={t('confirmationTitle')} />
      {data.sides.length === 0 && <p className="text-[13px] text-[var(--a-text-2)]">{t('noBalance', { date: dateText(data.date_to) })}</p>}
      {data.sides.map((side) => {
        const total = side.open_documents.reduce((sum, doc) => sum + doc.open_amount, 0);
        return (
          <section key={side.side} className="mb-6 break-inside-avoid">
            <p className="mb-3 text-[13.5px] leading-6 text-[var(--a-text)]">
              {t(side.side === 'receivable' ? 'confirmationReceivable' : 'confirmationPayable', {
                date: dateText(data.date_to),
                amount: money(total),
                currency: data.currency,
              })}
            </p>
            <div className="max-w-full overflow-x-auto print:overflow-visible">
            <table className="w-full min-w-[520px] border-collapse text-[12.5px] md:min-w-0 print:min-w-0">
              <thead>
                <tr className="border-b border-[var(--a-border)] text-left text-[11px] uppercase tracking-wide text-[var(--a-text-3)]">
                  <th className={`${cell} max-md:sticky max-md:left-0 max-md:z-[1] max-md:bg-[var(--a-surface)] print:static print:bg-transparent`}>{t('document')}</th>
                  <th className={cell}>{t('date')}</th>
                  <th className={cell}>{t('dueDate')}</th>
                  <th className={`${cell} text-right`}>{t('amount')}</th>
                  <th className={`${cell} text-right`}>{t('openAmount')}</th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums">
                {side.open_documents.map((doc) => (
                  <tr key={doc.invoice_id} className="border-b border-[var(--a-border)]">
                    <td className={`${cell} max-md:sticky max-md:left-0 max-md:z-[1] max-md:bg-[var(--a-surface)] print:static print:bg-transparent`}>{doc.document_number ?? '—'}{doc.kind === 'credit_note' ? ` (${t('creditNote')})` : ''}</td>
                    <td className={cell}>{dateText(doc.date)}</td>
                    <td className={cell}>{dateText(doc.due_date)}</td>
                    <td className={`${cell} text-right`}>{money(doc.amount)}</td>
                    <td className={`${cell} text-right`}>{money(doc.open_amount)}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className={`${cell} max-md:sticky max-md:left-0 max-md:z-[1] max-md:bg-[var(--a-surface)] print:static print:bg-transparent`} colSpan={4}><span className="font-sans">{t('total')} ({data.currency})</span></td>
                  <td className={`${cell} text-right`}>{money(total)}</td>
                </tr>
              </tbody>
            </table>
            </div>
          </section>
        );
      })}
      <p className="mt-6 text-[13px] leading-6 text-[var(--a-text-2)]">{t('confirmationRequest')}</p>
      <div className="mt-10 grid gap-10 text-[12.5px] text-[var(--a-text-2)] sm:grid-cols-2">
        <div>
          <div className="border-t border-[var(--a-text-3)] pt-1">{t('signatureCompany', { name: data.company?.name ?? '' })}</div>
        </div>
        <div>
          <div className="border-t border-[var(--a-text-3)] pt-1">{t('signaturePartner', { name: data.partner.name })}</div>
          <div className="mt-6 text-[12px]">{t('agreeLine')}</div>
        </div>
      </div>
    </div>
  );
}
