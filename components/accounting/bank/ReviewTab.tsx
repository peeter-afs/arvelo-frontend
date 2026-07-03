'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  AlertCircle,
  CheckCircle2,
  ListChecks,
  RefreshCw,
} from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';
import { accountingApi, type AccountOption } from '@/lib/api/accounting.api';
import { bankingApi, type BankMatchCandidate, type BankReviewQueueItem } from '@/lib/api/banking.api';
import { BankFilterRow, BankProgress, BankSummaryStrip, InfoBox, formatLabel } from './shared';
import { ReviewActionPanel, type ManualAllocation } from './ReviewActionPanel';

type ReviewStateFilter = 'all' | 'pending' | 'reviewed';

export function ReviewTab({
  refreshKey = 0,
  onCountChange,
}: {
  refreshKey?: number;
  onCountChange?: (count: number) => void;
}) {
  const t = useTranslations('accounting');
  const [items, setItems] = useState<BankReviewQueueItem[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [suggestedCandidates, setSuggestedCandidates] = useState<BankMatchCandidate[]>([]);
  const [isQueueLoading, setIsQueueLoading] = useState(true);
  const [isCandidateLoading, setIsCandidateLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [reviewFilter, setReviewFilter] = useState<ReviewStateFilter>('all');
  const [autoMatchableOnly, setAutoMatchableOnly] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [ignoreReason, setIgnoreReason] = useState('');
  const [manualAccountId, setManualAccountId] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  const [manualAllocations, setManualAllocations] = useState<ManualAllocation[]>([]);
  const [dismissReason, setDismissReason] = useState('');

  const selectedItem = useMemo(
    () => items.find((item) => item.transaction_id === selectedTransactionId) || null,
    [items, selectedTransactionId]
  );

  useEffect(() => {
    const load = async () => {
      setIsQueueLoading(true);
      setErrorMessage(null);
      try {
        const [queueResult, accountResult] = await Promise.all([
          bankingApi.getReviewQueue({
            limit: 50,
            auto_matchable_only: autoMatchableOnly || undefined,
            review_state: reviewFilter === 'all' ? undefined : reviewFilter,
          }),
          accountingApi.getAccounts(),
        ]);
        setItems(queueResult.items);
        setAccounts(accountResult);
        setSelectedTransactionId((current) => current || queueResult.items[0]?.transaction_id || null);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsQueueLoading(false);
      }
    };

    void load();
  }, [autoMatchableOnly, reviewFilter, refreshKey]);

  useEffect(() => {
    onCountChange?.(items.length);
  }, [items.length, onCountChange]);

  useEffect(() => {
    if (!selectedItem) {
      setSuggestedCandidates([]);
      setManualAllocations([]);
      return;
    }

    const loadCandidates = async () => {
      setIsCandidateLoading(true);
      setErrorMessage(null);
      try {
        const result = await bankingApi.suggestMatches(selectedItem.transaction_id);
        setSuggestedCandidates(result.candidates);
        setManualAllocations(
          result.candidates.slice(0, 2).map((candidate) => ({
            invoice_id: candidate.invoice_id,
            amount: String(candidate.open_amount),
          }))
        );
        setReviewNote(selectedItem.review_note || '');
        setManualAccountId(selectedItem.suggested_manual_account_id || '');
        setManualDescription(
          selectedItem.description
          || selectedItem.reference
          || selectedItem.counterparty_name
          || ''
        );
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsCandidateLoading(false);
      }
    };

    void loadCandidates();
  }, [selectedItem]);

  const refreshQueue = async (preferredTransactionId?: string | null) => {
    const result = await bankingApi.getReviewQueue({
      limit: 50,
      auto_matchable_only: autoMatchableOnly || undefined,
      review_state: reviewFilter === 'all' ? undefined : reviewFilter,
    });
    setItems(result.items);
    const nextSelected = preferredTransactionId && result.items.some((item) => item.transaction_id === preferredTransactionId)
      ? preferredTransactionId
      : result.items[0]?.transaction_id || null;
    setSelectedTransactionId(nextSelected);
  };

  const runAction = async (key: string, fn: () => Promise<void>) => {
    setActionLoading(key);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await fn();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setActionLoading(null);
    }
  };

  const handleAutoMatch = async () => {
    if (!selectedItem) return;
    await runAction('auto', async () => {
      const result = await bankingApi.autoMatch(selectedItem.transaction_id);
      if (result.auto_matched) {
        setSuccessMessage(t('transactionAutoMatchedAndPosted'));
      } else {
        setSuccessMessage(t('noClearAutoMatchCandidate'));
      }
      await refreshQueue(selectedItem.transaction_id);
    });
  };

  const handleReview = async (state: 'pending' | 'reviewed') => {
    if (!selectedItem) return;
    await runAction(`review-${state}`, async () => {
      await bankingApi.reviewTransaction(selectedItem.transaction_id, {
        review_state: state,
        note: reviewNote || undefined,
      });
      setSuccessMessage(t('transactionMarkedState', { state: t(state) }));
      await refreshQueue(selectedItem.transaction_id);
    });
  };

  const handleIgnore = async () => {
    if (!selectedItem) return;
    await runAction('ignore', async () => {
      await bankingApi.ignoreTransaction(selectedItem.transaction_id, { reason: ignoreReason || undefined });
      setSuccessMessage(t('transactionIgnored'));
      await refreshQueue(selectedItem.transaction_id);
    });
  };

  const handleMarkMissingReceipt = async () => {
    if (!selectedItem) return;
    await runAction('mark-missing-receipt', async () => {
      await bankingApi.markMissingReceipt(selectedItem.transaction_id);
      setSuccessMessage(t('receiptPlaceholderCreated'));
      await refreshQueue(selectedItem.transaction_id);
    });
  };

  const handleDismissMissingReceipt = async () => {
    if (!selectedItem) return;
    await runAction('dismiss-missing-receipt', async () => {
      await bankingApi.dismissMissingReceipt(selectedItem.transaction_id, {
        reason: dismissReason || undefined,
      });
      setDismissReason('');
      setSuccessMessage(t('receiptPlaceholderDismissed'));
      await refreshQueue(selectedItem.transaction_id);
    });
  };

  const handleManualPost = async () => {
    if (!selectedItem || !manualAccountId) return;
    await runAction('manual-post', async () => {
      await bankingApi.manualPost(selectedItem.transaction_id, {
        counter_account_id: manualAccountId,
        description: manualDescription || undefined,
      });
      setSuccessMessage(t('manualPostingCreated'));
      await refreshQueue(selectedItem.transaction_id);
    });
  };

  const handleSingleMatch = async (candidate: BankMatchCandidate) => {
    if (!selectedItem) return;
    await runAction(`match-${candidate.invoice_id}`, async () => {
      await bankingApi.matchInvoice(selectedItem.transaction_id, {
        invoice_id: candidate.invoice_id,
        reference: selectedItem.reference || undefined,
      });
      setSuccessMessage(t('transactionMatchedToInvoice'));
      await refreshQueue(selectedItem.transaction_id);
    });
  };

  const handleSplitMatch = async () => {
    if (!selectedItem) return;
    await runAction('split-match', async () => {
      await bankingApi.matchInvoices(selectedItem.transaction_id, {
        reference: selectedItem.reference || undefined,
        allocations: manualAllocations
          .filter((allocation) => allocation.invoice_id)
          .map((allocation) => ({
            invoice_id: allocation.invoice_id,
            amount: Number(allocation.amount || 0),
          })),
      });
      setSuccessMessage(t('transactionMatchedAcrossInvoices'));
      await refreshQueue(selectedItem.transaction_id);
    });
  };

  const queueCounts = {
    total: items.length,
    autoReady: items.filter((item) => item.auto_match_ready).length,
    reviewed: items.filter((item) => item.review_state === 'reviewed').length,
  };

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="card border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        </div>
      )}

      <BankSummaryStrip
        icon={ListChecks}
        tone="neutral"
        cells={[
          { label: t('queueItems'), value: queueCounts.total },
          { label: t('autoMatchReady'), value: queueCounts.autoReady, color: 'var(--pos, #0e7b5a)' },
          { label: t('reviewed'), value: queueCounts.reviewed },
        ]}
        trailing={
          <BankProgress label={t('reviewed')} done={queueCounts.reviewed} total={queueCounts.total} tone="accent" />
        }
      />

      <BankFilterRow>
        <select
          value={reviewFilter}
          onChange={(event) => setReviewFilter(event.target.value as ReviewStateFilter)}
          aria-label={t('reviewState')}
          className="h-9 rounded-lg border border-slate-200 px-2.5 text-sm text-slate-700"
        >
          <option value="all">{t('all')}</option>
          <option value="pending">{t('pending')}</option>
          <option value="reviewed">{t('reviewed')}</option>
        </select>
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={autoMatchableOnly}
            onChange={(event) => setAutoMatchableOnly(event.target.checked)}
            className="h-4 w-4"
          />
          <span>{t('showOnlyStrongAutoMatch')}</span>
        </label>
        <button
          onClick={() => void refreshQueue(selectedTransactionId)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
        <span className="text-xs text-slate-500">{t('queueViewOnly')}</span>
      </BankFilterRow>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="card overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">{t('transactions')}</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {isQueueLoading ? (
                <div className="p-4 text-sm text-slate-500">{t('loadingQueue')}</div>
              ) : items.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">{t('noUnmatchedTransactions')}</div>
              ) : (
                items.map((item) => (
                  <button
                    key={item.transaction_id}
                    onClick={() => setSelectedTransactionId(item.transaction_id)}
                    className={`block w-full px-4 py-3 text-left transition-colors ${selectedTransactionId === item.transaction_id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-900">
                          {item.counterparty_name || t('unknownCounterparty')}
                        </div>
                        <div className="mt-1 truncate text-xs text-slate-500">
                          {item.reference || item.description || t('noReference')}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.14em] text-slate-400">
                          {typeof item.import_row_no === 'number' && <span>{t('rowNumber', { row: item.import_row_no })}</span>}
                          {item.import_file_name && <span>{item.import_file_name}</span>}
                        </div>
                      </div>
                      <span className="font-mono text-sm text-slate-900">
                        {item.amount.toFixed(2)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                      <span>{item.tx_date}</span>
                      <span>·</span>
                      <span>{item.currency}</span>
                      {item.bank_account_name && (
                        <>
                          <span>·</span>
                          <span>{item.bank_account_name}</span>
                        </>
                      )}
                      {item.auto_match_ready && (
                        <>
                          <span>·</span>
                          <span className="font-medium text-emerald-700">{t('autoReady')}</span>
                        </>
                      )}
                      {item.has_missing_receipt_placeholder && (
                        <>
                          <span>·</span>
                          <span className="font-medium text-amber-600">{t('missingReceiptDraft')}</span>
                        </>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </aside>

        <section className="space-y-4">
          {!selectedItem ? (
            <div className="card p-8 text-sm text-slate-500">{t('selectQueueItem')}</div>
          ) : (
            <>
              <div className="card overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">{selectedItem.counterparty_name || t('bankTransaction')}</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {selectedItem.reference || selectedItem.description || t('noFreeTextReference')} · {selectedItem.tx_date}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-lg font-semibold text-slate-900">
                        {selectedItem.amount.toFixed(2)} {selectedItem.currency}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {t('reviewStateValue', { state: t(selectedItem.review_state || 'pending') })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 p-5 lg:grid-cols-2">
                  <InfoBox label={t('bankAccount')} value={selectedItem.bank_account_name || selectedItem.bank_account_iban || '-'} />
                  <InfoBox label={t('counterpartyAccount')} value={selectedItem.counterparty_account || '-'} />
                  <InfoBox label={t('autoMatch')} value={selectedItem.auto_match_ready ? t('ready') : t('needsReview')} />
                  <InfoBox label={t('description')} value={selectedItem.description || '-'} />
                  <InfoBox label={t('reviewNote')} value={selectedItem.review_note || '-'} />
                  <InfoBox
                    label={t('manualPostDefault')}
                    value={
                      selectedItem.suggested_manual_account_name
                        ? `${selectedItem.suggested_manual_account_code || '-'} · ${selectedItem.suggested_manual_account_name}`
                        : '-'
                    }
                  />
                  <InfoBox
                    label={t('importedRow')}
                    value={typeof selectedItem.import_row_no === 'number' ? t('rowNumber', { row: selectedItem.import_row_no }) : '-'}
                  />
                  <InfoBox
                    label={t('importSource')}
                    value={selectedItem.import_file_name || selectedItem.import_job_id?.slice(0, 8) || '-'}
                  />
                </div>

                {(selectedItem.import_warning_flags?.length || selectedItem.import_parsed_payload) && (
                  <div className="grid gap-4 border-t border-slate-200 px-5 py-5 lg:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{t('importWarnings')}</div>
                      {selectedItem.import_warning_flags && selectedItem.import_warning_flags.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {selectedItem.import_warning_flags.map((flag) => (
                            <span key={flag} className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                              {formatLabel(flag)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-3 text-sm text-slate-500">{t('noImportWarningFlags')}</div>
                      )}
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{t('importedRowPayload')}</div>
                      {selectedItem.import_parsed_payload ? (
                        <pre className="mt-3 max-h-56 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">
                          {JSON.stringify(selectedItem.import_parsed_payload, null, 2)}
                        </pre>
                      ) : (
                        <div className="mt-3 text-sm text-slate-500">{t('noParsedImportPayload')}</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <ReviewActionPanel
                selectedItem={selectedItem}
                accounts={accounts}
                suggestedCandidates={suggestedCandidates}
                isCandidateLoading={isCandidateLoading}
                actionLoading={actionLoading}
                reviewNote={reviewNote}
                setReviewNote={setReviewNote}
                ignoreReason={ignoreReason}
                setIgnoreReason={setIgnoreReason}
                manualAccountId={manualAccountId}
                setManualAccountId={setManualAccountId}
                manualDescription={manualDescription}
                setManualDescription={setManualDescription}
                manualAllocations={manualAllocations}
                setManualAllocations={setManualAllocations}
                dismissReason={dismissReason}
                setDismissReason={setDismissReason}
                onAutoMatch={handleAutoMatch}
                onReview={handleReview}
                onIgnore={handleIgnore}
                onMarkMissingReceipt={handleMarkMissingReceipt}
                onDismissMissingReceipt={handleDismissMissingReceipt}
                onManualPost={handleManualPost}
                onSingleMatch={handleSingleMatch}
                onSplitMatch={handleSplitMatch}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
