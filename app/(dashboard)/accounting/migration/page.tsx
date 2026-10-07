'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AlertTriangle, ArrowRight, CheckCircle2, Circle, FileDown, Loader2 } from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';
import { migrationApi, type MigrationStatus } from '@/lib/api/migration.api';
import { AskAssistantButton } from '@/components/assistant/AskAssistantButton';
import { DemoSampleFiles } from '@/components/demo/DemoSampleFiles';

function formatDate(value: string | null | undefined) {
  if (!value) return null;
  return new Date(value).toLocaleDateString('et-EE');
}

function Check({ ok, label, detail }: { ok: boolean | null; label: string; detail?: string | null }) {
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

/** What to take out of the previous software for this step. */
function Export({ items }: { items: string[] }) {
  const t = useTranslations('migration');
  return (
    <div className="mt-3 rounded-[10px] bg-[var(--a-surface-2)] px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wide text-[var(--a-text-3)]">
        <FileDown className="h-3.5 w-3.5" />
        {t('exportTitle')}
      </div>
      <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-[12.5px] text-[var(--a-text-2)]">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function Action({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--primary)] hover:underline">
      {label}
      <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  );
}

function Section({ n, title, done, optional, children }: { n: number; title: string; done?: boolean; optional?: string; children: React.ReactNode }) {
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
        {optional && <span className="text-[11.5px] font-normal text-[var(--a-text-3)]">{optional}</span>}
      </h2>
      <div className="mt-3 text-[13px] text-[var(--a-text-2)]">{children}</div>
    </section>
  );
}

export default function MigrationPage() {
  const t = useTranslations('migration');
  const [status, setStatus] = useState<MigrationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    migrationApi
      .getStatus()
      .then((data) => {
        if (!cancelled) setStatus(data);
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!status && !error) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-[var(--a-text-3)]">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {t('loading')}
      </div>
    );
  }

  const s = status;
  const strategy = s?.opening.strategy ?? null;
  const midYear = strategy === 'mid_year';
  const subledgerOnly = strategy === 'subledger_only';
  const openingDate = formatDate(s?.opening.opening_date);

  const companyDone = Boolean(s?.company.registry_code && (!s.company.is_vat_registered || s.company.vat_number));
  const strategyDone = Boolean(strategy);
  const balanceDone = Boolean(subledgerOnly || (s?.opening.balance_sheet && (!midYear || s.opening.turnover)));
  const openItemsDone = Boolean(s?.opening.receivables && s.opening.payables);
  const bankDone = Boolean(s && s.bank.accounts_with_iban > 0 && s.bank.transactions > 0);
  const controlDone = Boolean(s?.opening.locked);
  const steps = [companyDone, strategyDone, Boolean(s && s.accounts.count > 0), balanceDone, openItemsDone, bankDone, controlDone];
  const doneCount = steps.filter(Boolean).length;

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

      <DemoSampleFiles />

      {s && (
        <div className="rounded-[12px] border border-[var(--a-border)] bg-[var(--a-surface)] px-5 py-4">
          <div className="flex items-center justify-between text-[13px]">
            <span className="font-semibold text-[var(--a-text)]">{s.company.name}</span>
            <span className="text-[var(--a-text-2)]">{t('progress', { done: doneCount, total: steps.length })}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--a-surface-2)]">
            <div className="h-full rounded-full bg-[var(--a-pos)] transition-all" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
          </div>
        </div>
      )}

      {s && (
        <>
          <Section n={1} title={t('company.title')} done={companyDone}>
            <p>{t('company.body')}</p>
            <ul className="mt-2">
              <Check ok={Boolean(s.company.registry_code)} label={t('company.registryCode')} detail={s.company.registry_code} />
              {s.company.is_vat_registered && <Check ok={Boolean(s.company.vat_number)} label={t('company.vatNumber')} detail={s.company.vat_number} />}
              <Check ok={s.company.address ? true : null} label={t('company.address')} detail={s.company.address} />
            </ul>
            <Action href="/settings?tab=company" label={t('company.action')} />
          </Section>

          <Section n={2} title={t('strategy.title')} done={strategyDone}>
            <p>{t('strategy.body')}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {(['with_general', 'mid_year', 'subledger_only'] as const).map((key) => (
                <div
                  key={key}
                  className="rounded-[10px] border px-3 py-2.5"
                  style={{ borderColor: strategy === key ? 'var(--a-pos)' : 'var(--a-border)', background: strategy === key ? 'var(--a-pos-soft, #ecfdf5)' : undefined }}
                >
                  <div className="text-[13px] font-semibold text-[var(--a-text)]">{t(`strategy.${key}.title`)}</div>
                  <div className="mt-0.5 text-[12px] text-[var(--a-text-3)]">{t(`strategy.${key}.body`)}</div>
                </div>
              ))}
            </div>
            <Action href="/accounting/opening-balances" label={strategyDone ? t('strategy.change') : t('strategy.action')} />
          </Section>

          <Section n={3} title={t('accounts.title')} done={s.accounts.count > 0 && s.accounts.beyond_standard}>
            <p>{t('accounts.body')}</p>
            <Export items={[t('accounts.export')]} />
            <ul className="mt-2">
              <Check
                ok={s.accounts.beyond_standard ? true : null}
                label={s.accounts.beyond_standard ? t('accounts.imported', { count: s.accounts.count }) : t('accounts.standard', { count: s.accounts.count })}
                detail={s.accounts.beyond_standard ? null : t('accounts.standardHint')}
              />
            </ul>
            <Action href="/accounting/accounts/import" label={t('accounts.action')} />
          </Section>

          <Section n={4} title={t('balance.title')} done={balanceDone} optional={subledgerOnly ? t('balance.notNeeded') : undefined}>
            <p>{midYear ? t('balance.bodyMidYear') : t('balance.body')}</p>
            <Export items={midYear ? [t('balance.exportBalance'), t('balance.exportTurnover')] : [t('balance.exportBalance')]} />
            <ul className="mt-2">
              <Check ok={s.opening.balance_sheet ? true : null} label={t('balance.balanceSheet')} detail={s.opening.balance_sheet && openingDate ? t('asOf', { date: openingDate }) : null} />
              {midYear && <Check ok={s.opening.turnover ? true : null} label={t('balance.turnover')} />}
            </ul>
            <Action href="/accounting/opening-balances" label={t('balance.action')} />
          </Section>

          <Section n={5} title={t('openItems.title')} done={openItemsDone}>
            <p>{t('openItems.body')}</p>
            <Export items={[t('openItems.exportReceivables'), t('openItems.exportPayables')]} />
            <ul className="mt-2">
              <Check ok={s.opening.receivables ? true : null} label={t('openItems.receivables')} />
              <Check ok={s.opening.payables ? true : null} label={t('openItems.payables')} />
              <Check ok={s.partners.count > 0 ? true : null} label={t('openItems.partners', { count: s.partners.count })} detail={t('openItems.partnersHint')} />
            </ul>
            <Action href="/accounting/opening-balances" label={t('openItems.action')} />
          </Section>

          <Section n={6} title={t('bank.title')} done={bankDone}>
            <p>{t('bank.body')}</p>
            <Export items={[t('bank.export')]} />
            <ul className="mt-2">
              <Check ok={s.bank.accounts_with_iban > 0 ? true : null} label={t('bank.accounts', { count: s.bank.accounts_with_iban })} />
              <Check
                ok={s.bank.transactions > 0 ? true : null}
                label={t('bank.transactions', { count: s.bank.transactions })}
                detail={s.bank.last_tx_date ? t('bank.range', { from: formatDate(s.bank.first_tx_date) ?? '', to: formatDate(s.bank.last_tx_date) ?? '' }) : null}
              />
            </ul>
            <Action href="/accounting/bank?tab=import" label={t('bank.action')} />
          </Section>

          <Section n={7} title={t('control.title')} done={controlDone}>
            <p>{midYear ? t('control.bodyMidYear') : t('control.body')}</p>
            {midYear && <Export items={[t('control.export')]} />}
            <ul className="mt-2">
              <Check
                ok={s.opening.reconciliation_status === 'passed' || s.opening.locked ? true : s.opening.reconciliation_status === 'failed' ? false : null}
                label={t(`control.status.${s.opening.reconciliation_status || 'none'}`)}
              />
              <Check ok={s.opening.locked ? true : null} label={t('control.locked')} detail={t('control.lockedHint')} />
            </ul>
            <Action href="/accounting/opening-balances" label={t('control.action')} />
          </Section>

          <Section n={8} title={t('daily.title')} optional={t('daily.optional')}>
            <p>{t('daily.body')}</p>
            <ul className="mt-2 space-y-1.5">
              {([
                ['/invoices/purchase-imports', 'purchases'],
                ['/invoices/recurring', 'recurring'],
                ['/settings?tab=integrations', 'einvoices'],
                ['/settings?tab=team', 'team'],
              ] as const).map(([href, key]) => (
                <li key={key}>
                  <Link href={href} className="font-semibold text-[var(--primary)] hover:underline">{t(`daily.${key}.title`)}</Link>
                  <span className="text-[var(--a-text-3)]"> — {t(`daily.${key}.body`)}</span>
                </li>
              ))}
            </ul>
          </Section>
        </>
      )}
    </div>
  );
}
