'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Inbox, Loader2, X } from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';
import { payrollApi, type LeaveRequest, type VacationPayTiming } from '@/lib/api/payroll.api';
import { dateText } from './format';

/** Leave applications waiting for a decision — approve (creates the absence) or reject. */
export function LeaveRequestsPanel({ onDecided }: { onDecided: () => void }) {
  const t = useTranslations('payroll');
  const [data, setData] = useState<{ requests: LeaveRequest[]; can_approve: boolean } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<LeaveRequest | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    payrollApi.pendingLeave().then(setData).catch(() => setData({ requests: [], can_approve: false }));
  }, []);
  useEffect(load, [load]);

  if (!data || data.requests.length === 0) return null;

  const decide = async (id: string, action: () => Promise<unknown>) => {
    setBusyId(id);
    setError(null);
    try {
      await action();
      load();
      onDecided();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mb-4 rounded-[12px] border border-[var(--a-warn)] bg-[var(--a-surface)]">
      <div className="flex items-center gap-2 border-b border-[var(--a-border)] px-4 py-2.5">
        <Inbox className="h-4 w-4 text-[var(--a-warn)]" />
        <div className="text-[14px] font-semibold text-[var(--a-text)]">{t('leaveRequest.pendingTitle', { count: data.requests.length })}</div>
        {!data.can_approve && <span className="ml-auto text-[12px] text-[var(--a-text-3)]">{t('leaveRequest.notApprover')}</span>}
      </div>
      {error && <div className="mx-4 mt-2 rounded-lg bg-[var(--a-neg-soft)] px-3 py-2 text-[13px] text-[var(--a-neg)]">{error}</div>}
      <ul className="divide-y divide-[var(--a-border)]">
        {data.requests.map((r) => (
          <PendingRow
            key={r.id}
            request={r}
            busy={busyId === r.id}
            disabled={!data.can_approve || busyId !== null}
            onApprove={(timing) => void decide(r.id, () => payrollApi.approveLeave(r.id, { vacation_pay_timing: timing }))}
            onReject={() => setRejecting(r)}
          />
        ))}
      </ul>
      {rejecting && (
        <RejectDialog
          request={rejecting}
          onClose={() => setRejecting(null)}
          onConfirm={(note) => {
            const id = rejecting.id;
            setRejecting(null);
            void decide(id, () => payrollApi.rejectLeave(id, note));
          }}
        />
      )}
    </div>
  );
}

function PendingRow({
  request: r,
  busy,
  disabled,
  onApprove,
  onReject,
}: {
  request: LeaveRequest;
  busy: boolean;
  disabled: boolean;
  onApprove: (timing: VacationPayTiming | null) => void;
  onReject: () => void;
}) {
  const t = useTranslations('payroll');
  const [timing, setTiming] = useState<VacationPayTiming | null>(r.vacation_pay_timing ?? null);
  const after = r.balance && r.kind === 'vacation' ? Math.round((r.balance.balance - r.days) * 100) / 100 : null;
  return (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3 text-[13px]">
      <div className="min-w-[220px] flex-1">
        <div className="font-medium text-[var(--a-text)]">
          {r.employee_name} · {t(`leaveRequest.kind.${r.kind}`)}
        </div>
        <div className="text-[12.5px] text-[var(--a-text-2)]">
          <span className="font-mono">{dateText(r.start_date)}–{dateText(r.end_date)}</span> · {t('leaveRequest.days', { days: r.days })}
          {after !== null && <> · {t('leaveRequest.balanceAfter', { days: after })}</>}
        </div>
        {r.comment && <div className="text-[12.5px] text-[var(--a-text-3)]">„{r.comment}“</div>}
      </div>
      {r.kind === 'vacation' && (
        <select disabled={disabled} value={timing ?? 'before_leave'} onChange={(e) => setTiming(e.target.value as VacationPayTiming)} className="h-8 rounded-md border border-[var(--a-border)] bg-[var(--a-bg)] px-2 text-[12.5px]" title={t('absence.timing')}>
          <option value="before_leave">{t('absence.timingBeforeShort')}</option>
          <option value="with_salary">{t('absence.timingWithSalaryShort')}</option>
        </select>
      )}
      <div className="flex gap-2">
        <button type="button" disabled={disabled} onClick={onReject} className="inline-flex h-8 items-center gap-1 rounded-md border border-[var(--a-border)] px-2.5 text-[12.5px] font-medium text-[var(--a-text-2)] hover:bg-[var(--a-surface-2)] disabled:opacity-50">
          <X className="h-3.5 w-3.5" />
          {t('leaveRequest.reject')}
        </button>
        <button type="button" disabled={disabled} onClick={() => onApprove(r.kind === 'vacation' ? timing : null)} className="inline-flex h-8 items-center gap-1 rounded-md bg-[var(--a-accent)] px-2.5 text-[12.5px] font-semibold text-[var(--a-accent-on)] disabled:opacity-50">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          {t('leaveRequest.approve')}
        </button>
      </div>
    </li>
  );
}

function RejectDialog({ request, onClose, onConfirm }: { request: LeaveRequest; onClose: () => void; onConfirm: (note: string) => void }) {
  const t = useTranslations('payroll');
  const [note, setNote] = useState('');
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-xl border border-[var(--a-border)] bg-[var(--a-surface)] shadow-xl">
        <div className="border-b border-[var(--a-border)] px-4 py-3 text-[15px] font-semibold">{t('leaveRequest.rejectTitle', { name: request.employee_name ?? '' })}</div>
        <div className="space-y-2 px-4 py-4 text-[13px]">
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium text-[var(--a-text-2)]">{t('leaveRequest.rejectNote')}</span>
            <input value={note} onChange={(e) => setNote(e.target.value)} autoFocus className="h-9 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-bg)] px-2.5" />
          </label>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--a-border)] px-4 py-3">
          <button type="button" onClick={onClose} className="h-9 rounded-md border border-[var(--a-border)] px-3 text-[13px]">{t('cancel')}</button>
          <button type="button" onClick={() => onConfirm(note)} className="h-9 rounded-md bg-[var(--a-neg)] px-3 text-[13px] font-semibold text-white">{t('leaveRequest.reject')}</button>
        </div>
      </div>
    </div>
  );
}
