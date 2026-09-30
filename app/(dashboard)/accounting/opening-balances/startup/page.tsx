'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AlertTriangle, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';
import { startupApi, type StartupProfile, type StartupStatus } from '@/lib/api/startup.api';
import { Button } from '@/components/ui/Button';
import { AskAssistantButton } from '@/components/assistant/AskAssistantButton';

function formatAmount(value: number | null | undefined) {
  if (value == null) return '—';
  return value.toLocaleString('et-EE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Check({ ok, label, detail }: { ok: boolean | null; label: string; detail?: string }) {
  return (
    <li className="flex items-start gap-2 py-1">
      {ok === true ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
      ) : ok === false ? (
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
      ) : (
        <Circle className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-300" />
      )}
      <span>
        <span className="text-[13px] text-[var(--a-text)]">{label}</span>
        {detail && <span className="block text-[11.5px] text-[var(--a-text-3)]">{detail}</span>}
      </span>
    </li>
  );
}

function Section({ n, title, done, children }: { n: number; title: string; done?: boolean; children: React.ReactNode }) {
  return (
    <section className="rounded-[12px] border border-[var(--a-border)] bg-[var(--a-surface)] p-5">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[var(--a-text)]">
        <span
          className="grid h-5 w-5 place-items-center rounded-full text-[11px] font-semibold"
          style={{ background: done ? 'var(--a-pos)' : 'var(--a-surface-2)', color: done ? '#fff' : 'var(--a-text-3)' }}
        >
          {done ? '✓' : n}
        </span>
        {title}
      </h2>
      <div className="mt-3 text-[13px] text-[var(--a-text-2)]">{children}</div>
    </section>
  );
}

export default function StartupBookkeepingPage() {
  const t = useTranslations('startup');
  const [profile, setProfile] = useState<StartupProfile | null>(null);
  const [status, setStatus] = useState<StartupStatus | null>(null);
  const [form, setForm] = useState({
    founded_on: '',
    share_capital: '',
    share_capital_paid: 'paid' as 'paid' | 'unpaid' | 'unknown',
    bookkeeping_start_date: '',
    ai_enabled: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const p = await startupApi.getProfile();
      setProfile(p);
      setForm({
        founded_on: p.founded_on || '',
        share_capital: p.share_capital != null ? String(p.share_capital) : '',
        share_capital_paid: p.share_capital_paid === false ? 'unpaid' : p.share_capital_paid === true || !p.saved ? 'paid' : 'unknown',
        bookkeeping_start_date: p.bookkeeping_start_date || '',
        ai_enabled: p.ai_bank_categorization_enabled,
      });
      if (p.saved) setStatus(await startupApi.getStatus());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Preview of the scenario for the typed founding date (the backend decides for real on save).
  const previewScenario =
    form.founded_on && profile
      ? form.founded_on >= profile.fiscal_year.start
        ? 'founded_this_year'
        : 'founded_earlier'
      : 'unknown';
  const previewStart =
    form.bookkeeping_start_date ||
    (previewScenario === 'founded_this_year' ? form.founded_on : previewScenario === 'founded_earlier' ? profile?.fiscal_year.start : '') ||
    '';

  const handleSave = async () => {
    if (!form.founded_on) {
      setError(t('foundedRequired'));
      return;
    }
    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      const result = await startupApi.setup({
        founded_on: form.founded_on,
        share_capital: form.share_capital ? Number(form.share_capital.replace(',', '.')) : null,
        share_capital_paid: form.share_capital_paid === 'unknown' ? null : form.share_capital_paid === 'paid',
        bookkeeping_start_date: form.bookkeeping_start_date || null,
        ai_bank_categorization_enabled: form.ai_enabled,
      });
      const parts = [t('savedNotice', { date: result.bookkeeping_start_date })];
      if (result.share_capital_entry) parts.push(t('capitalEntryPosted'));
      if (result.period_errors.length) parts.push(t('periodErrors', { count: result.period_errors.length }));
      setNotice(parts.join(' '));
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading && !profile) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[var(--a-text-3)]">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {t('loading')}
      </div>
    );
  }

  const scenario = profile?.saved ? profile.scenario : previewScenario;
  const checks = status?.checks;
  const saved = Boolean(profile?.saved);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 overflow-auto p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[18px] font-semibold text-[var(--a-text)]">{t('title')}</h1>
          <p className="mt-1 text-[13px] text-[var(--a-text-2)]">{t('subtitle')}</p>
        </div>
        <AskAssistantButton />
      </div>

      {error && <div className="rounded-lg border border-[var(--a-neg)]/40 bg-[var(--a-neg-soft)] px-3 py-2 text-[12.5px] text-[var(--a-neg)]">{error}</div>}
      {notice && <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-800">{notice}</div>}

      {/* 1. Company */}
      <Section n={1} title={t('step1Title')} done={saved}>
        <p>{t('step1Body')}</p>
        {profile?.registry?.error && <p className="mt-2 text-[12px] text-amber-700">{t('registryFailed', { error: profile.registry.error })}</p>}
        {profile?.registry?.founded_on && !profile.saved && (
          <p className="mt-2 text-[12px] text-[var(--a-text-3)]">{t('registryPrefilled')}</p>
        )}
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-[12px] font-medium text-[var(--a-text-2)]">
            {t('foundedOn')}
            <input
              type="date"
              value={form.founded_on}
              onChange={(e) => setForm((f) => ({ ...f, founded_on: e.target.value }))}
              className="h-8 rounded-md border border-[var(--a-border)] bg-[var(--a-surface)] px-2 text-[13px]"
            />
          </label>
          <label className="flex flex-col gap-1 text-[12px] font-medium text-[var(--a-text-2)]">
            {t('shareCapital')}
            <input
              inputMode="decimal"
              value={form.share_capital}
              onChange={(e) => setForm((f) => ({ ...f, share_capital: e.target.value }))}
              placeholder="2500"
              className="h-8 rounded-md border border-[var(--a-border)] bg-[var(--a-surface)] px-2 text-[13px]"
            />
          </label>
          <label className="flex flex-col gap-1 text-[12px] font-medium text-[var(--a-text-2)]">
            {t('shareCapitalPaid')}
            <select
              value={form.share_capital_paid}
              onChange={(e) => setForm((f) => ({ ...f, share_capital_paid: e.target.value as 'paid' | 'unpaid' | 'unknown' }))}
              className="h-8 rounded-md border border-[var(--a-border)] bg-[var(--a-surface)] px-2 text-[13px]"
            >
              <option value="paid">{t('capitalPaid')}</option>
              <option value="unpaid">{t('capitalUnpaid')}</option>
              <option value="unknown">{t('capitalUnknown')}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-[12px] font-medium text-[var(--a-text-2)]">
            {t('startDate')}
            <input
              type="date"
              value={form.bookkeeping_start_date}
              placeholder={previewStart}
              onChange={(e) => setForm((f) => ({ ...f, bookkeeping_start_date: e.target.value }))}
              className="h-8 rounded-md border border-[var(--a-border)] bg-[var(--a-surface)] px-2 text-[13px]"
            />
            <span className="text-[11px] font-normal text-[var(--a-text-3)]">{t('startDateHint', { date: previewStart || '—' })}</span>
          </label>
        </div>

        {scenario !== 'unknown' && (
          <div className="mt-3 rounded-lg bg-[var(--a-surface-2)] px-3 py-2 text-[12.5px]">
            {scenario === 'founded_this_year' ? t('scenarioThisYear') : t('scenarioEarlier', { date: profile?.fiscal_year.start || '' })}
          </div>
        )}

        <label className="mt-3 flex items-start gap-2 text-[12.5px]">
          <input
            type="checkbox"
            checked={form.ai_enabled}
            onChange={(e) => setForm((f) => ({ ...f, ai_enabled: e.target.checked }))}
            className="mt-0.5"
          />
          <span>
            {t('aiConsent')}
            <span className="block text-[11.5px] text-[var(--a-text-3)]">
              {profile?.ai.configured ? t('aiConsentHint', { provider: profile.ai.provider || '', model: profile.ai.model || '' }) : t('aiNotConfigured')}
            </span>
          </span>
        </label>

        <div className="mt-4 flex justify-end">
          <Button variant="primary" onClick={() => void handleSave()} disabled={isSaving}>
            {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>{saved ? t('saveAgain') : t('save')}</span>
          </Button>
        </div>
      </Section>

      {/* 2. Previous year (founded earlier only) */}
      {scenario === 'founded_earlier' && (
        <Section n={2} title={t('step2Title')} done={checks?.year_end_imported}>
          <p>{t('step2Body')}</p>
          {saved && (
            <Link href="/accounting/opening-balances" className="mt-2 inline-block font-semibold text-[var(--primary)] hover:underline">
              {t('step2Link')}
            </Link>
          )}
        </Section>
      )}

      {/* 3. Bank statement */}
      <Section n={scenario === 'founded_earlier' ? 3 : 2} title={t('step3Title')} done={checks?.bank_statements_imported && checks?.bank_opening_matches}>
        <p>{t('step3Body', { date: profile?.bookkeeping_start_date || previewStart || '—' })}</p>
        {status?.banks.length ? (
          <table className="mt-3 w-full text-[12px]">
            <thead className="text-left text-[11px] uppercase tracking-wide text-[var(--a-text-3)]">
              <tr>
                <th className="py-1">{t('bankAccount')}</th>
                <th className="py-1">{t('firstStatement')}</th>
                <th className="py-1 text-right">{t('statementOpening')}</th>
                <th className="py-1 text-right">{t('ledgerBefore')}</th>
                <th className="py-1 text-right">{t('difference')}</th>
              </tr>
            </thead>
            <tbody>
              {status.banks.map((bank) => (
                <tr key={bank.bank_account_id} className="border-t border-[var(--a-border)]">
                  <td className="py-1">
                    {bank.name}
                    {bank.starts_after_bookkeeping_start && <span className="block text-[11px] text-amber-700">{t('statementStartsLate')}</span>}
                  </td>
                  <td className="py-1 font-mono">{bank.first_statement_date || '—'}</td>
                  <td className="py-1 text-right font-mono">{formatAmount(bank.statement_opening)}</td>
                  <td className="py-1 text-right font-mono">{formatAmount(bank.ledger_before_start)}</td>
                  <td className={`py-1 text-right font-mono ${bank.opening_difference && Math.abs(bank.opening_difference) >= 0.01 ? 'text-amber-700' : ''}`}>
                    {formatAmount(bank.opening_difference)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        {checks && !checks.bank_opening_matches && <p className="mt-2 text-[12px] text-amber-700">{t('openingMismatch')}</p>}
        {saved && (
          <Link href="/accounting/bank?tab=import" className="mt-2 inline-block font-semibold text-[var(--primary)] hover:underline">
            {t('step3Link')}
          </Link>
        )}
      </Section>

      {/* 4. Reconstruction */}
      <Section n={scenario === 'founded_earlier' ? 4 : 3} title={t('step4Title')} done={checks?.no_open_transactions && checks?.bank_statements_imported}>
        <p>{t('step4Body')}</p>
        {status && (
          <p className="mt-2 text-[12.5px]">
            {t('openStatus', {
              open: status.open_transactions.open_transactions,
              groups: status.open_transactions.groups,
              flagged: status.open_transactions.flagged_groups,
            })}
          </p>
        )}
        {saved && (
          <Link href="/accounting/bank?tab=reconstruct" className="mt-2 inline-block font-semibold text-[var(--primary)] hover:underline">
            {t('step4Link')}
          </Link>
        )}
      </Section>

      {/* 5. Final check */}
      {status && (
        <Section n={scenario === 'founded_earlier' ? 5 : 4} title={t('step5Title')} done={status.ready}>
          <ul>
            {checks?.year_end_needed && <Check ok={checks.year_end_imported} label={t('checkYearEnd')} />}
            <Check
              ok={checks?.share_capital_booked ?? null}
              label={t('checkCapital')}
              detail={t('checkCapitalDetail', {
                registered: formatAmount(status.share_capital.registered),
                booked: formatAmount(status.share_capital.booked),
                unpaid: formatAmount(status.share_capital.unpaid),
              })}
            />
            <Check ok={checks?.bank_statements_imported ?? null} label={t('checkStatements')} />
            <Check ok={checks?.bank_opening_matches ?? null} label={t('checkOpening')} />
            <Check
              ok={checks?.bank_closing_matches ?? null}
              label={t('checkClosing')}
              detail={status.banks
                .filter((b) => b.closing_difference != null)
                .map((b) => `${b.name}: ${formatAmount(b.statement_closing)} / ${formatAmount(b.ledger_today)}`)
                .join(' · ')}
            />
            <Check ok={checks?.no_open_transactions ?? null} label={t('checkOpenTransactions', { count: status.open_transactions.open_transactions })} />
            <Check ok={checks?.no_closed_periods ?? null} label={t('checkPeriods')} />
            <Check
              ok={status.missing_receipts.count === 0}
              label={t('checkMissingReceipts', { count: status.missing_receipts.count, total: formatAmount(status.missing_receipts.total) })}
              detail={t('checkMissingReceiptsDetail')}
            />
          </ul>
          <p className="mt-3 text-[12.5px] font-medium">{status.ready ? t('ready') : t('notReady')}</p>
        </Section>
      )}

      {/* What matters for a new company — the things the bank statement cannot tell. */}
      <section className="rounded-[12px] border border-[var(--a-border)] bg-[var(--a-surface-2)] p-5 text-[12.5px] text-[var(--a-text-2)]">
        <h2 className="text-[14px] font-semibold text-[var(--a-text)]">{t('essentialsTitle')}</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>{t('essentialCapital')}</li>
          <li>{t('essentialOwnerPaid')}</li>
          <li>{t('essentialFirstYear')}</li>
          <li>{t('essentialVat')}</li>
          <li>{t('essentialTaxes')}</li>
          <li>{t('essentialOwner')}</li>
          <li>{t('essentialDocuments')}</li>
          <li>{t('essentialUnpaid')}</li>
        </ul>
      </section>
    </div>
  );
}
