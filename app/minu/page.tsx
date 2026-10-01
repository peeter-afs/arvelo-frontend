'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { startRegistration } from '@simplewebauthn/browser';
import { Camera, ChevronLeft, ChevronRight, KeyRound, Loader2, LogOut, Paperclip, Plus, ReceiptText, Send, Trash2, X } from 'lucide-react';
import apiClient, { getErrorMessage } from '@/lib/api/client';
import { authApi } from '@/lib/api/auth.api';
import { meApi, type SelfProfile } from '@/lib/api/me.api';
import type { ExpenseReport, ExpenseReportListItem } from '@/lib/api/cashExpense.api';
import type { ApiResponse } from '@/lib/types/auth.types';
import { useAuthStore } from '@/lib/stores/auth.store';
import { getIsoToday } from '@/lib/utils/date';
import { EXPENSE_STATUS_TONE } from '@/components/accounting/expenses/status';

const money = (value: number) => value.toLocaleString('et-EE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateText = (value: string) => value.split('-').reverse().join('.');
const VAT_RATES = [24, 22, 13, 9, 0];
const PASSKEY_DISMISSED_KEY = 'arvelo.passkeyOfferDismissed';

const card = 'rounded-[14px] border border-[var(--a-border)] bg-[var(--a-surface)]';
const field = 'h-11 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-bg)] px-3 text-[16px] text-[var(--a-text)]';
const primaryButton = 'inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--a-accent)] px-4 text-[14px] font-semibold text-[var(--a-accent-on)] disabled:opacity-50';
const secondaryButton = 'inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] px-4 text-[14px] font-medium text-[var(--a-text-2)] disabled:opacity-50';

export default function SelfServicePage() {
  const t = useTranslations('selfService');
  const router = useRouter();
  const { logout } = useAuthStore();
  const [profile, setProfile] = useState<SelfProfile | null>(null);
  const [reports, setReports] = useState<ExpenseReportListItem[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const me = await meApi.profile();
      setProfile(me);
      setReports(me.employee ? await meApi.listReports() : []);
    } catch (err) {
      setError(getErrorMessage(err));
      setReports([]);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const signOut = async () => {
    await authApi.logout();
    logout();
    router.push('/login');
  };

  const newReport = async () => {
    setCreating(true);
    setError(null);
    try {
      const report = await meApi.createReport();
      setOpenId(report.id);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[12px] font-medium uppercase tracking-wide text-[var(--a-text-3)]">{profile?.tenant.name ?? 'Arvelo'}</div>
          <div className="truncate text-[17px] font-semibold text-[var(--a-text)]">{profile?.employee?.name ?? profile?.user.name ?? profile?.user.email ?? ''}</div>
        </div>
        <button type="button" onClick={signOut} className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-[13px] text-[var(--a-text-2)] hover:bg-[var(--a-surface-2)]">
          <LogOut className="h-4 w-4" /> {t('signOut')}
        </button>
      </header>

      {profile && <PasskeyOffer hasPasskey={profile.has_passkey} onAdded={() => setProfile({ ...profile, has_passkey: true })} />}

      {error && <div className="mb-3 rounded-lg bg-[var(--a-neg-soft)] px-3 py-2 text-[13px] text-[var(--a-neg)]">{error}</div>}

      {openId ? (
        <ReportView
          id={openId}
          onBack={() => { setOpenId(null); void load(); }}
        />
      ) : !profile && error ? (
        <button type="button" onClick={() => { setError(null); setReports(null); void load(); }} className={`${secondaryButton} w-full`}>{t('retry')}</button>
      ) : reports === null ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[var(--a-text-3)]" /></div>
      ) : profile && !profile.employee ? (
        <div className={`${card} p-4 text-[14px] text-[var(--a-text-2)]`}>{t('notLinked')}</div>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-[20px] font-semibold text-[var(--a-text)]">{t('title')}</h1>
            <button type="button" onClick={newReport} disabled={creating} className={primaryButton}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {t('newReport')}
            </button>
          </div>
          {reports.length === 0 ? (
            <div className={`${card} px-4 py-10 text-center`}>
              <ReceiptText className="mx-auto h-8 w-8 text-[var(--a-text-3)]" />
              <p className="mt-2 text-[14px] text-[var(--a-text-2)]">{t('empty')}</p>
            </div>
          ) : (
            <ul className={`${card} divide-y divide-[var(--a-border)] overflow-hidden`}>
              {reports.map((report) => (
                <li key={report.id}>
                  <button type="button" onClick={() => setOpenId(report.id)} className="flex min-h-[64px] w-full items-center gap-3 px-4 py-3 text-left active:bg-[var(--a-surface-2)]">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14.5px] font-medium text-[var(--a-text)]">{report.description || report.report_number}</div>
                      <div className="text-[12.5px] text-[var(--a-text-3)]">
                        <span className="font-mono">{dateText(report.report_date)}</span> · {t('receiptCount', { count: report.receipt_count })}
                      </div>
                    </div>
                    <div className="flex flex-shrink-0 flex-col items-end gap-1">
                      <span className="font-mono text-[14.5px] font-semibold tabular-nums text-[var(--a-text)]">{money(report.total)} €</span>
                      <StatusBadge status={report.status} />
                    </div>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-[var(--a-text-3)]" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations('expenseReports');
  return <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-medium ${EXPENSE_STATUS_TONE[status]}`}>{t(`statusLabel.${status}`)}</span>;
}

/**
 * Offered by default on phones (a platform authenticator: fingerprint / face): the next sign-in
 * is one tap instead of an e-mailed link. Can be dismissed; the link keeps working.
 */
function PasskeyOffer({ hasPasskey, onAdded }: { hasPasskey: boolean; onAdded: () => void }) {
  const t = useTranslations('selfService');
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hasPasskey || localStorage.getItem(PASSKEY_DISMISSED_KEY)) return;
    if (typeof window === 'undefined' || !window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable) return;
    window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(setAvailable).catch(() => {});
  }, [hasPasskey]);

  if (hasPasskey || !available) return null;

  const add = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data } = await apiClient.post<ApiResponse<{ options: unknown; challenge_token: string }>>('/api/auth/2fa/webauthn/register/options');
      const attestation = await startRegistration({ optionsJSON: data.data!.options as never });
      await apiClient.post('/api/auth/2fa/webauthn/register/verify', {
        challenge_token: data.data!.challenge_token,
        response: attestation,
        device_name: t('passkeyDeviceName'),
      });
      onAdded();
    } catch (err) {
      if ((err as Error)?.name !== 'NotAllowedError') setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const dismiss = () => {
    localStorage.setItem(PASSKEY_DISMISSED_KEY, '1');
    setAvailable(false);
  };

  return (
    <div className={`${card} mb-4 p-4`}>
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-[var(--a-accent-soft)] text-[var(--a-accent)]"><KeyRound className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <div className="text-[14.5px] font-semibold text-[var(--a-text)]">{t('passkeyTitle')}</div>
          <p className="mt-0.5 text-[13px] text-[var(--a-text-2)]">{t('passkeyText')}</p>
        </div>
      </div>
      {error && <div className="mt-2 text-[12.5px] text-[var(--a-neg)]">{error}</div>}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" onClick={dismiss} className={secondaryButton}>{t('passkeyLater')}</button>
        <button type="button" onClick={add} disabled={busy} className={primaryButton}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('passkeyAdd')}
        </button>
      </div>
    </div>
  );
}

function ReportView({ id, onBack }: { id: string; onBack: () => void }) {
  const t = useTranslations('selfService');
  const [report, setReport] = useState<ExpenseReport | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    meApi.getReport(id).then((loaded) => {
      setReport(loaded);
      setAdding(loaded.status === 'draft' && loaded.receipts.length === 0);
    }).catch((err) => setError(getErrorMessage(err)));
  }, [id]);

  const run = async (action: () => Promise<ExpenseReport | void>) => {
    setBusy(true);
    setError(null);
    try {
      const next = await action();
      if (next) setReport(next);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (!report) {
    return error
      ? <div className="rounded-lg bg-[var(--a-neg-soft)] px-3 py-2 text-[13px] text-[var(--a-neg)]">{error}</div>
      : <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[var(--a-text-3)]" /></div>;
  }

  const editable = report.status === 'draft';

  return (
    <div>
      <button type="button" onClick={onBack} className="-ml-2 mb-2 inline-flex h-10 items-center gap-1 rounded-lg px-2 text-[14px] text-[var(--a-text-2)]">
        <ChevronLeft className="h-4 w-4" /> {t('back')}
      </button>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-[19px] font-semibold text-[var(--a-text)]">{report.description || t('reportTitle', { number: report.report_number })}</h1>
          <div className="mt-0.5 text-[12.5px] text-[var(--a-text-3)]"><span className="font-mono">{report.report_number}</span> · <span className="font-mono">{dateText(report.report_date)}</span></div>
        </div>
        <StatusBadge status={report.status} />
      </div>

      {!editable && <div className="mb-3 rounded-lg bg-[var(--a-surface-2)] px-3 py-2 text-[13px] text-[var(--a-text-2)]">{t(`statusHint.${report.status}`)}</div>}
      {error && <div className="mb-3 rounded-lg bg-[var(--a-neg-soft)] px-3 py-2 text-[13px] text-[var(--a-neg)]">{error}</div>}

      <ul className={`${card} mb-3 divide-y divide-[var(--a-border)] overflow-hidden`}>
        {report.receipts.length === 0 && <li className="px-4 py-6 text-center text-[13.5px] text-[var(--a-text-3)]">{t('noReceipts')}</li>}
        {report.receipts.map((receipt) => (
          <li key={receipt.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14px] font-medium text-[var(--a-text)]">{receipt.vendor_name ?? '—'}</div>
              <div className="truncate text-[12.5px] text-[var(--a-text-3)]">
                <span className="font-mono">{dateText(receipt.receipt_date)}</span> · {receipt.description}
                {receipt.document_id && <Paperclip className="ml-1 inline h-3 w-3" />}
              </div>
            </div>
            <span className="font-mono text-[14px] font-semibold tabular-nums text-[var(--a-text)]">{money(receipt.total)}</span>
            {editable && (
              <button
                type="button"
                aria-label={t('removeReceipt')}
                disabled={busy}
                onClick={() => window.confirm(t('confirmRemoveReceipt')) && void run(() => meApi.removeReceipt(report.id, receipt.id))}
                className="grid h-10 w-10 place-items-center rounded-lg text-[var(--a-text-3)] hover:bg-[var(--a-surface-2)]"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
        {report.receipts.length > 0 && (
          <li className="flex items-center justify-between bg-[var(--a-surface-2)] px-4 py-3 text-[14px] font-semibold text-[var(--a-text)]">
            <span>{t('total')}</span>
            <span className="font-mono tabular-nums">{money(report.total)} €</span>
          </li>
        )}
      </ul>

      {editable && (adding ? (
        <ReceiptForm
          busy={busy}
          onCancel={report.receipts.length > 0 ? () => setAdding(false) : undefined}
          onSave={(input, file) => run(async () => {
            const next = await meApi.addReceipt(report.id, input, file);
            setAdding(false);
            return next;
          })}
        />
      ) : (
        <div className="grid gap-2">
          <button type="button" onClick={() => setAdding(true)} className={secondaryButton}>
            <Camera className="h-4 w-4" /> {t('addReceipt')}
          </button>
          {report.receipts.length > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={() => window.confirm(t('confirmSubmit', { total: money(report.total) })) && void run(() => meApi.submit(report.id))}
              className={primaryButton}
            >
              <Send className="h-4 w-4" /> {t('submit')}
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => window.confirm(t('confirmDelete')) && void run(async () => { await meApi.removeReport(report.id); onBack(); })}
            className="h-11 text-[13.5px] text-[var(--a-neg)]"
          >
            {t('deleteReport')}
          </button>
        </div>
      ))}
    </div>
  );
}

function ReceiptForm({
  busy,
  onSave,
  onCancel,
}: {
  busy: boolean;
  onSave: (input: { vendor_name: string; receipt_number: string | null; receipt_date: string; description: string; gross_amount: number; tax_rate: number }, file: File | null) => Promise<void>;
  onCancel?: () => void;
}) {
  const t = useTranslations('selfService');
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [vendor, setVendor] = useState('');
  const [date, setDate] = useState(getIsoToday());
  const [description, setDescription] = useState('');
  const [gross, setGross] = useState('');
  const [taxRate, setTaxRate] = useState('24');
  const [receiptNo, setReceiptNo] = useState('');

  const amount = Number(gross.replace(',', '.'));
  const valid = vendor.trim() && description.trim() && date && amount > 0;

  return (
    <form
      className={`${card} space-y-3 p-4`}
      onSubmit={(event) => {
        event.preventDefault();
        if (!valid || busy) return;
        void onSave({
          vendor_name: vendor.trim(),
          receipt_number: receiptNo.trim() || null,
          receipt_date: date,
          description: description.trim(),
          gross_amount: amount,
          tax_rate: Number(taxRate),
        }, file);
      }}
    >
      <div className="flex items-center justify-between">
        <div className="text-[15px] font-semibold text-[var(--a-text)]">{t('newReceipt')}</div>
        {onCancel && (
          <button type="button" onClick={onCancel} aria-label={t('cancel')} className="grid h-9 w-9 place-items-center rounded-lg text-[var(--a-text-3)]"><X className="h-4 w-4" /></button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        capture="environment"
        className="hidden"
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
      />
      <button type="button" onClick={() => fileRef.current?.click()} className={`${secondaryButton} w-full`}>
        <Camera className="h-4 w-4" />
        <span className="truncate">{file ? file.name : t('takePhoto')}</span>
      </button>

      <label className="block">
        <span className="mb-1 block text-[13px] font-medium text-[var(--a-text-2)]">{t('vendor')}</span>
        <input value={vendor} onChange={(event) => setVendor(event.target.value)} placeholder={t('vendorPlaceholder')} maxLength={200} className={field} />
      </label>
      <label className="block">
        <span className="mb-1 block text-[13px] font-medium text-[var(--a-text-2)]">{t('description')}</span>
        <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder={t('descriptionPlaceholder')} maxLength={500} className={field} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-[var(--a-text-2)]">{t('amount')}</span>
          <input value={gross} onChange={(event) => setGross(event.target.value)} inputMode="decimal" placeholder="0,00" className={`${field} font-mono`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-[var(--a-text-2)]">{t('vat')}</span>
          <select value={taxRate} onChange={(event) => setTaxRate(event.target.value)} className={field}>
            {VAT_RATES.map((rate) => <option key={rate} value={rate}>{rate}%</option>)}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-[var(--a-text-2)]">{t('date')}</span>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-[var(--a-text-2)]">{t('receiptNo')}</span>
          <input value={receiptNo} onChange={(event) => setReceiptNo(event.target.value)} maxLength={100} className={field} />
        </label>
      </div>
      <p className="text-[12px] text-[var(--a-text-3)]">{t('amountHint')}</p>
      <button type="submit" disabled={!valid || busy} className={`${primaryButton} w-full`}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {t('saveReceipt')}
      </button>
    </form>
  );
}
