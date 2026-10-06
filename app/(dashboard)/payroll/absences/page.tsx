'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Banknote, CalendarOff, Loader2, Plus } from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';
import { payrollApi, type Absence, type PayrollEmployee, type VacationPayTiming } from '@/lib/api/payroll.api';
import { AbsenceDialog } from '@/components/payroll/AbsenceDialog';
import { dateText } from '@/components/payroll/format';

const KIND_TONE: Record<string, string> = {
  vacation: 'bg-[var(--a-pos-soft)] text-[var(--a-pos)]',
  sick: 'bg-[var(--a-warn-soft)] text-[var(--a-warn)]',
  unpaid: 'bg-[var(--a-surface-2)] text-[var(--a-text-2)]',
  other: 'bg-[var(--a-surface-2)] text-[var(--a-text-2)]',
};

export default function PayrollAbsencesPage() {
  return (
    <Suspense>
      <AbsencesView />
    </Suspense>
  );
}

function AbsencesView() {
  const t = useTranslations('payroll');
  const router = useRouter();
  const [year, setYear] = useState(new Date().getFullYear());
  const searchParams = useSearchParams();
  const [employeeFilter, setEmployeeFilter] = useState(searchParams.get('employee') ?? '');
  const [absences, setAbsences] = useState<Absence[] | null>(null);
  const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
  const [timing, setTiming] = useState<VacationPayTiming>('before_leave');
  const [editing, setEditing] = useState<Absence | 'new' | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    payrollApi.employees().then(setEmployees).catch(() => {});
    payrollApi.settings().then((s) => setTiming(s.vacation_pay_timing)).catch(() => {});
  }, []);

  const load = useCallback(() => {
    payrollApi
      .absences({ from: `${year}-01-01`, to: `${year}-12-31`, employee_id: employeeFilter || undefined })
      .then(setAbsences)
      .catch((err) => {
        setAbsences([]);
        setError(getErrorMessage(err));
      });
  }, [year, employeeFilter]);

  useEffect(load, [load]);

  const nameOf = useMemo(() => new Map(employees.map((e) => [e.id, e.name ?? '—'])), [employees]);

  const payout = async (absence: Absence) => {
    setBusyId(absence.id);
    setError(null);
    try {
      const run = await payrollApi.vacationPayout(absence.id);
      router.push(`/payroll/runs/${run.id}`);
    } catch (err) {
      setError(getErrorMessage(err));
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl py-4">
      <Link href="/payroll" className="mb-2 inline-flex items-center gap-1 text-[12.5px] text-[var(--a-text-3)] hover:text-[var(--a-text)]">
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('title')}
      </Link>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-[var(--a-text)]">{t('absences')}</h1>
          <p className="mt-1 text-[13px] text-[var(--a-text-2)]">{t('absencesSubtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} className="h-9 rounded-md border border-[var(--a-border)] bg-[var(--a-surface)] px-2 text-[13px]">
            <option value="">{t('allEmployees')}</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="h-9 rounded-md border border-[var(--a-border)] bg-[var(--a-surface)] px-2 text-[13px]">
            {[year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button type="button" onClick={() => setEditing('new')} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[var(--a-accent)] px-3 text-[13px] font-semibold text-[var(--a-accent-on)]">
            <Plus className="h-3.5 w-3.5" />
            {t('absence.add')}
          </button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-lg bg-[var(--a-neg-soft)] px-3 py-2 text-[13px] text-[var(--a-neg)]">{error}</div>}

      <div className="rounded-[12px] border border-[var(--a-border)] bg-[var(--a-surface)]">
        {absences === null ? (
          <div className="py-10 text-center text-[13px] text-[var(--a-text-3)]">{t('loading')}</div>
        ) : absences.length === 0 ? (
          <div className="py-12 text-center">
            <CalendarOff className="mx-auto h-7 w-7 text-[var(--a-text-3)]" />
            <p className="mt-2 text-[13.5px] text-[var(--a-text-2)]">{t('absence.empty')}</p>
          </div>
        ) : (
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[var(--a-border)] text-left text-[11px] uppercase tracking-wide text-[var(--a-text-3)]">
                <th className="px-4 py-2">{t('employee')}</th>
                <th className="px-4 py-2">{t('absence.kindLabel')}</th>
                <th className="px-4 py-2">{t('absence.period')}</th>
                <th className="hidden px-4 py-2 md:table-cell">{t('absence.details')}</th>
                <th className="px-4 py-2 text-right">{t('absence.payment')}</th>
              </tr>
            </thead>
            <tbody>
              {absences.map((a) => {
                const paid = (a.paid_in ?? []).filter((r) => r.status !== 'cancelled');
                const needsPayout = a.kind === 'vacation' && a.vacation_pay_timing === 'before_leave' && paid.length === 0;
                return (
                  <tr key={a.id} className="border-b border-[var(--a-border)] last:border-0 hover:bg-[var(--a-surface-2)]">
                    <td className="px-4 py-2">
                      <button type="button" onClick={() => setEditing(a)} className="text-left font-medium text-[var(--a-accent)] hover:underline">{nameOf.get(a.employee_id) ?? '—'}</button>
                    </td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${KIND_TONE[a.kind]}`}>{t(`absence.kind.${a.kind}`)}</span>
                    </td>
                    <td className="px-4 py-2 font-mono">{dateText(a.start_date)} – {dateText(a.end_date)}</td>
                    <td className="hidden px-4 py-2 text-[12.5px] text-[var(--a-text-2)] md:table-cell">
                      {a.kind === 'vacation' && (a.vacation_pay_timing === 'before_leave' ? t('absence.timingBeforeShort') : t('absence.timingWithSalaryShort'))}
                      {a.kind === 'sick' && `${t(`absence.sickCases.${a.sick_case ?? 'illness'}`)}${a.sick_certificate ? ` · ${a.sick_certificate}` : ''}`}
                      {a.source === 'application' && <span className="ml-1 text-[var(--a-text-3)]">· {t('absence.fromApplication')}</span>}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {paid.length > 0 ? (
                        <Link href={`/payroll/runs/${paid[0].run_id}`} className="text-[12.5px] text-[var(--a-accent)] hover:underline">
                          {t(`status.${paid[0].status}`)}
                        </Link>
                      ) : needsPayout ? (
                        <button type="button" disabled={busyId !== null} onClick={() => void payout(a)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--a-border)] px-2.5 text-[12.5px] font-medium text-[var(--a-text-2)] hover:bg-[var(--a-surface-2)] disabled:opacity-50">
                          {busyId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Banknote className="h-3.5 w-3.5" />}
                          {t('absence.payVacation')}
                        </button>
                      ) : (
                        <span className="text-[12px] text-[var(--a-text-3)]">{a.kind === 'vacation' || a.kind === 'sick' ? t('absence.withNextSalary') : '—'}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <p className="mt-2 text-[12px] text-[var(--a-text-3)]">{t('absence.listHint')}</p>

      {editing && (
        <AbsenceDialog
          absence={editing === 'new' ? null : editing}
          employees={employees}
          defaultEmployeeId={employeeFilter || undefined}
          defaultTiming={timing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}
