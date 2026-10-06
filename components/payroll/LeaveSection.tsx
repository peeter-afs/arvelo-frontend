'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CalendarPlus, Loader2, Palmtree, X } from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';
import { meApi } from '@/lib/api/me.api';
import type { LeaveKind, LeaveOverview, LeaveStatus, VacationPayTiming } from '@/lib/api/payroll.api';
import { dateText, daysText } from './format';
import { vacationDays } from './holidays';

const STATUS_TONE: Record<LeaveStatus, string> = {
  submitted: 'bg-[var(--a-warn-soft)] text-[var(--a-warn)]',
  approved: 'bg-[var(--a-pos-soft)] text-[var(--a-pos)]',
  rejected: 'bg-[var(--a-neg-soft)] text-[var(--a-neg)]',
  cancelled: 'bg-[var(--a-surface-2)] text-[var(--a-text-3)]',
};

const card = 'rounded-[14px] border border-[var(--a-border)] bg-[var(--a-surface)]';
const field = 'h-11 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-bg)] px-3 text-[16px] text-[var(--a-text)]';

/** Employee self-service: holiday balance, applying for leave, own applications. */
export function LeaveSection() {
  const t = useTranslations('payroll');
  const [data, setData] = useState<LeaveOverview | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [applying, setApplying] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    meApi
      .leave()
      .then(setData)
      .catch(() => setUnavailable(true));
  }, []);

  useEffect(load, [load]);

  // Not a payroll employee in this company (or no payroll): the section stays hidden.
  if (unavailable || !data || !data.employment) return null;

  const balance = data.balances[0];
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = data.absences.filter((a) => a.end_date >= today).sort((a, b) => a.start_date.localeCompare(b.start_date));

  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-[17px] font-semibold text-[var(--a-text)]">{t('leaveRequest.title')}</h2>
        <button type="button" onClick={() => setApplying(true)} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[var(--a-accent)] px-3 text-[14px] font-semibold text-[var(--a-accent-on)]">
          <CalendarPlus className="h-4 w-4" />
          {t('leaveRequest.apply')}
        </button>
      </div>

      {balance && (
        <div className={`${card} mb-3 flex items-center gap-3 px-4 py-3`}>
          <Palmtree className="h-5 w-5 flex-shrink-0 text-[var(--a-accent)]" />
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold text-[var(--a-text)]">{t('leaveRequest.balance', { days: daysText(balance.balance) })}</div>
            <div className="text-[12.5px] text-[var(--a-text-3)]">
              {t('leaveRequest.balanceHint', { annual: balance.annual_days })}
              {balance.planned > 0 ? ` · ${t('leave.planned', { days: daysText(balance.planned) })}` : ''}
            </div>
          </div>
        </div>
      )}

      {error && <div className="mb-3 rounded-lg bg-[var(--a-neg-soft)] px-3 py-2 text-[13px] text-[var(--a-neg)]">{error}</div>}

      {(data.requests.length > 0 || upcoming.length > 0) && (
        <ul className={`${card} divide-y divide-[var(--a-border)] overflow-hidden`}>
          {data.requests
            .filter((r) => r.status !== 'approved' || r.end_date >= today)
            .map((r) => (
              <li key={r.id} className="flex items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[14.5px] font-medium text-[var(--a-text)]">
                    {t(`leaveRequest.kind.${r.kind}`)} · <span className="font-mono">{dateText(r.start_date)}–{dateText(r.end_date)}</span>
                  </div>
                  <div className="text-[12.5px] text-[var(--a-text-3)]">
                    {t('leaveRequest.days', { days: r.days })}
                    {r.kind === 'vacation' && r.vacation_pay_timing ? ` · ${t(r.vacation_pay_timing === 'before_leave' ? 'absence.timingBeforeShort' : 'absence.timingWithSalaryShort')}` : ''}
                  </div>
                  {r.decision_note && <div className="mt-0.5 text-[12.5px] text-[var(--a-text-2)]">„{r.decision_note}“</div>}
                </div>
                <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                  <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-medium ${STATUS_TONE[r.status]}`}>{t(`leaveRequest.status.${r.status}`)}</span>
                  {r.status === 'submitted' && (
                    <button
                      type="button"
                      disabled={busyId !== null}
                      onClick={async () => {
                        setBusyId(r.id);
                        setError(null);
                        try {
                          await meApi.cancelLeave(r.id);
                          load();
                        } catch (err) {
                          setError(getErrorMessage(err));
                        } finally {
                          setBusyId(null);
                        }
                      }}
                      className="text-[12.5px] font-medium text-[var(--a-text-2)] underline disabled:opacity-50"
                    >
                      {busyId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t('leaveRequest.withdraw')}
                    </button>
                  )}
                </div>
              </li>
            ))}
          {upcoming
            .filter((a) => !data.requests.some((r) => r.absence_id === a.id))
            .map((a) => (
              <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[14.5px] font-medium text-[var(--a-text)]">
                    {t(`leaveRequest.kind.${a.kind === 'unpaid' ? 'unpaid' : 'vacation'}`)} · <span className="font-mono">{dateText(a.start_date)}–{dateText(a.end_date)}</span>
                  </div>
                  <div className="text-[12.5px] text-[var(--a-text-3)]">{t('leaveRequest.days', { days: a.days })}</div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-medium ${STATUS_TONE.approved}`}>{t('leaveRequest.status.approved')}</span>
              </li>
            ))}
        </ul>
      )}

      {applying && (
        <ApplyDialog
          defaultTiming={data.default_timing}
          balance={balance?.balance ?? null}
          onClose={() => setApplying(false)}
          onDone={() => {
            setApplying(false);
            load();
          }}
        />
      )}
    </section>
  );
}

function ApplyDialog({ defaultTiming, balance, onClose, onDone }: { defaultTiming: VacationPayTiming; balance: number | null; onClose: () => void; onDone: () => void }) {
  const t = useTranslations('payroll');
  const [kind, setKind] = useState<LeaveKind>('vacation');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [timing, setTiming] = useState<VacationPayTiming>(defaultTiming);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const days = vacationDays(start, end);
  const after = balance !== null && kind === 'vacation' ? Math.round((balance - days) * 100) / 100 : null;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await meApi.applyLeave({ kind, start_date: start, end_date: end, vacation_pay_timing: kind === 'vacation' ? timing : null, comment: comment.trim() || null });
      onDone();
    } catch (err) {
      setError(getErrorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid items-end bg-black/30 sm:place-items-center sm:p-4" onPointerDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-2xl border border-[var(--a-border)] bg-[var(--a-surface)] shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-[var(--a-border)] px-4 py-3">
          <div className="text-[16px] font-semibold text-[var(--a-text)]">{t('leaveRequest.apply')}</div>
          <button type="button" onClick={onClose} aria-label={t('cancel')} className="grid h-10 w-10 place-items-center rounded-md text-[var(--a-text-3)]"><X className="h-5 w-5" /></button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 text-[14px]">
          <div className="grid grid-cols-2 gap-2">
            {(['vacation', 'unpaid'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`h-11 rounded-lg border text-[14px] font-medium ${kind === k ? 'border-[var(--a-accent)] bg-[var(--a-surface-2)] text-[var(--a-text)]' : 'border-[var(--a-border)] text-[var(--a-text-2)]'}`}
              >
                {t(`leaveRequest.kind.${k}`)}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1 block text-[13px] font-medium text-[var(--a-text-2)]">{t('startDate')}</span>
              <input type="date" value={start} onChange={(e) => { setStart(e.target.value); if (!end || end < e.target.value) setEnd(e.target.value); }} className={field} />
            </label>
            <label className="block">
              <span className="mb-1 block text-[13px] font-medium text-[var(--a-text-2)]">{t('endDate')}</span>
              <input type="date" min={start || undefined} value={end} onChange={(e) => setEnd(e.target.value)} className={field} />
            </label>
          </div>
          {days > 0 && (
            <div className="rounded-lg bg-[var(--a-surface-2)] px-3 py-2 text-[13.5px] text-[var(--a-text-2)]">
              {t('leaveRequest.days', { days })}
              {after !== null && <> · {t('leaveRequest.balanceAfter', { days: daysText(after) })}</>}
              {after !== null && after < 0 && <div className="mt-0.5 text-[12.5px] text-[var(--a-warn)]">{t('leaveRequest.overBalance')}</div>}
            </div>
          )}
          {kind === 'vacation' && (
            <fieldset className="space-y-2">
              <legend className="mb-1 text-[13px] font-medium text-[var(--a-text-2)]">{t('absence.timing')}</legend>
              {(['before_leave', 'with_salary'] as const).map((v) => (
                <label key={v} className={`flex items-start gap-2 rounded-lg border px-3 py-2.5 ${timing === v ? 'border-[var(--a-accent)]' : 'border-[var(--a-border)]'}`}>
                  <input type="radio" name="timing" checked={timing === v} onChange={() => setTiming(v)} className="mt-1" />
                  <span>
                    <span className="block font-medium text-[var(--a-text)]">{t(v === 'before_leave' ? 'absence.timingBefore' : 'absence.timingWithSalary')}</span>
                    <span className="block text-[12.5px] text-[var(--a-text-3)]">{t(v === 'before_leave' ? 'leaveRequest.timingBeforeHint' : 'leaveRequest.timingWithSalaryHint')}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}
          <label className="block">
            <span className="mb-1 block text-[13px] font-medium text-[var(--a-text-2)]">{t('leaveRequest.comment')}</span>
            <input value={comment} onChange={(e) => setComment(e.target.value)} className={field} />
          </label>
          {error && <div className="rounded-lg bg-[var(--a-neg-soft)] px-3 py-2 text-[13px] text-[var(--a-neg)]">{error}</div>}
        </div>
        <div className="border-t border-[var(--a-border)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button type="button" disabled={busy || days === 0} onClick={() => void submit()} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[var(--a-accent)] text-[15px] font-semibold text-[var(--a-accent-on)] disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('leaveRequest.submit')}
          </button>
        </div>
      </div>
    </div>
  );
}
