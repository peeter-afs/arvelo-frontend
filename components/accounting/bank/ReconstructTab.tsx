'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AlertTriangle, ChevronDown, ChevronRight, History, Loader2, Sparkles } from 'lucide-react';
import { accountingApi, type AccountOption } from '@/lib/api/accounting.api';
import { getErrorMessage } from '@/lib/api/client';
import {
  startupApi,
  type ApplyAction,
  type ReconstructionGroup,
  type StartupProfile,
} from '@/lib/api/startup.api';
import { AccountPicker } from './AccountPicker';
import { BankFooterBar, type BankInlineSummaryData } from './shared';

/** Per-group decision the accountant edits before confirming. */
type Decision = {
  action: ApplyAction;
  account_id: string;
  vat_rate: string;
  selected: boolean;
};

const HIGH_CONFIDENCE = 0.9;

function formatAmount(value: number) {
  return value.toLocaleString('et-EE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Default action for a suggestion. Purchases of a VAT-registered company become
 * missing-receipt drafts (input VAT needs the invoice); sales of a VAT-registered
 * company are left for invoice matching (KMD is built from invoices); the rest is
 * posted straight to the suggested account.
 */
function defaultAction(group: ReconstructionGroup, isVatRegistered: boolean): ApplyAction {
  const kind = group.suggestion?.kind;
  if (!kind || kind === 'unknown') return 'skip';
  if (isVatRegistered && kind === 'purchase_payment' && group.suggestion?.needs_document) return 'draft';
  if (isVatRegistered && kind === 'sales_receipt') return 'skip';
  return 'post';
}

export function ReconstructTab({
  refreshKey = 0,
  onCountChange,
  onSummaryChange,
}: {
  refreshKey?: number;
  onCountChange?: (count: number) => void;
  onSummaryChange?: (summary: BankInlineSummaryData) => void;
}) {
  const t = useTranslations('startup');
  const [profile, setProfile] = useState<StartupProfile | null>(null);
  const [groups, setGroups] = useState<ReconstructionGroup[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isCategorizing, setIsCategorizing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isVatRegistered = Boolean(profile?.is_vat_registered);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [profileResult, groupResult, accountList] = await Promise.all([
        startupApi.getProfile(),
        startupApi.listGroups(),
        accountingApi.getAccounts(),
      ]);
      setProfile(profileResult);
      setGroups(groupResult.groups);
      setAccounts(accountList);
      setDecisions(() => {
        const next: Record<string, Decision> = {};
        for (const group of groupResult.groups) {
          const suggestion = group.suggestion;
          next[group.key] = {
            action: defaultAction(group, profileResult.is_vat_registered),
            account_id: suggestion?.account_id || '',
            vat_rate: suggestion?.vat_rate ? String(suggestion.vat_rate) : '',
            selected: false,
          };
        }
        return next;
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const openCount = useMemo(() => groups.reduce((sum, g) => sum + g.count, 0), [groups]);
  const categorized = groups.filter((g) => g.suggestion).length;
  const flagged = groups.filter((g) => g.suggestion?.flags?.length).length;
  const selectedGroups = groups.filter((g) => decisions[g.key]?.selected);

  useEffect(() => {
    onCountChange?.(openCount);
    onSummaryChange?.({
      cells: [
        { label: t('summaryOpen'), value: openCount },
        { label: t('summaryGroups'), value: groups.length },
        { label: t('summaryFlagged'), value: flagged, color: flagged ? 'var(--a-warn)' : undefined },
      ],
      progress: groups.length ? { label: t('summaryCategorized'), done: categorized, total: groups.length } : undefined,
    });
  }, [openCount, groups.length, categorized, flagged, onCountChange, onSummaryChange, t]);

  const updateDecision = (key: string, patch: Partial<Decision>) =>
    setDecisions((current) => ({ ...current, [key]: { ...current[key], ...patch } }));

  const handleCategorize = async (force = false) => {
    setIsCategorizing(true);
    setError(null);
    setNotice(null);
    try {
      const result = await startupApi.categorize({ force });
      setNotice(
        t('categorizeDone', {
          categorized: result.categorized,
          groups: result.groups,
          history: result.from_history,
        }) + (result.failed_chunks ? ` ${t('categorizePartial', { count: result.failed_chunks })}` : '')
      );
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsCategorizing(false);
    }
  };

  const selectConfident = () =>
    setDecisions((current) => {
      const next = { ...current };
      for (const group of groups) {
        const s = group.suggestion;
        const decision = next[group.key];
        const ready = decision.action !== 'post' || Boolean(decision.account_id);
        next[group.key] = {
          ...decision,
          selected: Boolean(s && s.confidence >= HIGH_CONFIDENCE && !s.flags.length && decision.action !== 'skip' && ready),
        };
      }
      return next;
    });

  const handleApply = async () => {
    const items = selectedGroups
      .map((group) => {
        const d = decisions[group.key];
        return {
          transaction_ids: group.transaction_ids,
          action: d.action,
          account_id: d.account_id || null,
          vat_rate: d.vat_rate ? Number(d.vat_rate) : null,
        };
      })
      .filter((item) => item.action !== 'skip');
    if (items.length === 0) return;
    const missingAccount = items.some((item) => item.action === 'post' && !item.account_id);
    if (missingAccount) {
      setError(t('applyNeedsAccount'));
      return;
    }
    setIsApplying(true);
    setError(null);
    setNotice(null);
    try {
      const result = await startupApi.apply(items);
      setNotice(t('applyDone', { posted: result.posted, drafted: result.drafted, errors: result.errors }));
      const firstError = result.results.find((r) => r.status === 'error');
      if (firstError?.error) setError(firstError.error);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsApplying(false);
    }
  };

  if (isLoading && !profile) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {t('loading')}
      </div>
    );
  }

  if (profile && !profile.saved) {
    return (
      <div className="card mx-auto mt-6 max-w-xl p-5 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">{t('notSetUpTitle')}</p>
        <p className="mt-1">{t('notSetUpBody')}</p>
        <Link href="/accounting/opening-balances/startup" className="mt-3 inline-block font-semibold text-[var(--primary)] hover:underline">
          {t('openWizard')}
        </Link>
      </div>
    );
  }

  const aiReady = Boolean(profile?.ai.configured && profile?.ai_bank_categorization_enabled);

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-shrink-0 flex-wrap items-center gap-2 text-xs text-slate-600">
        <span>{t('reconstructIntro', { date: profile?.bookkeeping_start_date || '—' })}</span>
        <span className="flex-1" />
        {!aiReady && (
          <span className="text-amber-700">
            {profile?.ai.configured ? t('aiNotEnabled') : t('aiNotConfigured')}
          </span>
        )}
        <button
          type="button"
          disabled={!aiReady || isCategorizing || groups.length === 0}
          onClick={() => void handleCategorize(false)}
          className="inline-flex h-[30px] items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 font-semibold text-white hover:bg-[var(--primary-hover)] disabled:opacity-50"
        >
          {isCategorizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {isCategorizing ? t('categorizing') : t('categorize')}
        </button>
        {categorized > 0 && (
          <button
            type="button"
            disabled={!aiReady || isCategorizing}
            onClick={() => void handleCategorize(true)}
            className="inline-flex h-[30px] items-center rounded-lg border border-slate-200 px-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {t('recategorize')}
          </button>
        )}
      </div>

      {error && <div className="flex-shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
      {notice && <div className="flex-shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{notice}</div>}

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200 bg-white">
        {groups.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-500">{t('noOpenTransactions')}</div>
        ) : (
          <table className="w-full text-[12.5px]">
            <thead className="sticky top-0 z-10 bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-8 px-2 py-2" />
                <th className="px-2 py-2">{t('colCounterparty')}</th>
                <th className="px-2 py-2 text-right">{t('colCount')}</th>
                <th className="px-2 py-2 text-right">{t('colTotal')}</th>
                <th className="px-2 py-2">{t('colSuggestion')}</th>
                <th className="px-2 py-2">{t('colAction')}</th>
                <th className="w-[260px] px-2 py-2">{t('colAccount')}</th>
                {isVatRegistered && <th className="w-[80px] px-2 py-2">{t('colVat')}</th>}
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const d = decisions[group.key];
                if (!d) return null;
                const s = group.suggestion;
                const isOpen = expanded.has(group.key);
                return (
                  <Fragment key={group.key}>
                    <tr className="border-t border-slate-100 align-top">
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          checked={d.selected}
                          disabled={d.action === 'skip'}
                          onChange={(e) => updateDecision(group.key, { selected: e.target.checked })}
                          aria-label={t('selectGroup')}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() =>
                            setExpanded((current) => {
                              const next = new Set(current);
                              if (next.has(group.key)) next.delete(group.key);
                              else next.add(group.key);
                              return next;
                            })
                          }
                          className="flex items-start gap-1 text-left"
                        >
                          {isOpen ? <ChevronDown className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" /> : <ChevronRight className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />}
                          <span>
                            <span className="font-semibold text-slate-900">{group.counterparty || group.samples[0] || t('unknownCounterparty')}</span>
                            <span className="block text-[11px] text-slate-500">
                              {group.direction === 'in' ? t('directionIn') : t('directionOut')} · {group.first_date}
                              {group.last_date !== group.first_date ? ` – ${group.last_date}` : ''}
                            </span>
                          </span>
                        </button>
                      </td>
                      <td className="px-2 py-2 text-right font-mono tabular-nums">{group.count}</td>
                      <td className={`px-2 py-2 text-right font-mono tabular-nums ${group.total < 0 ? 'text-slate-900' : 'text-emerald-700'}`}>
                        {formatAmount(group.total)}
                      </td>
                      <td className="max-w-[280px] px-2 py-2">
                        {s ? (
                          <div>
                            <div className="flex flex-wrap items-center gap-1">
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700">{t(`kind.${s.kind}`)}</span>
                              <span
                                className={`font-mono text-[11px] ${s.confidence >= HIGH_CONFIDENCE ? 'text-emerald-700' : s.confidence >= 0.5 ? 'text-slate-600' : 'text-amber-700'}`}
                                title={t('confidence')}
                              >
                                {Math.round(s.confidence * 100)}%
                              </span>
                              {s.source === 'history' && (
                                <span title={t('fromHistory')}>
                                  <History className="h-3 w-3 text-slate-500" />
                                </span>
                              )}
                              {s.flags.map((flag) => (
                                <span key={flag} className="inline-flex items-center gap-0.5 rounded bg-amber-50 px-1 py-0.5 text-[10.5px] font-semibold text-amber-800">
                                  <AlertTriangle className="h-3 w-3" />
                                  {t(`flag.${flag}`)}
                                </span>
                              ))}
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-500">{s.reason}</div>
                            {s.needs_document && <div className="text-[11px] text-slate-500">{t('needsDocument')}</div>}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">{t('noSuggestion')}</span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <select
                          value={d.action}
                          onChange={(e) => {
                            const action = e.target.value as ApplyAction;
                            updateDecision(group.key, { action, selected: action === 'skip' ? false : d.selected });
                          }}
                          className="h-7 rounded border border-slate-200 bg-white px-1 text-[12px]"
                        >
                          <option value="post">{t('actionPost')}</option>
                          {group.direction === 'out' && <option value="draft">{t('actionDraft')}</option>}
                          <option value="skip">{t('actionSkip')}</option>
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        {d.action !== 'skip' && (
                          <AccountPicker
                            accounts={accounts}
                            value={d.account_id}
                            onChange={(accountId) => updateDecision(group.key, { account_id: accountId })}
                            onAccountCreated={(account) => setAccounts((current) => [...current, account])}
                            defaultScope={group.direction === 'in' ? 'income' : 'expense'}
                          />
                        )}
                      </td>
                      {isVatRegistered && (
                        <td className="px-2 py-2">
                          {d.action === 'post' && (
                            <select
                              value={d.vat_rate}
                              onChange={(e) => updateDecision(group.key, { vat_rate: e.target.value })}
                              className="h-7 w-full rounded border border-slate-200 bg-white px-1 text-[12px]"
                            >
                              <option value="">{t('vatNone')}</option>
                              <option value="24">24%</option>
                              <option value="22">22%</option>
                              <option value="13">13%</option>
                              <option value="9">9%</option>
                            </select>
                          )}
                        </td>
                      )}
                    </tr>
                    {isOpen && (
                      <tr className="bg-slate-50/60">
                        <td />
                        <td colSpan={isVatRegistered ? 7 : 6} className="px-2 pb-2">
                          <table className="w-full text-[11.5px] text-slate-600">
                            <tbody>
                              {group.transactions.map((tx) => (
                                <tr key={tx.id}>
                                  <td className="w-[90px] py-0.5 font-mono">{tx.tx_date}</td>
                                  <td className="w-[100px] py-0.5 text-right font-mono tabular-nums">{formatAmount(tx.amount)}</td>
                                  <td className="py-0.5 pl-3">{[tx.description, tx.reference].filter(Boolean).join(' · ')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <BankFooterBar status={t('footerHint')}>
        <button
          type="button"
          onClick={selectConfident}
          disabled={groups.length === 0}
          className="inline-flex h-[30px] items-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {t('selectConfident')}
        </button>
        <button
          type="button"
          onClick={() => void handleApply()}
          disabled={isApplying || selectedGroups.length === 0}
          className="inline-flex h-[30px] items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 text-xs font-semibold text-white hover:bg-[var(--primary-hover)] disabled:opacity-50"
        >
          {isApplying && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {t('applySelected', { count: selectedGroups.reduce((sum, g) => sum + g.count, 0) })}
        </button>
      </BankFooterBar>
    </div>
  );
}
