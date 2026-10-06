'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { accountingApi, type AccountOption } from '@/lib/api/accounting.api';
import { getErrorMessage } from '@/lib/api/client';
import { payrollApi, type PayrollAccountKey, type PayrollSettings, type VacationPayTiming } from '@/lib/api/payroll.api';

/** Posting accounts in entry order, with the class of accounts each one is chosen from. */
const ACCOUNT_FIELDS: Array<{ key: PayrollAccountKey; prefix: string; code: string }> = [
  { key: 'wage_expense_account_id', prefix: '4', code: '4210' },
  { key: 'social_tax_expense_account_id', prefix: '4', code: '4220' },
  { key: 'unemployment_expense_account_id', prefix: '4', code: '4230' },
  { key: 'net_payable_account_id', prefix: '2', code: '2300' },
  { key: 'social_tax_account_id', prefix: '2', code: '2410' },
  { key: 'income_tax_account_id', prefix: '2', code: '2420' },
  { key: 'unemployment_account_id', prefix: '2', code: '2430' },
  { key: 'pension_account_id', prefix: '2', code: '2440' },
];

export default function PayrollSettingsPage() {
  const t = useTranslations('payroll');
  const [settings, setSettings] = useState<PayrollSettings | null>(null);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [draft, setDraft] = useState<Partial<Record<PayrollAccountKey, string | null>>>({});
  const [paymentDay, setPaymentDay] = useState('10');
  const [reference, setReference] = useState('');
  const [timing, setTiming] = useState<VacationPayTiming>('before_leave');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([payrollApi.settings(), accountingApi.getAccounts()])
      .then(([s, list]) => {
        setSettings(s);
        setAccounts(list.filter((a) => a.is_active));
        setDraft(Object.fromEntries(ACCOUNT_FIELDS.map(({ key }) => [key, s[key]])));
        setPaymentDay(String(s.payment_day));
        setReference(s.emta_reference ?? '');
        setTiming(s.vacation_pay_timing);
      })
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const next = await payrollApi.updateSettings({ ...draft, payment_day: Number(paymentDay) || 10, emta_reference: reference.trim() || null, vacation_pay_timing: timing });
      setSettings(next);
      setSaved(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const field = 'h-9 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-bg)] px-2.5 text-[13px]';

  return (
    <div className="mx-auto w-full max-w-3xl py-4">
      <Link href="/payroll" className="mb-2 inline-flex items-center gap-1 text-[12.5px] text-[var(--a-text-3)] hover:text-[var(--a-text)]">
        <ArrowLeft className="h-3.5 w-3.5" />
        {t('title')}
      </Link>
      <h1 className="text-[20px] font-semibold text-[var(--a-text)]">{t('settingsTitle')}</h1>
      <p className="mb-4 mt-1 text-[13px] text-[var(--a-text-2)]">{t('settingsSubtitle')}</p>

      {error && <div className="mb-3 rounded-lg bg-[var(--a-neg-soft)] px-3 py-2 text-[13px] text-[var(--a-neg)]">{error}</div>}
      {!settings ? (
        !error && <div className="py-10 text-center text-[13px] text-[var(--a-text-3)]">{t('loading')}</div>
      ) : (
        <div className="space-y-4">
          <section className="rounded-[12px] border border-[var(--a-border)] bg-[var(--a-surface)] p-4">
            <h2 className="mb-3 text-[14px] font-semibold">{t('payment')}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[12px] font-medium text-[var(--a-text-2)]">{t('paymentDay')}</span>
                <input type="number" min={1} max={28} value={paymentDay} onChange={(e) => setPaymentDay(e.target.value)} className={field} />
                <span className="mt-1 block text-[11.5px] text-[var(--a-text-3)]">{t('paymentDayHint')}</span>
              </label>
              <label className="block">
                <span className="mb-1 block text-[12px] font-medium text-[var(--a-text-2)]">{t('emtaReference')}</span>
                <input value={reference} onChange={(e) => setReference(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className={`${field} font-mono`} />
                <span className="mt-1 block text-[11.5px] text-[var(--a-text-3)]">{t('emtaReferenceHint')}</span>
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-[12px] font-medium text-[var(--a-text-2)]">{t('absence.timingDefault')}</span>
                <select value={timing} onChange={(e) => setTiming(e.target.value as VacationPayTiming)} className={field}>
                  <option value="before_leave">{t('absence.timingBefore')}</option>
                  <option value="with_salary">{t('absence.timingWithSalary')}</option>
                </select>
                <span className="mt-1 block text-[11.5px] text-[var(--a-text-3)]">{t('absence.timingDefaultHint')}</span>
              </label>
            </div>
          </section>

          <section className="rounded-[12px] border border-[var(--a-border)] bg-[var(--a-surface)] p-4">
            <h2 className="mb-1 text-[14px] font-semibold">{t('postingAccounts')}</h2>
            <p className="mb-3 text-[12px] text-[var(--a-text-3)]">{t('postingAccountsHint')}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {ACCOUNT_FIELDS.map(({ key, prefix, code }) => {
                const resolved = settings.accounts[key];
                return (
                  <label key={key} className="block">
                    <span className="mb-1 block text-[12px] font-medium text-[var(--a-text-2)]">{t(`account.${key}`)}</span>
                    <select value={draft[key] ?? ''} onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value || null }))} className={field}>
                      <option value="">{t('accountDefault', { code })}</option>
                      {accounts
                        .filter((a) => a.code.startsWith(prefix))
                        .map((a) => (
                          <option key={a.id} value={a.id}>{a.code} · {a.name}</option>
                        ))}
                    </select>
                    {!draft[key] && !resolved && <span className="mt-1 block text-[11.5px] text-[var(--a-neg)]">{t('accountMissing', { code })}</span>}
                  </label>
                );
              })}
            </div>
          </section>

          <div className="flex items-center justify-end gap-3">
            {saved && <span className="text-[12.5px] text-[var(--a-pos)]">{t('saved')}</span>}
            <button type="button" disabled={saving} onClick={() => void save()} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[var(--a-accent)] px-4 text-[13px] font-semibold text-[var(--a-accent-on)] disabled:opacity-50">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t('save')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
