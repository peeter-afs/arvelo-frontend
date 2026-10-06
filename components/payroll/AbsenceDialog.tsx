'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Trash2, X } from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';
import {
  payrollApi,
  type Absence,
  type AbsenceInput,
  type AbsenceKind,
  type AbsencePreview,
  type PayrollEmployee,
  type SickCase,
  type VacationPayTiming,
} from '@/lib/api/payroll.api';
import { dateText, money, parseAmount } from './format';

const field = 'h-9 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-bg)] px-2.5 text-[13px] disabled:opacity-60';
const label = 'mb-1 block text-[12px] font-medium text-[var(--a-text-2)]';

/** Add or edit an absence; shows what it pays as the dates change. */
export function AbsenceDialog({
  absence,
  employees,
  defaultEmployeeId,
  defaultTiming,
  onClose,
  onSaved,
}: {
  absence: Absence | null;
  employees: PayrollEmployee[];
  defaultEmployeeId?: string;
  defaultTiming: VacationPayTiming;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations('payroll');
  const locked = Boolean(absence?.paid_in?.some((r) => r.status !== 'draft'));
  const [employeeId, setEmployeeId] = useState(absence?.employee_id ?? defaultEmployeeId ?? '');
  const [contractId, setContractId] = useState(absence?.contract_id ?? '');
  const [kind, setKind] = useState<AbsenceKind>(absence?.kind ?? 'vacation');
  const [start, setStart] = useState(absence?.start_date ?? '');
  const [end, setEnd] = useState(absence?.end_date ?? '');
  const [timing, setTiming] = useState<VacationPayTiming>(absence?.vacation_pay_timing ?? defaultTiming);
  const [sickCase, setSickCase] = useState<SickCase>(absence?.sick_case ?? 'illness');
  const [certificate, setCertificate] = useState(absence?.sick_certificate ?? '');
  const [override, setOverride] = useState(absence?.average_daily_override == null ? '' : String(absence.average_daily_override));
  const [notes, setNotes] = useState(absence?.notes ?? '');
  const [preview, setPreview] = useState<AbsencePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const employee = employees.find((e) => e.id === employeeId);
  const employmentContracts = useMemo(() => (employee?.contracts ?? []).filter((c) => c.contract_type === 'employment'), [employee]);

  const payload = useMemo<AbsenceInput | null>(() => {
    if (!employeeId || !start || !end || end < start) return null;
    return {
      employee_id: employeeId,
      contract_id: contractId || null,
      kind,
      start_date: start,
      end_date: end,
      vacation_pay_timing: kind === 'vacation' ? timing : null,
      sick_case: kind === 'sick' ? sickCase : null,
      sick_certificate: kind === 'sick' ? certificate.trim() || null : null,
      average_daily_override: override.trim() === '' ? null : parseAmount(override),
      notes: notes.trim() || null,
    };
  }, [employeeId, contractId, kind, start, end, timing, sickCase, certificate, override, notes]);

  useEffect(() => {
    if (!payload || (kind !== 'vacation' && kind !== 'sick')) return;
    const timer = setTimeout(() => {
      payrollApi.previewAbsence(payload).then(setPreview).catch(() => setPreview(null));
    }, 350);
    return () => clearTimeout(timer);
  }, [payload, kind]);

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      onSaved();
    } catch (err) {
      setError(getErrorMessage(err));
      setBusy(false);
    }
  };

  // A preview only stands for the current input when it can be priced at all.
  const shown = payload && (kind === 'vacation' || kind === 'sick') ? preview : null;
  const avg = shown?.average;
  return (
    <div className="fixed inset-0 z-[60] grid items-end bg-black/30 p-0 sm:place-items-center sm:p-4" onPointerDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
      <div className="flex max-h-[92dvh] w-full max-w-xl flex-col rounded-t-xl border border-[var(--a-border)] bg-[var(--a-surface)] shadow-xl sm:max-h-[90dvh] sm:rounded-xl">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--a-border)] px-4 py-3">
          <div className="text-[15px] font-semibold text-[var(--a-text)]">{absence ? t('absence.edit') : t('absence.add')}</div>
          <button type="button" onClick={onClose} aria-label={t('cancel')} className="grid h-8 w-8 place-items-center rounded-md text-[var(--a-text-3)] hover:bg-[var(--a-surface-2)]"><X className="h-4 w-4" /></button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 text-[13px]">
          {locked && <div className="rounded-lg bg-[var(--a-warn-soft)] px-3 py-2 text-[12.5px] text-[var(--a-warn)]">{t('absence.locked')}</div>}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className={label}>{t('employee')}</span>
              <select disabled={locked || Boolean(absence)} value={employeeId} onChange={(e) => { setEmployeeId(e.target.value); setContractId(''); }} className={field}>
                <option value="">—</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </label>
            {employmentContracts.length > 1 && (
              <label className="block sm:col-span-2">
                <span className={label}>{t('absence.contract')}</span>
                <select disabled={locked} value={contractId} onChange={(e) => setContractId(e.target.value)} className={field}>
                  <option value="">{t('absence.anyContract')}</option>
                  {employmentContracts.map((c) => (
                    <option key={c.id} value={c.id}>{c.title || t('contractType.employment')} · {dateText(c.start_date)}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="block">
              <span className={label}>{t('absence.kindLabel')}</span>
              <select disabled={locked} value={kind} onChange={(e) => setKind(e.target.value as AbsenceKind)} className={field}>
                {(['vacation', 'sick', 'unpaid', 'other'] as const).map((k) => (
                  <option key={k} value={k}>{t(`absence.kind.${k}`)}</option>
                ))}
              </select>
            </label>
            <div />
            <label className="block">
              <span className={label}>{t('startDate')}</span>
              <input disabled={locked} type="date" value={start} onChange={(e) => { setStart(e.target.value); if (!end || end < e.target.value) setEnd(e.target.value); }} className={field} />
            </label>
            <label className="block">
              <span className={label}>{t('endDate')}</span>
              <input disabled={locked} type="date" min={start || undefined} value={end} onChange={(e) => setEnd(e.target.value)} className={field} />
            </label>
            {kind === 'vacation' && (
              <label className="block sm:col-span-2">
                <span className={label}>{t('absence.timing')}</span>
                <select disabled={locked} value={timing} onChange={(e) => setTiming(e.target.value as VacationPayTiming)} className={field}>
                  <option value="before_leave">{t('absence.timingBefore')}</option>
                  <option value="with_salary">{t('absence.timingWithSalary')}</option>
                </select>
                <span className="mt-1 block text-[11.5px] text-[var(--a-text-3)]">{t('absence.timingHint')}</span>
              </label>
            )}
            {kind === 'sick' && (
              <>
                <label className="block">
                  <span className={label}>{t('absence.sickCase')}</span>
                  <select disabled={locked} value={sickCase} onChange={(e) => setSickCase(e.target.value as SickCase)} className={field}>
                    {(['illness', 'work_accident', 'pregnancy', 'other'] as const).map((c) => (
                      <option key={c} value={c}>{t(`absence.sickCases.${c}`)}</option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className={label}>{t('absence.certificate')}</span>
                  <input disabled={locked} value={certificate} onChange={(e) => setCertificate(e.target.value)} className={`${field} font-mono`} />
                </label>
              </>
            )}
            {(kind === 'vacation' || kind === 'sick') && (
              <label className="block">
                <span className={label}>{t('absence.averageOverride')}</span>
                <input disabled={locked} value={override} onChange={(e) => setOverride(e.target.value)} placeholder={t('absence.averageAuto')} inputMode="decimal" className={`${field} text-right font-mono`} />
              </label>
            )}
            <label className="block sm:col-span-2">
              <span className={label}>{t('absence.notes')}</span>
              <input disabled={locked} value={notes} onChange={(e) => setNotes(e.target.value)} className={field} />
            </label>
          </div>

          {shown && (
            <div className="space-y-1 rounded-lg bg-[var(--a-surface-2)] p-3 text-[12.5px]">
              {kind === 'vacation' ? (
                <Row label={t('absence.vacationDays')} value={String(shown.days)} />
              ) : (
                <>
                  <Row label={t('absence.sickDays')} value={String(shown.days)} />
                  <Row label={t('absence.employerDays', { first: shown.sick_rule?.firstDay ?? 4, last: shown.sick_rule?.lastDay ?? 8 })} value={String(shown.employer_days ?? 0)} />
                </>
              )}
              {avg && (
                <Row
                  label={t(`absence.averageSource.${avg.source}`)}
                  value={`${money(avg.daily)} €`}
                  hint={avg.source === 'history' ? t('absence.averageHint', { wages: money(avg.wages), days: avg.calendar_days, from: dateText(avg.window_start), to: dateText(avg.window_end) }) : undefined}
                />
              )}
              {shown.manual ? (
                <div className="text-[var(--a-warn)]">{t('absence.sickManual')}</div>
              ) : (
                <Row label={kind === 'vacation' ? t('absence.vacationPay') : t('absence.sickPay', { rate: Math.round((shown.sick_rule?.rate ?? 0.7) * 100) })} value={`${money(shown.amount)} €`} strong />
              )}
            </div>
          )}
          {error && <div className="rounded-lg bg-[var(--a-neg-soft)] px-3 py-2 text-[var(--a-neg)]">{error}</div>}
        </div>
        <div className="flex flex-shrink-0 items-center justify-between gap-2 border-t border-[var(--a-border)] px-4 py-3">
          <div>
            {absence && !locked && (
              <button type="button" disabled={busy} onClick={() => void run(() => payrollApi.deleteAbsence(absence.id))} className="inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-[13px] text-[var(--a-neg)] hover:bg-[var(--a-neg-soft)]">
                <Trash2 className="h-3.5 w-3.5" />
                {t('delete')}
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="h-9 rounded-md border border-[var(--a-border)] px-3 text-[13px]">{t('cancel')}</button>
            {!locked && (
              <button
                type="button"
                disabled={busy || !payload}
                onClick={() => payload && void run(() => (absence ? payrollApi.updateAbsence(absence.id, payload) : payrollApi.createAbsence(payload)))}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[var(--a-accent)] px-3 text-[13px] font-semibold text-[var(--a-accent-on)] disabled:opacity-50"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {t('save')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, hint, strong }: { label: string; value: string; hint?: string; strong?: boolean }) {
  return (
    <div>
      <div className={`flex justify-between gap-3 ${strong ? 'font-semibold text-[var(--a-text)]' : 'text-[var(--a-text-2)]'}`}>
        <span>{label}</span>
        <span className="font-mono tabular-nums">{value}</span>
      </div>
      {hint && <div className="text-[11.5px] text-[var(--a-text-3)]">{hint}</div>}
    </div>
  );
}
