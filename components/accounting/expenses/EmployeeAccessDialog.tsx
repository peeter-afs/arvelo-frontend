'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, KeyRound, Loader2, Mail, X } from 'lucide-react';
import { accountingApi, type PartnerOption } from '@/lib/api/accounting.api';
import { getErrorMessage } from '@/lib/api/client';
import { employeeAccessApi, type EmployeeAccess } from '@/lib/api/me.api';

/**
 * Gives an employee self-service access (/minu): an e-mailed, passwordless invite. The employee
 * then signs in with a link or a passkey and enters expense reports themselves. Without a
 * `partner`, the dialog first asks who the employee is.
 */
export function EmployeeAccessDialog({ partner, onClose }: { partner?: { id: string; name: string } | null; onClose: () => void }) {
  const t = useTranslations('expenseReports.access');
  const [selected, setSelected] = useState<{ id: string; name: string } | null>(partner ?? null);
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [query, setQuery] = useState('');
  const [access, setAccess] = useState<EmployeeAccess | null>(null);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!partner) accountingApi.getPartners().then(setPartners).catch(() => {});
  }, [partner]);

  useEffect(() => {
    if (!selected) return;
    setAccess(null);
    employeeAccessApi.get(selected.id).then((loaded) => {
      setAccess(loaded);
      setEmail((current) => current || loaded.pending_invite?.email || loaded.members[0]?.email || '');
    }).catch((err) => setError(getErrorMessage(err)));
    accountingApi.getPartner(selected.id).then((loaded) => {
      if (loaded?.email) setEmail((current) => current || String(loaded.email));
    }).catch(() => {});
  }, [selected]);

  const matches = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('et');
    return needle ? partners.filter((p) => p.name.toLocaleLowerCase('et').includes(needle)).slice(0, 50) : [];
  }, [partners, query]);

  const invite = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await employeeAccessApi.invite(selected.id, email.trim());
      setNotice(result.mode === 'linked' ? t('linked', { email: result.email }) : result.emailSent === false ? t('inviteNotSent') : t('invited', { email: result.email }));
      setAccess(await employeeAccessApi.get(selected.id));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    if (!selected || !window.confirm(t('confirmRevoke', { name: selected.name }))) return;
    setBusy(true);
    setError(null);
    try {
      await employeeAccessApi.revoke(selected.id);
      setNotice(t('revoked'));
      setAccess(await employeeAccessApi.get(selected.id));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const hasAccess = Boolean(access && (access.members.length > 0 || access.pending_invite));
  const field = 'h-10 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-bg)] px-3 text-[13.5px]';

  return (
    <div className="fixed inset-0 z-50 grid items-end bg-black/30 p-0 sm:place-items-center sm:p-4" onPointerDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
      <div className="flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-xl border border-[var(--a-border)] bg-[var(--a-surface)] shadow-xl sm:max-h-[90dvh] sm:rounded-xl">
        <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--a-border)] px-4 py-3">
          <div className="text-[15px] font-semibold text-[var(--a-text)]">{t('title')}</div>
          <button type="button" onClick={onClose} aria-label={t('close')} className="grid h-9 w-9 place-items-center rounded-md text-[var(--a-text-3)] hover:bg-[var(--a-surface-2)] sm:h-8 sm:w-8"><X className="h-4 w-4" /></button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 text-[13px]">
          <p className="text-[var(--a-text-2)]">{t('intro')}</p>

          {!partner && (
            <label className="block">
              <span className="mb-1 block font-medium text-[var(--a-text-2)]">{t('employee')}</span>
              <input
                value={selected && !query ? selected.name : query}
                onChange={(event) => { setQuery(event.target.value); setSelected(null); setAccess(null); setEmail(''); setNotice(null); }}
                placeholder={t('employeePlaceholder')}
                className={field}
              />
              {query.trim() && !selected && (
                <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-[var(--a-border)]">
                  {matches.length === 0 && <div className="px-3 py-2 text-[var(--a-text-3)]">{t('noMatches')}</div>}
                  {matches.map((option) => (
                    <button key={option.id} type="button" onClick={() => { setSelected({ id: option.id, name: option.name }); setQuery(''); }} className="block w-full px-3 py-2.5 text-left hover:bg-[var(--a-surface-2)] sm:py-1.5">
                      {option.name}
                    </button>
                  ))}
                </div>
              )}
            </label>
          )}

          {selected && (
            <>
              {partner && <div className="font-medium text-[var(--a-text)]">{selected.name}</div>}
              {access === null ? (
                <div className="flex justify-center py-3"><Loader2 className="h-4 w-4 animate-spin text-[var(--a-text-3)]" /></div>
              ) : (
                <div className="space-y-1.5 rounded-lg bg-[var(--a-surface-2)] px-3 py-2.5">
                  {access.members.map((member) => (
                    <div key={member.user_id} className="flex items-center gap-2 text-[var(--a-text)]">
                      <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-[var(--a-pos)]" />
                      <span className="min-w-0 flex-1 truncate">{member.email}</span>
                      {member.has_passkey && <span title={t('hasPasskey')}><KeyRound className="h-3.5 w-3.5 text-[var(--a-text-3)]" /></span>}
                    </div>
                  ))}
                  {access.pending_invite && (
                    <div className="flex items-center gap-2 text-[var(--a-text-2)]">
                      <Mail className="h-4 w-4 flex-shrink-0 text-[var(--a-warn)]" />
                      <span className="min-w-0 flex-1 truncate">{t('pending', { email: access.pending_invite.email })}</span>
                    </div>
                  )}
                  {!hasAccess && <div className="text-[var(--a-text-3)]">{t('noAccess')}</div>}
                </div>
              )}
              <label className="block">
                <span className="mb-1 block font-medium text-[var(--a-text-2)]">{t('email')}</span>
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nimi@ettevote.ee" className={field} />
              </label>
            </>
          )}

          {notice && <div className="rounded-lg bg-[var(--a-pos-soft)] px-3 py-2 text-[var(--a-pos)]">{notice}</div>}
          {error && <div className="rounded-lg bg-[var(--a-neg-soft)] px-3 py-2 text-[var(--a-neg)]">{error}</div>}
        </div>
        <div className="flex flex-shrink-0 flex-wrap justify-end gap-2 border-t border-[var(--a-border)] px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3">
          {hasAccess && (
            <button type="button" disabled={busy} onClick={revoke} className="mr-auto h-9 rounded-lg px-2 text-[13px] text-[var(--a-neg)] disabled:opacity-50">{t('revoke')}</button>
          )}
          <button type="button" onClick={onClose} className="h-9 rounded-lg border border-[var(--a-border)] px-4 text-[13px] font-medium text-[var(--a-text-2)]">{t('close')}</button>
          <button type="button" disabled={!selected || !email.trim() || busy} onClick={invite} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--a-accent)] px-4 text-[13px] font-semibold text-[var(--a-accent-on)] disabled:opacity-50">
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {access?.pending_invite ? t('resend') : t('send')}
          </button>
        </div>
      </div>
    </div>
  );
}
