'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertTriangle, ArrowLeft, Banknote, CheckCircle2, Download, Loader2, Plus, RefreshCw, RotateCcw, Sparkles, Trash2, X } from 'lucide-react';
import { bankingApi, type BankAccountRecord } from '@/lib/api/banking.api';
import { getErrorMessage } from '@/lib/api/client';
import {
  payrollApi,
  type EarningItem,
  type EarningKind,
  type PayrollEmployee,
  type PayrollLine,
  type PayrollRunDetail,
} from '@/lib/api/payroll.api';
import { dateText, money, monthText, parseAmount, RUN_STATUS_TONE } from '@/components/payroll/format';

const KINDS: EarningKind[] = ['base', 'bonus', 'vacation', 'other', 'sick'];
const btn = 'inline-flex h-9 items-center gap-1.5 rounded-md border border-[var(--a-border)] bg-[var(--a-surface)] px-3 text-[13px] font-medium text-[var(--a-text-2)] hover:bg-[var(--a-surface-2)] disabled:opacity-50';
const primary = 'inline-flex h-9 items-center gap-1.5 rounded-md bg-[var(--a-accent)] px-3 text-[13px] font-semibold text-[var(--a-accent-on)] disabled:opacity-50';

export default function PayrollRunPage() {
  const t = useTranslations('payroll');
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [run, setRun] = useState<PayrollRunDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<PayrollLine | null>(null);
  const [adding, setAdding] = useState(false);
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(() => {
    payrollApi.run(params.id).then(setRun).catch((err) => setError(getErrorMessage(err)));
  }, [params.id]);

  useEffect(load, [load]);

  const act = async (key: string, action: () => Promise<PayrollRunDetail | void>, after?: (result: PayrollRunDetail | void) => void) => {
    setBusy(key);
    setError(null);
    setNotice(null);
    try {
      const result = await action();
      if (result) setRun(result);
      after?.(result);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  if (!run) {
    return (
      <div className="mx-auto w-full max-w-6xl py-4">
        {error ? <div className="rounded-lg bg-[var(--a-neg-soft)] px-3 py-2 text-[13px] text-[var(--a-neg)]">{error}</div> : <div className="py-10 text-center text-[13px] text-[var(--a-text-3)]">{t('loading')}</div>}
      </div>
    );
  }

  const isDraft = run.status === 'draft';
  const payoutPeriod = run.payment_date.slice(0, 7);
  const tt = run.totals;

  return (
    <div className="mx-auto w-full max-w-6xl py-4">
      <Link href="/payroll" className="mb-2 inline-flex items-center gap-1 text-[12.5px] text-[var(--a-text-3)] hover:text-[var(--a-text)]">
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('title')}
      </Link>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[20px] font-semibold text-[var(--a-text)]">{t('runTitle', { month: monthText(run.period_month) })}</h1>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${RUN_STATUS_TONE[run.status]}`}>{t(`status.${run.status}`)}</span>
            {run.run_type === 'extra' && <span className="rounded-full bg-[var(--a-surface-2)] px-2 py-0.5 text-[11px] font-medium text-[var(--a-text-2)]">{t('extraRun')}</span>}
          </div>
          {run.description && run.run_type === 'extra' && <div className="mt-0.5 text-[13px] text-[var(--a-text-2)]">{run.description}</div>}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-[var(--a-text-2)]">
            <span>{t('paymentDate')}:</span>
            {isDraft ? (
              <input
                type="date"
                value={run.payment_date}
                onChange={(e) => e.target.value && void act('date', () => payrollApi.updateRun(run.id, { payment_date: e.target.value }))}
                className="h-8 rounded-md border border-[var(--a-border)] bg-[var(--a-bg)] px-2 font-mono text-[12.5px]"
              />
            ) : (
              <span className="font-mono">{dateText(run.payment_date)}</span>
            )}
            {run.journal_entry_id && (
              <Link href={`/accounting/journal/${run.journal_entry_id}`} className="text-[var(--a-accent)] hover:underline">{t('journalEntry')}</Link>
            )}
            {run.payment_batch_id && (
              <Link href="/accounting/payment-batches" className="text-[var(--a-accent)] hover:underline">{t('paymentBatch')}</Link>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {isDraft && (
            <>
              {run.run_type === 'regular' && (
                <button type="button" className={btn} disabled={busy !== null} onClick={() => void act('refresh', () => payrollApi.refreshAbsences(run.id))} title={t('refreshAbsencesHint')}>
                  {busy === 'refresh' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  {t('refreshAbsences')}
                </button>
              )}
              <button type="button" className={btn} onClick={() => setAdding(true)}>
                <Plus className="h-3.5 w-3.5" />
                {t('addLine')}
              </button>
              <button
                type="button"
                className={btn}
                disabled={busy !== null}
                onClick={() => {
                  if (window.confirm(t('confirmDeleteDraft'))) void act('delete', () => payrollApi.deleteRun(run.id), () => router.push('/payroll'));
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t('deleteDraft')}
              </button>
              <button type="button" className={primary} disabled={busy !== null || run.lines.length === 0} onClick={() => void act('approve', () => payrollApi.approve(run.id))}>
                {busy === 'approve' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                {t('approve')}
              </button>
            </>
          )}
          {run.status === 'approved' && (
            <>
              <button type="button" className={btn} disabled={busy !== null} onClick={() => void act('reopen', () => payrollApi.reopen(run.id))}>
                <RotateCcw className="h-3.5 w-3.5" />
                {t('reopen')}
              </button>
              <button type="button" className={btn} disabled={busy !== null} onClick={() => setCancelling(true)}>{t('cancelRun')}</button>
              <button type="button" className={primary} disabled={busy !== null} onClick={() => void act('post', () => payrollApi.post(run.id))}>
                {busy === 'post' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {t('post')}
              </button>
            </>
          )}
          {run.status === 'posted' && (
            <>
              <button type="button" className={btn} disabled={busy !== null} onClick={() => setCancelling(true)}>{t('cancelRun')}</button>
              <button
                type="button"
                className={btn}
                disabled={busy !== null}
                onClick={() => void act('tsd', () => payrollApi.downloadTsd(payoutPeriod), () => setNotice(t('tsd.downloaded', { period: monthText(payoutPeriod) })))}
              >
                {busy === 'tsd' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                {t('tsd.forPeriod', { period: monthText(payoutPeriod) })}
              </button>
              <button type="button" className={primary} disabled={busy !== null || Boolean(run.payment_batch_id)} onClick={() => setPaying(true)}>
                <Banknote className="h-3.5 w-3.5" />
                {t('createPayments')}
              </button>
            </>
          )}
          {run.status === 'cancelled' && run.tsd_exported_at && (
            <button type="button" className={btn} disabled={busy !== null} onClick={() => void act('tsdCancel', () => payrollApi.downloadTsdCancellation(run.id, payoutPeriod))}>
              <Download className="h-3.5 w-3.5" />
              {t('tsd.cancellationFile')}
            </button>
          )}
        </div>
      </div>

      {error && <div className="mb-3 rounded-lg bg-[var(--a-neg-soft)] px-3 py-2 text-[13px] text-[var(--a-neg)]">{error}</div>}
      {notice && <div className="mb-3 rounded-lg bg-[var(--a-pos-soft)] px-3 py-2 text-[13px] text-[var(--a-pos)]">{notice}</div>}
      {run.status === 'cancelled' && run.cancel_reason && (
        <div className="mb-3 rounded-lg bg-[var(--a-surface-2)] px-3 py-2 text-[13px] text-[var(--a-text-2)]">{t('cancelledReason', { reason: run.cancel_reason })}</div>
      )}
      {run.warnings.length > 0 && run.status !== 'cancelled' && (
        <div className="mb-3 space-y-0.5 rounded-lg bg-[var(--a-warn-soft)] px-3 py-2 text-[12.5px] text-[var(--a-warn)]">
          {run.warnings.map((w) => {
            const [code, who, date, absenceId] = w.split(':');
            const text =
              code === 'missing_personal_code' ? t('warning.runNoPersonalCode', { name: who })
              : code === 'missing_iban' ? t('warning.runNoIban', { name: who })
              : code === 'vacation_unpaid' ? t('warning.vacationUnpaid', { name: who, date: dateText(date) })
              : code === 'sick_manual' ? t('warning.sickManual', { name: who, date: dateText(date) })
              : t('warning.partialMonth', { name: who });
            return (
              <div key={w} className="flex flex-wrap items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                {text}
                {code === 'vacation_unpaid' && absenceId && (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void act(`pay-${absenceId}`, () => payrollApi.vacationPayout(absenceId), (result) => result && router.push(`/payroll/runs/${result.id}`))}
                    className="ml-1 rounded border border-current px-1.5 py-0.5 text-[11.5px] font-medium hover:bg-white/40 disabled:opacity-50"
                  >
                    {t('absence.payVacation')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label={t('gross')} value={tt.gross_wage + tt.gross_sick} />
        <Stat label={t('net')} value={tt.net_pay} />
        <Stat label={t('taxesToPay')} value={tt.taxes_to_pay} />
        <Stat label={t('employerCost')} value={tt.employer_cost} />
      </div>

      <div className="overflow-x-auto rounded-[12px] border border-[var(--a-border)] bg-[var(--a-surface)]">
        <table className="w-full min-w-[860px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-[var(--a-border)] text-left text-[11px] uppercase tracking-wide text-[var(--a-text-3)]">
              <th className="px-3 py-2">{t('employee')}</th>
              <th className="px-3 py-2 text-right">{t('gross')}</th>
              <th className="px-3 py-2 text-right" title={t('pensionLong')}>{t('pensionShort')}</th>
              <th className="px-3 py-2 text-right" title={t('uiEmployeeLong')}>{t('uiEmployeeShort')}</th>
              <th className="px-3 py-2 text-right">{t('exemptionShort')}</th>
              <th className="px-3 py-2 text-right">{t('incomeTax')}</th>
              <th className="px-3 py-2 text-right">{t('net')}</th>
              <th className="px-3 py-2 text-right">{t('socialTax')}</th>
              <th className="px-3 py-2 text-right" title={t('uiEmployerLong')}>{t('uiEmployerShort')}</th>
              <th className="px-3 py-2 text-right">{t('employerCost')}</th>
            </tr>
          </thead>
          <tbody>
            {run.lines.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-[var(--a-text-3)]">
                  <div>{t('noLines')}</div>
                  {isDraft && <div className="mt-1 text-[12.5px]">{t('noLinesHint')}</div>}
                </td>
              </tr>
            )}
            {run.lines.map((line) => (
              <tr key={line.id} onClick={() => setEditing(line)} className="cursor-pointer border-b border-[var(--a-border)] hover:bg-[var(--a-surface-2)]">
                <td className="px-3 py-2">
                  <div className="font-medium text-[var(--a-text)]">{line.employee_name ?? '—'}</div>
                  <div className="text-[11.5px] text-[var(--a-text-3)]">
                    {line.contract_type ? t(`contractType.${line.contract_type}`) : line.payment_type}
                    {line.contract_title ? ` · ${line.contract_title}` : ''}
                    {line.gross_sick > 0 ? ` · ${t('kind.sick')} ${money(line.gross_sick)}` : ''}
                    {line.min_base_increase > 0 ? ` · ${t('minBaseApplied')}` : ''}
                  </div>
                </td>
                <Num value={line.gross_wage + line.gross_sick} strong />
                <Num value={line.pension} />
                <Num value={line.unemployment_employee} />
                <Num value={line.exemption_used} muted />
                <Num value={line.income_tax} />
                <Num value={line.net_pay} strong />
                <Num value={line.social_tax} />
                <Num value={line.unemployment_employer} />
                <Num value={line.employer_cost} />
              </tr>
            ))}
          </tbody>
          {run.lines.length > 0 && (
            <tfoot>
              <tr className="border-t-2 border-[var(--a-border)] font-semibold">
                <td className="px-3 py-2">{t('total')}</td>
                <Num value={tt.gross_wage + tt.gross_sick} />
                <Num value={tt.pension} />
                <Num value={tt.unemployment_employee} />
                <Num value={tt.exemption_used} muted />
                <Num value={tt.income_tax} />
                <Num value={tt.net_pay} />
                <Num value={tt.social_tax} />
                <Num value={tt.unemployment_employer} />
                <Num value={tt.employer_cost} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {isDraft && <p className="mt-2 text-[12px] text-[var(--a-text-3)]">{t('editHint')}</p>}

      {editing && (
        <LineDialog
          line={editing}
          editable={isDraft}
          onClose={() => setEditing(null)}
          onSave={async (payload) => {
            const updated = await payrollApi.updateLine(run.id, editing.id, payload);
            setRun(updated);
            setEditing(null);
          }}
          onRemove={async () => {
            const updated = await payrollApi.removeLine(run.id, editing.id);
            setRun(updated);
            setEditing(null);
          }}
        />
      )}
      {adding && (
        <AddLineDialog
          run={run}
          onClose={() => setAdding(false)}
          onAdd={async (contractId) => {
            setRun(await payrollApi.addLine(run.id, contractId));
            setAdding(false);
          }}
        />
      )}
      {paying && (
        <PaymentDialog
          runId={run.id}
          onClose={() => setPaying(false)}
          onDone={() => {
            setPaying(false);
            setNotice(t('paymentsCreated'));
            load();
          }}
        />
      )}
      {cancelling && (
        <CancelDialog
          posted={run.status === 'posted'}
          onClose={() => setCancelling(false)}
          onConfirm={async (reason) => {
            setRun(await payrollApi.cancel(run.id, reason));
            setCancelling(false);
          }}
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[10px] border border-[var(--a-border)] bg-[var(--a-surface)] px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-[var(--a-text-3)]">{label}</div>
      <div className="font-mono text-[16px] font-semibold tabular-nums text-[var(--a-text)]">{money(value)}</div>
    </div>
  );
}

function Num({ value, strong, muted }: { value: number; strong?: boolean; muted?: boolean }) {
  return (
    <td className={`px-3 py-2 text-right font-mono tabular-nums ${strong ? 'font-semibold text-[var(--a-text)]' : muted ? 'text-[var(--a-text-3)]' : 'text-[var(--a-text-2)]'}`}>
      {money(value)}
    </td>
  );
}

function Modal({ title, onClose, children, footer, wide }: { title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode; wide?: boolean }) {
  const t = useTranslations('payroll');
  return (
    <div className="fixed inset-0 z-50 grid items-end bg-black/30 p-0 sm:place-items-center sm:p-4" onPointerDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={`flex max-h-[92dvh] w-full ${wide ? 'max-w-2xl' : 'max-w-md'} flex-col rounded-t-xl border border-[var(--a-border)] bg-[var(--a-surface)] shadow-xl sm:max-h-[90dvh] sm:rounded-xl`}>
        <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--a-border)] px-4 py-3">
          <div className="text-[15px] font-semibold text-[var(--a-text)]">{title}</div>
          <button type="button" onClick={onClose} aria-label={t('cancel')} className="grid h-8 w-8 place-items-center rounded-md text-[var(--a-text-3)] hover:bg-[var(--a-surface-2)]"><X className="h-4 w-4" /></button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 text-[13px]">{children}</div>
        <div className="flex flex-shrink-0 items-center justify-between gap-2 border-t border-[var(--a-border)] px-4 py-3">{footer}</div>
      </div>
    </div>
  );
}

type ItemDraft = {
  kind: EarningKind;
  description: string;
  amount: string;
  hours: string;
  /** Generated fields, kept until the item is edited by hand. */
  origin: Pick<EarningItem, 'auto' | 'absence_id' | 'days' | 'daily_rate'>;
};

function LineDialog({
  line,
  editable,
  onClose,
  onSave,
  onRemove,
}: {
  line: PayrollLine;
  editable: boolean;
  onClose: () => void;
  onSave: (payload: { items: EarningItem[]; apply_min_social_tax: boolean; exemption_override: number | null }) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const t = useTranslations('payroll');
  const [items, setItems] = useState<ItemDraft[]>(
    line.items.map((item) => ({
      kind: item.kind,
      description: item.description ?? '',
      amount: String(item.amount),
      hours: item.hours ? String(item.hours) : '',
      origin: { auto: item.auto, absence_id: item.absence_id, days: item.days, daily_rate: item.daily_rate },
    }))
  );
  const [applyMin, setApplyMin] = useState(line.apply_min_social_tax);
  const [override, setOverride] = useState(line.exemption_override === null ? '' : String(line.exemption_override));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const kinds = line.payment_type === '10' ? KINDS : KINDS.filter((k) => k !== 'sick');

  // Editing a generated item makes it manual, so rebuilding from absences leaves it alone.
  const update = (index: number, patch: Partial<ItemDraft>) =>
    setItems((list) => list.map((item, i) => (i === index ? { ...item, ...patch, origin: { ...item.origin, auto: false } } : item)));
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(getErrorMessage(err));
      setBusy(false);
    }
  };
  const total = items.reduce((sum, item) => sum + parseAmount(item.amount), 0);
  const input = 'h-8 w-full rounded-md border border-[var(--a-border)] bg-[var(--a-bg)] px-2 text-[13px] disabled:opacity-60';

  return (
    <Modal
      wide
      title={`${line.employee_name ?? ''}${line.contract_title ? ` · ${line.contract_title}` : ''}`}
      onClose={onClose}
      footer={
        editable ? (
          <>
            <button type="button" disabled={busy} onClick={() => void run(onRemove)} className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-[13px] text-[var(--a-neg)] hover:bg-[var(--a-neg-soft)]">
              <Trash2 className="h-3.5 w-3.5" />
              {t('removeLine')}
            </button>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="h-9 rounded-md border border-[var(--a-border)] px-3 text-[13px]">{t('cancel')}</button>
              <button
                type="button"
                disabled={busy}
                className={primary}
                onClick={() =>
                  void run(() =>
                    onSave({
                      items: items.map((item) => ({
                        ...item.origin,
                        kind: item.kind,
                        description: item.description.trim() || null,
                        amount: parseAmount(item.amount),
                        hours: item.hours.trim() === '' ? null : parseAmount(item.hours),
                      })),
                      apply_min_social_tax: applyMin,
                      exemption_override: override.trim() === '' ? null : parseAmount(override),
                    })
                  )
                }
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {t('saveAndRecalculate')}
              </button>
            </div>
          </>
        ) : (
          <div className="flex w-full justify-end">
            <button type="button" onClick={onClose} className="h-9 rounded-md border border-[var(--a-border)] px-3 text-[13px]">{t('close')}</button>
          </div>
        )
      }
    >
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--a-text-3)]">
            <th className="pb-1 pr-2">{t('itemKind')}</th>
            <th className="pb-1 pr-2">{t('itemDescription')}</th>
            <th className="w-20 pb-1 pr-2 text-right">{t('hours')}</th>
            <th className="w-28 pb-1 text-right">{t('amount')}</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index}>
              <td className="py-1 pr-2">
                <select disabled={!editable} value={item.kind} onChange={(e) => update(index, { kind: e.target.value as EarningKind })} className={input}>
                  {kinds.map((kind) => (
                    <option key={kind} value={kind}>{t(`kind.${kind}`)}</option>
                  ))}
                </select>
              </td>
              <td className="py-1 pr-2">
                <div className="flex items-center gap-1">
                  {item.origin.auto && <span title={t('autoItem')}><Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-[var(--a-accent)]" /></span>}
                  <input disabled={!editable} value={item.description} onChange={(e) => update(index, { description: e.target.value })} className={input} />
                </div>
              </td>
              <td className="py-1 pr-2">
                <input disabled={!editable} value={item.hours} onChange={(e) => update(index, { hours: e.target.value })} inputMode="decimal" className={`${input} text-right font-mono`} />
              </td>
              <td className="py-1">
                <input disabled={!editable} value={item.amount} onChange={(e) => update(index, { amount: e.target.value })} inputMode="decimal" className={`${input} text-right font-mono`} />
              </td>
              <td className="py-1 pl-1">
                {editable && (
                  <button type="button" onClick={() => setItems((list) => list.filter((_, i) => i !== index))} aria-label={t('delete')} className="grid h-8 w-8 place-items-center rounded-md text-[var(--a-text-3)] hover:bg-[var(--a-surface-2)]">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={3} className="pt-2">
              {editable && (
                <button type="button" onClick={() => setItems((list) => [...list, { kind: 'bonus', description: '', amount: '', hours: '', origin: {} }])} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--a-accent)]">
                  <Plus className="h-3.5 w-3.5" />
                  {t('addItem')}
                </button>
              )}
            </td>
            <td className="pt-2 text-right font-mono font-semibold tabular-nums">{money(total)}</td>
            <td />
          </tr>
        </tbody>
      </table>
      <p className="text-[11.5px] text-[var(--a-text-3)]">{t('itemsHint')}</p>

      <div className="space-y-2 rounded-lg bg-[var(--a-surface-2)] p-3">
        {line.payment_type === '10' && !line.pension_age && (
          <label className="flex items-start gap-2">
            <input type="checkbox" disabled={!editable} checked={applyMin} onChange={(e) => setApplyMin(e.target.checked)} className="mt-0.5" />
            <span>
              {t('applyMinSocialTax')}
              <span className="block text-[11.5px] text-[var(--a-text-3)]">{t('applyMinSocialTaxLineHint')}</span>
            </span>
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium text-[var(--a-text-2)]">{t('exemptionOverride')}</span>
          <input disabled={!editable} value={override} onChange={(e) => setOverride(e.target.value)} placeholder={t('exemptionOverridePlaceholder')} inputMode="decimal" className={`${input} max-w-[180px] text-right font-mono`} />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12.5px] sm:grid-cols-3">
        <Figure label={t('gross')} value={line.gross_wage + line.gross_sick} />
        <Figure label={t('pensionLong')} value={line.pension} />
        <Figure label={t('uiEmployeeLong')} value={line.unemployment_employee} />
        <Figure label={t('exemptionUsed')} value={line.exemption_used} />
        <Figure label={t('incomeTax')} value={line.income_tax} />
        <Figure label={t('net')} value={line.net_pay} strong />
        <Figure label={t('socialTax')} value={line.social_tax} />
        <Figure label={t('uiEmployerLong')} value={line.unemployment_employer} />
        <Figure label={t('employerCost')} value={line.employer_cost} strong />
      </div>
      {editable && <p className="text-[11.5px] text-[var(--a-text-3)]">{t('figuresBeforeSave')}</p>}
      {error && <div className="rounded-lg bg-[var(--a-neg-soft)] px-3 py-2 text-[var(--a-neg)]">{error}</div>}
    </Modal>
  );
}

function Figure({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-2 border-b border-[var(--a-border)] py-1">
      <span className="text-[var(--a-text-3)]">{label}</span>
      <span className={`font-mono tabular-nums ${strong ? 'font-semibold text-[var(--a-text)]' : ''}`}>{money(value)}</span>
    </div>
  );
}

function AddLineDialog({ run, onClose, onAdd }: { run: PayrollRunDetail; onClose: () => void; onAdd: (contractId: string) => Promise<void> }) {
  const t = useTranslations('payroll');
  const [employees, setEmployees] = useState<PayrollEmployee[] | null>(null);
  const [contractId, setContractId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    payrollApi.employees().then(setEmployees).catch((err) => setError(getErrorMessage(err)));
  }, []);

  const options = useMemo(() => {
    const used = new Set(run.lines.map((line) => line.contract_id));
    return (employees || []).flatMap((employee) =>
      employee.contracts
        .filter((contract) => !used.has(contract.id))
        .map((contract) => ({ id: contract.id, label: `${employee.name} · ${t(`contractType.${contract.contract_type}`)}${contract.title ? ` · ${contract.title}` : ''}` }))
    );
  }, [employees, run.lines, t]);

  return (
    <Modal
      title={t('addLine')}
      onClose={onClose}
      footer={
        <div className="flex w-full justify-end gap-2">
          <button type="button" onClick={onClose} className="h-9 rounded-md border border-[var(--a-border)] px-3 text-[13px]">{t('cancel')}</button>
          <button
            type="button"
            disabled={!contractId || busy}
            className={primary}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await onAdd(contractId);
              } catch (err) {
                setError(getErrorMessage(err));
                setBusy(false);
              }
            }}
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {t('add')}
          </button>
        </div>
      }
    >
      {employees === null ? (
        <div className="text-[var(--a-text-3)]">{t('loading')}</div>
      ) : options.length === 0 ? (
        <div className="text-[var(--a-text-2)]">
          {t('noContractsToAdd')}{' '}
          <Link href="/payroll/employees" className="text-[var(--a-accent)] hover:underline">{t('employees')}</Link>
        </div>
      ) : (
        <select value={contractId} onChange={(e) => setContractId(e.target.value)} className="h-10 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-bg)] px-3">
          <option value="">—</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>{option.label}</option>
          ))}
        </select>
      )}
      {error && <div className="rounded-lg bg-[var(--a-neg-soft)] px-3 py-2 text-[var(--a-neg)]">{error}</div>}
    </Modal>
  );
}

function PaymentDialog({ runId, onClose, onDone }: { runId: string; onClose: () => void; onDone: () => void }) {
  const t = useTranslations('payroll');
  const [accounts, setAccounts] = useState<BankAccountRecord[]>([]);
  const [bankAccountId, setBankAccountId] = useState('');
  const [includeTaxes, setIncludeTaxes] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    bankingApi
      .listBankAccounts()
      .then((list) => {
        const active = list.filter((a) => a.is_active && a.iban);
        setAccounts(active);
        if (active.length === 1) setBankAccountId(active[0].id);
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  return (
    <Modal
      title={t('createPayments')}
      onClose={onClose}
      footer={
        <div className="flex w-full justify-end gap-2">
          <button type="button" onClick={onClose} className="h-9 rounded-md border border-[var(--a-border)] px-3 text-[13px]">{t('cancel')}</button>
          <button
            type="button"
            disabled={!bankAccountId || busy}
            className={primary}
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await payrollApi.createPaymentBatch(runId, { bank_account_id: bankAccountId, include_taxes: includeTaxes });
                onDone();
              } catch (err) {
                setError(getErrorMessage(err));
                setBusy(false);
              }
            }}
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {t('createBatch')}
          </button>
        </div>
      }
    >
      <p className="text-[12.5px] text-[var(--a-text-2)]">{t('paymentsHint')}</p>
      <label className="block">
        <span className="mb-1 block text-[12px] font-medium text-[var(--a-text-2)]">{t('bankAccount')}</span>
        <select value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)} className="h-10 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-bg)] px-3">
          <option value="">—</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name} · {a.iban}</option>
          ))}
        </select>
      </label>
      <label className="flex items-start gap-2">
        <input type="checkbox" checked={includeTaxes} onChange={(e) => setIncludeTaxes(e.target.checked)} className="mt-0.5" />
        <span>
          {t('includeTaxes')}
          <span className="block text-[11.5px] text-[var(--a-text-3)]">{t('includeTaxesHint')}</span>
        </span>
      </label>
      {error && <div className="rounded-lg bg-[var(--a-neg-soft)] px-3 py-2 text-[var(--a-neg)]">{error}</div>}
    </Modal>
  );
}

function CancelDialog({ posted, onClose, onConfirm }: { posted: boolean; onClose: () => void; onConfirm: (reason: string) => Promise<void> }) {
  const t = useTranslations('payroll');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Modal
      title={t('cancelRun')}
      onClose={onClose}
      footer={
        <div className="flex w-full justify-end gap-2">
          <button type="button" onClick={onClose} className="h-9 rounded-md border border-[var(--a-border)] px-3 text-[13px]">{t('back')}</button>
          <button
            type="button"
            disabled={busy}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[var(--a-neg)] px-3 text-[13px] font-semibold text-white disabled:opacity-50"
            onClick={async () => {
              setBusy(true);
              setError(null);
              try {
                await onConfirm(reason);
              } catch (err) {
                setError(getErrorMessage(err));
                setBusy(false);
              }
            }}
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {t('cancelRun')}
          </button>
        </div>
      }
    >
      <p className="text-[12.5px] text-[var(--a-text-2)]">{posted ? t('cancelPostedHint') : t('cancelHint')}</p>
      <label className="block">
        <span className="mb-1 block text-[12px] font-medium text-[var(--a-text-2)]">{t('reason')}</span>
        <input value={reason} onChange={(e) => setReason(e.target.value)} className="h-10 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-bg)] px-3" />
      </label>
      {error && <div className="rounded-lg bg-[var(--a-neg-soft)] px-3 py-2 text-[var(--a-neg)]">{error}</div>}
    </Modal>
  );
}
