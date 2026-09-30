'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2, Plus, ReceiptText, X } from 'lucide-react';
import { accountingApi, type PartnerOption } from '@/lib/api/accounting.api';
import { expenseReportsApi, type ExpenseReportListItem } from '@/lib/api/cashExpense.api';
import { getErrorMessage } from '@/lib/api/client';
import { getIsoToday } from '@/lib/utils/date';
import { HelpLink } from '@/components/guides/HelpLink';
import { EXPENSE_STATUS_TONE } from '@/components/accounting/expenses/status';

const money = (value: number) => value.toLocaleString('et-EE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateText = (value: string) => value.split('-').reverse().join('.');


export default function ExpenseReportsPage() {
  const t = useTranslations('expenseReports');
  const [reports, setReports] = useState<ExpenseReportListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    expenseReportsApi.list().then(setReports).catch((err) => {
      setReports([]);
      setError(getErrorMessage(err));
    });
  }, []);

  return (
    <div className="mx-auto w-full max-w-5xl py-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-[var(--a-text)]">{t('title')}</h1>
          <p className="mt-1 text-[13px] text-[var(--a-text-2)]">{t('subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <HelpLink slug="kassa-ja-kuluaruanded" />
          <button type="button" onClick={() => setCreating(true)} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[var(--a-accent)] px-3 text-[13px] font-semibold text-[var(--a-accent-on)]">
            <Plus className="h-3.5 w-3.5" />
            {t('newReport')}
          </button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-[var(--a-neg-soft)] px-3 py-2 text-[13px] text-[var(--a-neg)]">{error}</div>}

      <div className="rounded-[12px] border border-[var(--a-border)] bg-[var(--a-surface)]">
        {reports === null ? (
          <div className="py-10 text-center text-[13px] text-[var(--a-text-3)]">{t('loading')}</div>
        ) : reports.length === 0 ? (
          <div className="py-12 text-center">
            <ReceiptText className="mx-auto h-7 w-7 text-[var(--a-text-3)]" />
            <p className="mt-2 text-[13.5px] text-[var(--a-text-2)]">{t('empty')}</p>
          </div>
        ) : (
          <>
          {/* Phones: one tappable two-line card per report instead of the table. */}
          <ul className="divide-y divide-[var(--a-border)] md:hidden">
            {reports.map((report) => (
              <li key={report.id}>
                <Link href={`/accounting/expense-reports/${report.id}`} className="flex min-h-[56px] items-center gap-3 px-3 py-2.5 active:bg-[var(--a-surface-2)]">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-medium text-[var(--a-text)]">{report.employee_name ?? '—'}</div>
                    <div className="truncate text-[12px] text-[var(--a-text-3)]">
                      <span className="font-mono">{report.report_number}</span> · <span className="font-mono">{dateText(report.report_date)}</span> · {t('receipts')}: {report.receipt_count}
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-end gap-1">
                    <span className="font-mono text-[13.5px] font-semibold tabular-nums text-[var(--a-text)]">{money(report.total)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${EXPENSE_STATUS_TONE[report.status]}`}>{t(`statusLabel.${report.status}`)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <table className="hidden w-full border-collapse text-[13px] md:table">
            <thead>
              <tr className="border-b border-[var(--a-border)] text-left text-[11px] uppercase tracking-wide text-[var(--a-text-3)]">
                <th className="px-4 py-2">{t('number')}</th>
                <th className="px-4 py-2">{t('employee')}</th>
                <th className="px-4 py-2">{t('date')}</th>
                <th className="px-4 py-2">{t('receipts')}</th>
                <th className="px-4 py-2 text-right">{t('total')}</th>
                <th className="px-4 py-2">{t('status')}</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="border-b border-[var(--a-border)] hover:bg-[var(--a-surface-2)]">
                  <td className="px-4 py-2 font-mono">
                    <Link href={`/accounting/expense-reports/${report.id}`} className="text-[var(--a-accent)] hover:underline">{report.report_number}</Link>
                  </td>
                  <td className="px-4 py-2">{report.employee_name ?? '—'}</td>
                  <td className="px-4 py-2 font-mono">{dateText(report.report_date)}</td>
                  <td className="px-4 py-2">{report.receipt_count}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">{money(report.total)}</td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${EXPENSE_STATUS_TONE[report.status]}`}>{t(`statusLabel.${report.status}`)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </>
        )}
      </div>

      {creating && <NewReportDialog onClose={() => setCreating(false)} />}
    </div>
  );
}

function NewReportDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslations('expenseReports');
  const router = useRouter();
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [query, setQuery] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [date, setDate] = useState(getIsoToday());
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    accountingApi.getPartners().then(setPartners).catch(() => {});
  }, []);

  const matches = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('et');
    return (needle ? partners.filter((p) => p.name.toLocaleLowerCase('et').includes(needle)) : partners).slice(0, 100);
  }, [partners, query]);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      let partnerId = employeeId;
      if (!partnerId) {
        // A person not yet in the partner list: add them, so bank payouts can be matched to them later.
        const created = await accountingApi.createPartner({ name: query.trim(), type: 'supplier' });
        partnerId = created.id;
      }
      const report = await expenseReportsApi.create({ employee_partner_id: partnerId, report_date: date, description: description.trim() || null });
      router.push(`/accounting/expense-reports/${report.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  const canSubmit = Boolean(employeeId || query.trim()) && !saving;
  const field = 'h-10 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-bg)] px-3';

  return (
    <div className="fixed inset-0 z-50 grid items-end bg-black/30 p-0 sm:place-items-center sm:p-4" onPointerDown={(event) => event.target === event.currentTarget && !saving && onClose()}>
      <form
        className="flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-xl border border-[var(--a-border)] bg-[var(--a-surface)] shadow-xl sm:max-h-[90dvh] sm:rounded-xl"
        onSubmit={(event) => {
          event.preventDefault();
          if (canSubmit) void submit();
        }}
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--a-border)] px-4 py-3">
          <div className="text-[15px] font-semibold text-[var(--a-text)]">{t('newReport')}</div>
          <button type="button" onClick={onClose} aria-label={t('cancel')} className="grid h-9 w-9 place-items-center sm:h-8 sm:w-8 rounded-md text-[var(--a-text-3)] hover:bg-[var(--a-surface-2)]"><X className="h-4 w-4" /></button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 text-[13px]">
          <label className="block">
            <span className="mb-1 block font-medium text-[var(--a-text-2)]">{t('employee')}</span>
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setEmployeeId('');
              }}
              placeholder={t('employeePlaceholder')}
              className={field}
            />
            {query.trim() && !employeeId && (
              <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-[var(--a-border)]">
                {matches.map((partner) => (
                  <button
                    key={partner.id}
                    type="button"
                    onClick={() => {
                      setEmployeeId(partner.id);
                      setQuery(partner.name);
                    }}
                    className="block w-full px-3 py-2.5 text-left hover:bg-[var(--a-surface-2)] sm:py-1.5"
                  >
                    {partner.name}
                  </button>
                ))}
                <div className="px-3 py-1.5 text-[12px] text-[var(--a-text-3)]">{t('willCreateEmployee', { name: query.trim() })}</div>
              </div>
            )}
          </label>
          <label className="block">
            <span className="mb-1 block font-medium text-[var(--a-text-2)]">{t('date')}</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={field} />
          </label>
          <label className="block">
            <span className="mb-1 block font-medium text-[var(--a-text-2)]">{t('description')}</span>
            <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder={t('descriptionPlaceholder')} maxLength={500} className={field} />
          </label>
          {error && <div className="rounded-lg bg-[var(--a-neg-soft)] px-3 py-2 text-[12.5px] text-[var(--a-neg)]">{error}</div>}
        </div>
        <div className="flex flex-shrink-0 justify-end gap-2 border-t border-[var(--a-border)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3">
          <button type="button" onClick={onClose} className="h-9 rounded-lg border border-[var(--a-border)] px-4 text-[13px] font-medium text-[var(--a-text-2)]">{t('cancel')}</button>
          <button type="submit" disabled={!canSubmit} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--a-accent)] px-4 text-[13px] font-semibold text-[var(--a-accent-on)] disabled:opacity-50">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {t('create')}
          </button>
        </div>
      </form>
    </div>
  );
}
