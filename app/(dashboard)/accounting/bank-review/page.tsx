'use client';

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Filter,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Split,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';
import { accountingApi, type AccountOption } from '@/lib/api/accounting.api';
import { bankingApi, type BankMatchCandidate, type BankReviewQueueItem } from '@/lib/api/banking.api';

type ReviewStateFilter = 'all' | 'pending' | 'reviewed';

type ManualAllocation = {
  invoice_id: string;
  amount: string;
};

export default function BankReviewPage() {
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
  }, [autoMatchableOnly, reviewFilter]);

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
        setSuccessMessage('Transaction auto-matched and posted.');
      } else {
        setSuccessMessage('No clear auto-match candidate was available.');
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
      setSuccessMessage(`Transaction marked ${state}.`);
      await refreshQueue(selectedItem.transaction_id);
    });
  };

  const handleIgnore = async () => {
    if (!selectedItem) return;
    await runAction('ignore', async () => {
      await bankingApi.ignoreTransaction(selectedItem.transaction_id, { reason: ignoreReason || undefined });
      setSuccessMessage('Transaction ignored.');
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
      setSuccessMessage('Manual posting created.');
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
      setSuccessMessage('Transaction matched to invoice.');
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
      setSuccessMessage('Transaction matched across multiple invoices.');
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
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Bank Review Queue</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">
          Review unmatched bank transactions, inspect invoice suggestions, mark review state, auto-match strong cases,
          manually match invoices, or create a manual posting.
        </p>
      </div>

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

      <div className="grid gap-3 md:grid-cols-3">
        <SummaryMetric label="Queue items" value={queueCounts.total} />
        <SummaryMetric label="Auto-match ready" value={queueCounts.autoReady} tone="success" />
        <SummaryMetric label="Reviewed" value={queueCounts.reviewed} tone="neutral" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
                <p className="text-xs text-slate-500">Queue view only</p>
              </div>
              <button
                onClick={() => void refreshQueue(selectedTransactionId)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Review state</span>
                <select
                  value={reviewFilter}
                  onChange={(event) => setReviewFilter(event.target.value as ReviewStateFilter)}
                  className="h-11 w-full rounded-lg border border-slate-200 px-3"
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="reviewed">Reviewed</option>
                </select>
              </label>

              <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={autoMatchableOnly}
                  onChange={(event) => setAutoMatchableOnly(event.target.checked)}
                  className="mt-0.5"
                />
                <span>Show only transactions with one strong auto-match candidate.</span>
              </label>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Transactions</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {isQueueLoading ? (
                <div className="p-4 text-sm text-slate-500">Loading queue…</div>
              ) : items.length === 0 ? (
                <div className="p-4 text-sm text-slate-500">No unmatched transactions for this filter.</div>
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
                          {item.counterparty_name || 'Unknown counterparty'}
                        </div>
                        <div className="mt-1 truncate text-xs text-slate-500">
                          {item.reference || item.description || 'No reference'}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.14em] text-slate-400">
                          {typeof item.import_row_no === 'number' && <span>Row {item.import_row_no}</span>}
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
                          <span className="font-medium text-emerald-700">Auto-ready</span>
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
            <div className="card p-8 text-sm text-slate-500">Select a queue item to review suggested matches and take action.</div>
          ) : (
            <>
              <div className="card overflow-hidden">
                <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">{selectedItem.counterparty_name || 'Bank transaction'}</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        {selectedItem.reference || selectedItem.description || 'No free-text reference'} · {selectedItem.tx_date}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-lg font-semibold text-slate-900">
                        {selectedItem.amount.toFixed(2)} {selectedItem.currency}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        Review state {selectedItem.review_state || 'pending'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 p-5 lg:grid-cols-2">
                  <InfoBox label="Bank account" value={selectedItem.bank_account_name || selectedItem.bank_account_iban || '-'} />
                  <InfoBox label="Counterparty account" value={selectedItem.counterparty_account || '-'} />
                  <InfoBox label="Auto-match" value={selectedItem.auto_match_ready ? 'Ready' : 'Needs review'} />
                  <InfoBox label="Description" value={selectedItem.description || '-'} />
                  <InfoBox label="Review note" value={selectedItem.review_note || '-'} />
                  <InfoBox
                    label="Manual-post default"
                    value={
                      selectedItem.suggested_manual_account_name
                        ? `${selectedItem.suggested_manual_account_code || '-'} · ${selectedItem.suggested_manual_account_name}`
                        : '-'
                    }
                  />
                  <InfoBox
                    label="Imported row"
                    value={typeof selectedItem.import_row_no === 'number' ? `Row ${selectedItem.import_row_no}` : '-'}
                  />
                  <InfoBox
                    label="Import source"
                    value={selectedItem.import_file_name || selectedItem.import_job_id?.slice(0, 8) || '-'}
                  />
                </div>

                {(selectedItem.import_warning_flags?.length || selectedItem.import_parsed_payload) && (
                  <div className="grid gap-4 border-t border-slate-200 px-5 py-5 lg:grid-cols-2">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Import warnings</div>
                      {selectedItem.import_warning_flags && selectedItem.import_warning_flags.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {selectedItem.import_warning_flags.map((flag) => (
                            <span key={flag} className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                              {formatLabel(flag)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-3 text-sm text-slate-500">No import warning flags.</div>
                      )}
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Imported row payload</div>
                      {selectedItem.import_parsed_payload ? (
                        <pre className="mt-3 max-h-56 overflow-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-100">
                          {JSON.stringify(selectedItem.import_parsed_payload, null, 2)}
                        </pre>
                      ) : (
                        <div className="mt-3 text-sm text-slate-500">No parsed import payload available.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="card overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-5 py-4">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">Suggested invoice matches</h2>
                      <p className="mt-1 text-sm text-slate-500">Top candidates from backend scoring.</p>
                    </div>
                    <button
                      onClick={() => selectedItem && setSelectedTransactionId(selectedItem.transaction_id)}
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Eye className="h-4 w-4" />
                      <span>Selected tx</span>
                    </button>
                  </div>

                  {isCandidateLoading ? (
                    <div className="p-5 text-sm text-slate-500">Loading candidates…</div>
                  ) : suggestedCandidates.length === 0 ? (
                    <div className="p-5 text-sm text-slate-500">No invoice candidates returned for this transaction.</div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {suggestedCandidates.slice(0, 6).map((candidate) => (
                        <div key={candidate.invoice_id} className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-slate-900">
                                {candidate.invoice_number || candidate.invoice_id.slice(0, 8)}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {candidate.partner_name || 'Unknown partner'} · open {candidate.open_amount.toFixed(2)} {candidate.currency}
                              </div>
                              <div className="mt-2 text-xs text-slate-500">
                                {candidate.match_reasons.map(formatLabel).join(', ')}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700">
                                Score {candidate.score}
                              </div>
                              <button
                                onClick={() => handleSingleMatch(candidate)}
                                disabled={!!actionLoading}
                                className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <ShieldCheck className="h-4 w-4" />
                                <span>Match</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <ActionCard
                    title="Quick actions"
                    description="Use the backend action that fits the transaction best."
                  >
                    <div className="grid gap-3">
                      <button
                        onClick={handleAutoMatch}
                        disabled={!selectedItem.auto_match_ready || !!actionLoading}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {actionLoading === 'auto' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        <span>Auto-match</span>
                      </button>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <button
                          onClick={() => handleReview('reviewed')}
                          disabled={!!actionLoading}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {actionLoading === 'review-reviewed' ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                          <span>Mark reviewed</span>
                        </button>
                        <button
                          onClick={() => handleReview('pending')}
                          disabled={!!actionLoading}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {actionLoading === 'review-pending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
                          <span>Reset pending</span>
                        </button>
                      </div>

                      <textarea
                        value={reviewNote}
                        onChange={(event) => setReviewNote(event.target.value)}
                        placeholder="Review note"
                        className="min-h-24 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    </div>
                  </ActionCard>

                  <ActionCard
                    title="Manual posting"
                    description="No invoice match. Post directly to a counter-account."
                  >
                    <div className="grid gap-3">
                      {selectedItem.suggested_manual_account_name && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                          Suggested default: {selectedItem.suggested_manual_account_code || '-'} · {selectedItem.suggested_manual_account_name}
                        </div>
                      )}
                      <select
                        value={manualAccountId}
                        onChange={(event) => setManualAccountId(event.target.value)}
                        className="h-11 rounded-lg border border-slate-200 px-3"
                      >
                        <option value="">Select counter-account</option>
                        {accounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.code} · {account.name}
                          </option>
                        ))}
                      </select>
                      <input
                        value={manualDescription}
                        onChange={(event) => setManualDescription(event.target.value)}
                        placeholder="Manual posting description"
                        className="h-11 rounded-lg border border-slate-200 px-3"
                      />
                      <button
                        onClick={handleManualPost}
                        disabled={!manualAccountId || !!actionLoading}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {actionLoading === 'manual-post' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        <span>Create manual posting</span>
                      </button>
                    </div>
                  </ActionCard>

                  <ActionCard
                    title="Split match"
                    description="Allocate one bank transaction across multiple invoices."
                  >
                    <div className="space-y-3">
                      {manualAllocations.map((allocation, index) => (
                        <div key={`${allocation.invoice_id}-${index}`} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
                          <select
                            value={allocation.invoice_id}
                            onChange={(event) => updateAllocation(setManualAllocations, index, 'invoice_id', event.target.value)}
                            className="h-10 rounded-lg border border-slate-200 px-3"
                          >
                            <option value="">Select invoice</option>
                            {suggestedCandidates.map((candidate) => (
                              <option key={candidate.invoice_id} value={candidate.invoice_id}>
                                {(candidate.invoice_number || candidate.invoice_id.slice(0, 8))} · {candidate.open_amount.toFixed(2)}
                              </option>
                            ))}
                          </select>
                          <input
                            value={allocation.amount}
                            onChange={(event) => updateAllocation(setManualAllocations, index, 'amount', event.target.value)}
                            className="h-10 rounded-lg border border-slate-200 px-3"
                            placeholder="Amount"
                          />
                        </div>
                      ))}
                      <div className="flex gap-3">
                        <button
                          onClick={() => setManualAllocations((current) => [...current, { invoice_id: '', amount: '' }])}
                          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <Split className="h-4 w-4" />
                          <span>Add allocation</span>
                        </button>
                        <button
                          onClick={handleSplitMatch}
                          disabled={!manualAllocations.some((allocation) => allocation.invoice_id) || !!actionLoading}
                          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {actionLoading === 'split-match' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                          <span>Run split match</span>
                        </button>
                      </div>
                    </div>
                  </ActionCard>

                  <ActionCard
                    title="Ignore transaction"
                    description="Use only when the transaction should stay out of reconciliation."
                  >
                    <div className="grid gap-3">
                      <input
                        value={ignoreReason}
                        onChange={(event) => setIgnoreReason(event.target.value)}
                        placeholder="Reason for ignoring"
                        className="h-11 rounded-lg border border-slate-200 px-3"
                      />
                      <button
                        onClick={handleIgnore}
                        disabled={!!actionLoading}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 px-3 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {actionLoading === 'ignore' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                        <span>Ignore transaction</span>
                      </button>
                    </div>
                  </ActionCard>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  tone?: 'neutral' | 'success';
}) {
  return (
    <div className="card p-5">
      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${tone === 'success' ? 'text-emerald-700' : 'text-slate-900'}`}>{value}</div>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm text-slate-800">{value}</div>
    </div>
  );
}

function ActionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function updateAllocation(
  setAllocations: Dispatch<SetStateAction<ManualAllocation[]>>,
  index: number,
  key: keyof ManualAllocation,
  value: string
) {
  setAllocations((current) => current.map((allocation, currentIndex) => currentIndex === index ? { ...allocation, [key]: value } : allocation));
}

function formatLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}
