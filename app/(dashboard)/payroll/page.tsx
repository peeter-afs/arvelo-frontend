'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Download, Loader2, Plus, Settings, Users, Wallet, X } from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';
import { payrollApi, type PayrollEmployee, type PayrollRunListItem, type TsdFormat } from '@/lib/api/payroll.api';
import { HelpLink } from '@/components/guides/HelpLink';
import { currentMonth, dateText, money, monthText, previousMonth, RUN_STATUS_TONE } from '@/components/payroll/format';

export default function PayrollRunsPage() {
  const t = useTranslations('payroll');
  const [runs, setRuns] = useState<PayrollRunListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [tsdOpen, setTsdOpen] = useState(false);

  useEffect(() => {
    payrollApi.runs().then(setRuns).catch((err) => {
      setRuns([]);
      setError(getErrorMessage(err));
    });
  }, []);

  const button = 'inline-flex h-9 items-center gap-1.5 rounded-md border border-[var(--a-border)] bg-[var(--a-surface)] px-3 text-[13px] font-medium text-[var(--a-text-2)] hover:bg-[var(--a-surface-2)]';

  return (
    <div className="mx-auto w-full max-w-5xl py-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-[var(--a-text)]">{t('title')}</h1>
          <p className="mt-1 text-[13px] text-[var(--a-text-2)]">{t('subtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <HelpLink slug="palgaarvestus" />
          <Link href="/payroll/employees" className={button}>
            <Users className="h-3.5 w-3.5" />
            {t('employees')}
          </Link>
          <Link href="/payroll/settings" className={button}>
            <Settings className="h-3.5 w-3.5" />
            {t('settings')}
          </Link>
          <button type="button" onClick={() => setTsdOpen(true)} className={button}>
            <Download className="h-3.5 w-3.5" />
            {t('tsd.button')}
          </button>
          <button type="button" onClick={() => setCreating(true)} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[var(--a-accent)] px-3 text-[13px] font-semibold text-[var(--a-accent-on)]">
            <Plus className="h-3.5 w-3.5" />
            {t('newRun')}
          </button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-[var(--a-neg-soft)] px-3 py-2 text-[13px] text-[var(--a-neg)]">{error}</div>}

      <div className="rounded-[12px] border border-[var(--a-border)] bg-[var(--a-surface)]">
        {runs === null ? (
          <div className="py-10 text-center text-[13px] text-[var(--a-text-3)]">{t('loading')}</div>
        ) : runs.length === 0 ? (
          <div className="py-12 text-center">
            <Wallet className="mx-auto h-7 w-7 text-[var(--a-text-3)]" />
            <p className="mt-2 text-[13.5px] text-[var(--a-text-2)]">{t('emptyRuns')}</p>
            <p className="mt-1 text-[12.5px] text-[var(--a-text-3)]">{t('emptyRunsHint')}</p>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-[var(--a-border)] md:hidden">
              {runs.map((run) => (
                <li key={run.id}>
                  <Link href={`/payroll/runs/${run.id}`} className="flex min-h-[56px] items-center gap-3 px-3 py-2.5 active:bg-[var(--a-surface-2)]">
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-medium text-[var(--a-text)]">{monthText(run.period_month)}</div>
                      <div className="text-[12px] text-[var(--a-text-3)]">
                        {t('paymentDate')}: <span className="font-mono">{dateText(run.payment_date)}</span> · {t('employeeCount', { count: run.employee_count })}
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 flex-col items-end gap-1">
                      <span className="font-mono text-[13.5px] font-semibold tabular-nums">{money(run.totals.gross_wage + run.totals.gross_sick)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${RUN_STATUS_TONE[run.status]}`}>{t(`status.${run.status}`)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <table className="hidden w-full border-collapse text-[13px] md:table">
              <thead>
                <tr className="border-b border-[var(--a-border)] text-left text-[11px] uppercase tracking-wide text-[var(--a-text-3)]">
                  <th className="px-4 py-2">{t('workMonth')}</th>
                  <th className="px-4 py-2">{t('paymentDate')}</th>
                  <th className="px-4 py-2">{t('employees')}</th>
                  <th className="px-4 py-2 text-right">{t('gross')}</th>
                  <th className="px-4 py-2 text-right">{t('net')}</th>
                  <th className="px-4 py-2 text-right">{t('taxesToPay')}</th>
                  <th className="px-4 py-2 text-right">{t('employerCost')}</th>
                  <th className="px-4 py-2">{t('statusLabel')}</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => (
                  <tr key={run.id} className="border-b border-[var(--a-border)] last:border-0 hover:bg-[var(--a-surface-2)]">
                    <td className="px-4 py-2">
                      <Link href={`/payroll/runs/${run.id}`} className="font-medium text-[var(--a-accent)] hover:underline">{monthText(run.period_month)}</Link>
                      {run.run_type === 'extra' && <span className="ml-1.5 rounded-full bg-[var(--a-surface-2)] px-1.5 py-0.5 text-[10.5px] text-[var(--a-text-2)]">{t('extraRun')}</span>}
                    </td>
                    <td className="px-4 py-2 font-mono">{dateText(run.payment_date)}</td>
                    <td className="px-4 py-2">{run.employee_count}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums">{money(run.totals.gross_wage + run.totals.gross_sick)}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums">{money(run.totals.net_pay)}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums">{money(run.totals.taxes_to_pay)}</td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums">{money(run.totals.employer_cost)}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${RUN_STATUS_TONE[run.status]}`}>{t(`status.${run.status}`)}</span>
                      {run.tsd_exported_at && run.status === 'posted' && <span className="ml-1.5 text-[11px] text-[var(--a-text-3)]">TSD ✓</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {creating && <NewRunDialog onClose={() => setCreating(false)} />}
      {tsdOpen && <TsdDialog onClose={() => setTsdOpen(false)} />}
    </div>
  );
}

function Dialog({ title, onClose, busy, children, footer }: { title: string; onClose: () => void; busy?: boolean; children: React.ReactNode; footer: React.ReactNode }) {
  const t = useTranslations('payroll');
  return (
    <div className="fixed inset-0 z-50 grid items-end bg-black/30 p-0 sm:place-items-center sm:p-4" onPointerDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
      <div className="flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-xl border border-[var(--a-border)] bg-[var(--a-surface)] shadow-xl sm:max-h-[90dvh] sm:rounded-xl">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--a-border)] px-4 py-3">
          <div className="text-[15px] font-semibold text-[var(--a-text)]">{title}</div>
          <button type="button" onClick={onClose} aria-label={t('cancel')} className="grid h-8 w-8 place-items-center rounded-md text-[var(--a-text-3)] hover:bg-[var(--a-surface-2)]"><X className="h-4 w-4" /></button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 text-[13px]">{children}</div>
        <div className="flex flex-shrink-0 justify-end gap-2 border-t border-[var(--a-border)] px-4 py-3">{footer}</div>
      </div>
    </div>
  );
}

function NewRunDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslations('payroll');
  const router = useRouter();
  const [employees, setEmployees] = useState<PayrollEmployee[] | null>(null);
  const [chosenMonth, setChosenMonth] = useState<string | null>(null);
  const [paymentDate, setPaymentDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    payrollApi.employees().then(setEmployees).catch(() => setEmployees([]));
  }, []);

  const contracts = useMemo(
    () => (employees ?? []).flatMap((e) => e.contracts.map((c) => ({ ...c, employee: e.name ?? '—' }))),
    [employees]
  );
  // Usually last month; for a first payroll that would be before anyone was hired.
  const defaultMonth = useMemo(() => {
    const last = previousMonth();
    const first = contracts.map((c) => c.start_date.slice(0, 7)).sort()[0];
    return first && first > last ? first : last;
  }, [contracts]);
  const month = chosenMonth ?? defaultMonth;
  const inForce = contracts.filter((c) => c.start_date <= `${month}-31` && (!c.end_date || c.end_date >= `${month}-01`));

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      const run = await payrollApi.createRun({ period_month: month, payment_date: paymentDate || null });
      router.push(`/payroll/runs/${run.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  const field = 'h-10 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-bg)] px-3';
  return (
    <Dialog
      title={t('newRun')}
      onClose={onClose}
      busy={saving}
      footer={
        <>
          <button type="button" onClick={onClose} className="h-9 rounded-md border border-[var(--a-border)] px-3 text-[13px]">{t('cancel')}</button>
          <button type="button" disabled={!month || saving || employees === null || inForce.length === 0} onClick={() => void submit()} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[var(--a-accent)] px-3 text-[13px] font-semibold text-[var(--a-accent-on)] disabled:opacity-50">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {t('createRun')}
          </button>
        </>
      }
    >
      <p className="text-[12.5px] text-[var(--a-text-2)]">{t('newRunHint')}</p>
      <label className="block">
        <span className="mb-1 block font-medium text-[var(--a-text-2)]">{t('workMonth')}</span>
        <input type="month" value={month} onChange={(e) => setChosenMonth(e.target.value)} className={field} />
        {employees !== null &&
          (inForce.length > 0 ? (
            <span className="mt-1 block text-[11.5px] text-[var(--a-text-3)]">
              {t('contractsInForce', { count: inForce.length, names: [...new Set(inForce.map((c) => c.employee))].join(', ') })}
            </span>
          ) : (
            <span className="mt-1 block rounded-md bg-[var(--a-warn-soft)] px-2 py-1.5 text-[12px] text-[var(--a-warn)]">
              {contracts.length === 0 ? t('noContractsAtAll') : t('noContractsInMonth')}{' '}
              <Link href="/payroll/employees" className="font-medium underline">{t('employees')}</Link>
            </span>
          ))}
      </label>
      <label className="block">
        <span className="mb-1 block font-medium text-[var(--a-text-2)]">{t('paymentDate')}</span>
        <input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className={field} />
        <span className="mt-1 block text-[11.5px] text-[var(--a-text-3)]">{t('paymentDateHint')}</span>
      </label>
      {error && <div className="rounded-lg bg-[var(--a-neg-soft)] px-3 py-2 text-[var(--a-neg)]">{error}</div>}
    </Dialog>
  );
}

function TsdDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslations('payroll');
  const [period, setPeriod] = useState(currentMonth());
  const [format, setFormat] = useState<TsdFormat>('xbrl');
  const [includeSent, setIncludeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    setBusy(true);
    setError(null);
    try {
      await payrollApi.downloadTsd(period, format, includeSent);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const formats: Array<{ value: TsdFormat; label: string; hint: string }> = [
    { value: 'xbrl', label: t('tsd.formatXbrl'), hint: t('tsd.formatXbrlHint') },
    { value: 'xbrl_monthly', label: t('tsd.formatXbrlMonthly'), hint: t('tsd.formatXbrlMonthlyHint') },
    { value: 'csv', label: t('tsd.formatCsv'), hint: t('tsd.formatCsvHint') },
  ];

  return (
    <Dialog
      title={t('tsd.title')}
      onClose={onClose}
      busy={busy}
      footer={
        <>
          <Link href={`/payroll/tsd?period=${period}`} className="mr-auto inline-flex h-9 items-center text-[13px] font-medium text-[var(--a-accent)] hover:underline">
            {t('tsd.manualLink')}
          </Link>
          <button type="button" onClick={onClose} className="h-9 rounded-md border border-[var(--a-border)] px-3 text-[13px]">{t('cancel')}</button>
          <button type="button" disabled={!period || busy} onClick={() => void download()} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[var(--a-accent)] px-3 text-[13px] font-semibold text-[var(--a-accent-on)] disabled:opacity-50">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            {t('tsd.download')}
          </button>
        </>
      }
    >
      <label className="block">
        <span className="mb-1 block font-medium text-[var(--a-text-2)]">{t('tsd.period')}</span>
        <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="h-10 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-bg)] px-3" />
      </label>
      <div className="space-y-1.5">
        <span className="block font-medium text-[var(--a-text-2)]">{t('tsd.format')}</span>
        {formats.map((f) => (
          <label key={f.value} className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 ${format === f.value ? 'border-[var(--a-accent)] bg-[var(--a-surface-2)]' : 'border-[var(--a-border)]'}`}>
            <input type="radio" name="tsd-format" checked={format === f.value} onChange={() => setFormat(f.value)} className="mt-0.5" />
            <span>
              <span className="block text-[13px] font-medium text-[var(--a-text)]">{f.label}</span>
              <span className="block text-[11.5px] text-[var(--a-text-3)]">{f.hint}</span>
            </span>
          </label>
        ))}
      </div>
      {format !== 'csv' && (
        <label className="flex items-start gap-2 text-[12.5px]">
          <input type="checkbox" checked={includeSent} onChange={(e) => setIncludeSent(e.target.checked)} className="mt-0.5" />
          <span>
            {t('tsd.includeSent')}
            <span className="block text-[11.5px] text-[var(--a-text-3)]">{t('tsd.includeSentHint')}</span>
          </span>
        </label>
      )}
      <p className="text-[11.5px] text-[var(--a-text-3)]">{t('tsd.uploadHint')}</p>
      {error && <div className="rounded-lg bg-[var(--a-neg-soft)] px-3 py-2 text-[var(--a-neg)]">{error}</div>}
    </Dialog>
  );
}
