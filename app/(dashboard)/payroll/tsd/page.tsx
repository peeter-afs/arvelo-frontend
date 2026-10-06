'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Check, Copy, Download, FileText, Loader2 } from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';
import { payrollApi, type TsdFormat, type TsdPreview, type TsdPreviewRow } from '@/lib/api/payroll.api';
import { currentMonth, dateText, money } from '@/components/payroll/format';

/** e-MTA wants a decimal comma and no thousand separators when typing amounts. */
const plain = (value: number) => Number(value || 0).toFixed(2).replace('.', ',');

export default function TsdManualPage() {
  return (
    <Suspense>
      <TsdManualView />
    </Suspense>
  );
}

function TsdManualView() {
  const t = useTranslations('payroll');
  const searchParams = useSearchParams();
  const [period, setPeriod] = useState(searchParams.get('period') || currentMonth());
  const [data, setData] = useState<TsdPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<TsdFormat | null>(null);

  const load = useCallback(() => {
    setError(null);
    payrollApi
      .tsdPreview(period)
      .then(setData)
      .catch((err) => {
        setData(null);
        setError(getErrorMessage(err));
      });
  }, [period]);

  useEffect(load, [load]);

  const download = async (format: TsdFormat) => {
    setBusy(format);
    setError(null);
    try {
      await payrollApi.downloadTsd(period, format);
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const btn = 'inline-flex h-9 items-center gap-1.5 rounded-md border border-[var(--a-border)] bg-[var(--a-surface)] px-3 text-[13px] font-medium text-[var(--a-text-2)] hover:bg-[var(--a-surface-2)] disabled:opacity-50';

  return (
    <div className="mx-auto w-full max-w-6xl py-4">
      <Link href="/payroll" className="mb-2 inline-flex items-center gap-1 text-[12.5px] text-[var(--a-text-3)] hover:text-[var(--a-text)]">
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('title')}
      </Link>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-[var(--a-text)]">{t('tsdManual.title')}</h1>
          <p className="mt-1 max-w-2xl text-[13px] text-[var(--a-text-2)]">{t('tsdManual.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input type="month" value={period} onChange={(e) => e.target.value && setPeriod(e.target.value)} className="h-9 rounded-md border border-[var(--a-border)] bg-[var(--a-surface)] px-2 text-[13px]" />
          <button type="button" className={btn} disabled={busy !== null || !data?.rows.length} onClick={() => void download('csv')}>
            {busy === 'csv' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
            CSV
          </button>
          <button type="button" className={btn} disabled={busy !== null || !data?.rows.length} onClick={() => void download('xbrl_monthly')}>
            {busy === 'xbrl_monthly' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {t('tsd.formatXbrlMonthlyShort')}
          </button>
        </div>
      </div>

      {error && <div className="mb-3 rounded-lg bg-[var(--a-neg-soft)] px-3 py-2 text-[13px] text-[var(--a-neg)]">{error}</div>}

      {data === null && !error ? (
        <div className="py-10 text-center text-[13px] text-[var(--a-text-3)]">{t('loading')}</div>
      ) : data && data.rows.length === 0 ? (
        <div className="rounded-[12px] border border-[var(--a-border)] bg-[var(--a-surface)] py-12 text-center text-[13.5px] text-[var(--a-text-2)]">{t('tsdManual.empty')}</div>
      ) : data ? (
        <>
          <div className="overflow-x-auto rounded-[12px] border border-[var(--a-border)] bg-[var(--a-surface)]">
            <table className="w-full min-w-[1080px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-[var(--a-border)] text-left text-[11px] uppercase tracking-wide text-[var(--a-text-3)]">
                  <th className="px-3 py-2">{t('personalCode')}</th>
                  <th className="px-3 py-2">{t('name')}</th>
                  <th className="px-3 py-2">{t('tsdManual.type')}</th>
                  <th className="px-3 py-2 text-right">{t('tsdManual.amount')}</th>
                  <th className="px-3 py-2 text-right">{t('tsdManual.exemption')}</th>
                  <th className="px-3 py-2 text-right">{t('tsdManual.minIncrease')}</th>
                  <th className="px-3 py-2 text-right">{t('socialTax')}</th>
                  <th className="px-3 py-2 text-right">{t('pensionShort')}</th>
                  <th className="px-3 py-2 text-right">{t('uiEmployeeShort')}</th>
                  <th className="px-3 py-2 text-right">{t('uiEmployerShort')}</th>
                  <th className="px-3 py-2 text-right">{t('incomeTax')}</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <Row key={`${row.personal_code}-${row.payment_type}`} row={row} />
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[var(--a-border)] font-semibold">
                  <td className="px-3 py-2" colSpan={3}>{t('total')}</td>
                  <Total value={data.totals.amount} />
                  <Total value={data.totals.exemption} />
                  <Total value={data.totals.min_base_increase} />
                  <Total value={data.totals.social_tax} />
                  <Total value={data.totals.pension} />
                  <Total value={data.totals.unemployment_employee} />
                  <Total value={data.totals.unemployment_employer} />
                  <Total value={data.totals.income_tax} />
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="rounded-[12px] border border-[var(--a-border)] bg-[var(--a-surface)] p-3 text-[12.5px] text-[var(--a-text-2)]">
              <div className="mb-1 font-semibold text-[var(--a-text)]">{t('tsdManual.howTitle')}</div>
              <ol className="list-decimal space-y-0.5 pl-4">
                <li>{t('tsdManual.how1')}</li>
                <li>{t('tsdManual.how2')}</li>
                <li>{t('tsdManual.how3')}</li>
              </ol>
              <p className="mt-2 text-[11.5px] text-[var(--a-text-3)]">{t('tsdManual.summaryNote', { payments: data.payment_count, rows: data.rows.length })}</p>
            </div>
            <div className="rounded-[12px] border border-[var(--a-border)] bg-[var(--a-surface)] p-3 text-[12.5px] text-[var(--a-text-2)]">
              <div className="mb-1 font-semibold text-[var(--a-text)]">{t('tsdManual.exportsTitle')}</div>
              {data.exports.length === 0 ? (
                <div className="text-[var(--a-text-3)]">{t('tsdManual.noExports')}</div>
              ) : (
                <ul className="space-y-0.5">
                  {data.exports.map((e, i) => (
                    <li key={i}>
                      {dateText(e.created_at)} {e.created_at.slice(11, 16)} · {t(`tsdManual.exportFormat.${e.format}`)}
                      {e.entry_count ? ` · ${t('tsdManual.entries', { count: e.entry_count })}` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Row({ row }: { row: TsdPreviewRow }) {
  const t = useTranslations('payroll');
  return (
    <tr className="border-b border-[var(--a-border)] last:border-0 hover:bg-[var(--a-surface-2)]">
      <td className="px-3 py-1.5"><CopyCell text={row.personal_code} mono /></td>
      <td className="px-3 py-1.5">
        <div className="font-medium text-[var(--a-text)]">{row.name}</div>
        {row.payment_count > 1 && <div className="text-[11px] text-[var(--a-text-3)]">{t('tsdManual.payments', { count: row.payment_count })}</div>}
      </td>
      <td className="px-3 py-1.5"><CopyCell text={row.payment_type} mono /></td>
      <Num value={row.amount} />
      <td className="px-3 py-1.5 text-right">
        {row.exemption > 0 ? (
          <span className="inline-flex items-center gap-1">
            <span className="text-[11px] text-[var(--a-text-3)]">{row.exemption_code}</span>
            <CopyCell text={plain(row.exemption)} mono />
          </span>
        ) : (
          <span className="text-[var(--a-text-3)]">—</span>
        )}
      </td>
      <Num value={row.min_base_increase} dashZero />
      <Num value={row.social_tax} dashZero />
      <Num value={row.pension} dashZero />
      <Num value={row.unemployment_employee} dashZero />
      <Num value={row.unemployment_employer} dashZero />
      <Num value={row.income_tax} dashZero />
    </tr>
  );
}

function Num({ value, dashZero }: { value: number; dashZero?: boolean }) {
  return (
    <td className="px-3 py-1.5 text-right">
      {dashZero && !value ? <span className="text-[var(--a-text-3)]">—</span> : <CopyCell text={plain(value)} label={money(value)} mono />}
    </td>
  );
}

function Total({ value }: { value: number }) {
  return <td className="px-3 py-2 text-right font-mono tabular-nums">{money(value)}</td>;
}

/** A value with a copy button, so it can be pasted into the e-MTA form as is. */
function CopyCell({ text, label, mono }: { text: string; label?: string; mono?: boolean }) {
  const t = useTranslations('payroll');
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title={t('tsdManual.copy')}
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
      className={`group inline-flex items-center gap-1 rounded px-1 py-0.5 hover:bg-[var(--a-surface-2)] ${mono ? 'font-mono tabular-nums' : ''}`}
    >
      <span>{label ?? text}</span>
      {copied ? <Check className="h-3 w-3 text-[var(--a-pos)]" /> : <Copy className="h-3 w-3 text-[var(--a-text-3)] opacity-0 group-hover:opacity-100" />}
    </button>
  );
}
