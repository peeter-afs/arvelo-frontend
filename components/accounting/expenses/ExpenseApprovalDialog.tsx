'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, X } from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';
import { expenseReportsApi, type ExpenseApprovalSettings } from '@/lib/api/cashExpense.api';

/**
 * Who approves expense reports and who gets the e-mail when an employee submits one.
 * Nobody ticked = the default (all bookkeepers approve; the approvers are notified).
 * Owner and admins can change it; others see it read-only.
 */
export function ExpenseApprovalDialog({ onClose, onSaved }: { onClose: () => void; onSaved?: (settings: ExpenseApprovalSettings) => void }) {
  const t = useTranslations('expenseReports.approval');
  const tRole = useTranslations('settings');
  const [settings, setSettings] = useState<ExpenseApprovalSettings | null>(null);
  const [approvers, setApprovers] = useState<string[]>([]);
  const [notify, setNotify] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    expenseReportsApi.approvalSettings().then((loaded) => {
      setSettings(loaded);
      setApprovers(loaded.approver_user_ids);
      setNotify(loaded.notify_user_ids);
    }).catch((err) => setError(getErrorMessage(err)));
  }, []);

  const roleLabel = (role: string) => ({ owner: tRole('roleOwner'), admin: tRole('roleAdmin'), accountant: tRole('roleAccountant') }[role] ?? role);
  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const readOnly = !settings?.can_manage || !settings.available;

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const saved = await expenseReportsApi.updateApprovalSettings({ approver_user_ids: approvers, notify_user_ids: notify });
      onSaved?.(saved);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
  };

  const section = (title: string, hint: string, selected: string[], setSelected: (next: string[]) => void) => (
    <fieldset className="space-y-1.5">
      <legend className="mb-1 font-semibold text-[var(--a-text)]">{title}</legend>
      <p className="mb-2 text-[12.5px] text-[var(--a-text-3)]">{hint}</p>
      {settings?.members.map((member) => (
        <label key={member.id} className={`flex min-h-[40px] items-center gap-3 rounded-lg px-2 ${readOnly ? '' : 'cursor-pointer hover:bg-[var(--a-surface-2)]'}`}>
          <input type="checkbox" className="h-4 w-4" checked={selected.includes(member.id)} disabled={readOnly} onChange={() => setSelected(toggle(selected, member.id))} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[var(--a-text)]">{member.name || member.email}</span>
            <span className="block truncate text-[12px] text-[var(--a-text-3)]">{member.email} · {roleLabel(member.role)}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );

  return (
    <div className="fixed inset-0 z-50 grid items-end bg-black/30 p-0 sm:place-items-center sm:p-4" onPointerDown={(event) => event.target === event.currentTarget && !saving && onClose()}>
      <div className="flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-xl border border-[var(--a-border)] bg-[var(--a-surface)] shadow-xl sm:max-h-[90dvh] sm:rounded-xl">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--a-border)] px-4 py-3">
          <div className="text-[15px] font-semibold text-[var(--a-text)]">{t('title')}</div>
          <button type="button" onClick={onClose} aria-label={t('close')} className="grid h-9 w-9 place-items-center rounded-md text-[var(--a-text-3)] hover:bg-[var(--a-surface-2)] sm:h-8 sm:w-8"><X className="h-4 w-4" /></button>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 text-[13px]">
          {!settings && !error && <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-[var(--a-text-3)]" /></div>}
          {settings && !settings.available && <div className="rounded-lg bg-[var(--a-warn-soft)] px-3 py-2 text-[var(--a-warn)]">{t('needsMigration')}</div>}
          {settings && settings.available && !settings.can_manage && <div className="rounded-lg bg-[var(--a-surface-2)] px-3 py-2 text-[var(--a-text-2)]">{t('readOnly')}</div>}
          {settings && section(t('approversTitle'), t('approversHint'), approvers, setApprovers)}
          {settings && section(t('notifyTitle'), t('notifyHint'), notify, setNotify)}
          {error && <div className="rounded-lg bg-[var(--a-neg-soft)] px-3 py-2 text-[var(--a-neg)]">{error}</div>}
        </div>
        <div className="flex flex-shrink-0 justify-end gap-2 border-t border-[var(--a-border)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3">
          <button type="button" onClick={onClose} className="h-9 rounded-lg border border-[var(--a-border)] px-4 text-[13px] font-medium text-[var(--a-text-2)]">{t('close')}</button>
          {!readOnly && (
            <button type="button" disabled={saving} onClick={save} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--a-accent)] px-4 text-[13px] font-semibold text-[var(--a-accent-on)] disabled:opacity-50">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t('save')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
