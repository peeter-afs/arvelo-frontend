'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileQuestion,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';
import { accountingApi, type AccountOption } from '@/lib/api/accounting.api';
import { bankingApi, type BankAutoMatchPlan, type BankAutoMatchReason, type BankMatchCandidate, type BankReviewQueueItem } from '@/lib/api/banking.api';
import { AddPartnerModal } from '@/components/partners/AddPartnerModal';
import { BankFooterBar, type BankInlineSummaryData } from './shared';
import { PartnerPicker, type PartnerPickerHandle } from './PartnerPicker';
import { ReviewActionPanel, type ManualAllocation } from './ReviewActionPanel';

type ReviewStateFilter = 'all' | 'pending' | 'reviewed';
type ReviewPhase = 'auto' | 'rest';

// Stable identity so the "new draft batch?" check below cannot loop when the
// prop is omitted.
const NO_DRAFT_IDS: string[] = [];
const REVIEW_PAGE_SIZE = 50;

function mergeQueueItems(current: BankReviewQueueItem[], incoming: BankReviewQueueItem[]) {
  const byId = new Map(current.map((item) => [item.transaction_id, item]));
  for (const item of incoming) byId.set(item.transaction_id, item);
  return Array.from(byId.values());
}

/** Default posting description: the counterparty when we have one, else what the bank sent. */
function buildManualDescription(item: BankReviewQueueItem, partnerName: string): string {
  if (partnerName) {
    return item.reference ? `${partnerName} · ${item.reference}` : partnerName;
  }
  return item.description || item.reference || item.counterparty_name || '';
}

function payloadText(item: BankReviewQueueItem, key: string): string {
  const value = item.import_parsed_payload?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

function getBankLineText(item: BankReviewQueueItem): string {
  return payloadText(item, 'raw_description')
    || payloadText(item, 'bank_description')
    || item.import_parsed_payload?.card_descriptor?.raw
    || item.description
    || '';
}

function getDetectedMerchantName(item: BankReviewQueueItem): string {
  return item.counterparty_name?.trim()
    || item.import_parsed_payload?.card_descriptor?.merchant?.trim()
    || '';
}

export function ReviewTab({
  refreshKey = 0,
  onCountChange,
  onSummaryChange,
  autoDraftTxIds = NO_DRAFT_IDS,
  onAutoDraftsHandled,
  initialPhase = 'rest',
}: {
  refreshKey?: number;
  onCountChange?: (count: number) => void;
  onSummaryChange?: (summary: BankInlineSummaryData) => void;
  autoDraftTxIds?: string[];
  onAutoDraftsHandled?: () => void;
  initialPhase?: ReviewPhase;
}) {
  const t = useTranslations('accounting');
  const [items, setItems] = useState<BankReviewQueueItem[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [suggestedCandidates, setSuggestedCandidates] = useState<BankMatchCandidate[]>([]);
  const [autoMatchPlan, setAutoMatchPlan] = useState<BankAutoMatchPlan | undefined>();
  const [autoMatchReason, setAutoMatchReason] = useState<BankAutoMatchReason | undefined>();
  const [isQueueLoading, setIsQueueLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [queueTotal, setQueueTotal] = useState(0);
  const [queueTotalAllStates, setQueueTotalAllStates] = useState(0);
  const [queueBreakdown, setQueueBreakdown] = useState({ total: 0, auto_ready: 0, drafted: 0, pending_other: 0 });
  // Number of backend rows already scanned. This differs from items.length when
  // the client-side "auto ready" filter removes rows from a fetched page.
  const [scannedCount, setScannedCount] = useState(0);
  const [isCandidateLoading, setIsCandidateLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  // Kept apart from errorMessage: reselecting a row reruns the candidate load,
  // which used to clear whatever error the last bulk action had just reported.
  const [candidateError, setCandidateError] = useState<string | null>(null);
  // Pending by default: a transaction that already has a draft purchase invoice has
  // been decided on, and re-reading it in this queue every time is wasted work.
  const [reviewFilter, setReviewFilter] = useState<ReviewStateFilter>('pending');
  const [autoMatchableOnly, setAutoMatchableOnly] = useState(false);
  const [reviewPhase, setReviewPhase] = useState<ReviewPhase>(initialPhase);
  const [hideDrafted, setHideDrafted] = useState(true);
  const [reviewNote, setReviewNote] = useState('');
  const [ignoreReason, setIgnoreReason] = useState('');
  const [manualAccountId, setManualAccountId] = useState('');
  const [manualDescription, setManualDescription] = useState('');
  // Once the accountant edits the description we stop regenerating it.
  const [manualDescriptionDirty, setManualDescriptionDirty] = useState(false);
  const [manualPartnerId, setManualPartnerId] = useState('');
  const [manualPartnerName, setManualPartnerName] = useState('');
  const [manualPartnerType, setManualPartnerType] = useState('');
  const [manualPartnerRegCode, setManualPartnerRegCode] = useState('');
  const [partnerModalOpen, setPartnerModalOpen] = useState(false);
  const [partnerCreateQuery, setPartnerCreateQuery] = useState('');
  const [manualAllocations, setManualAllocations] = useState<ManualAllocation[]>([]);
  const [dismissReason, setDismissReason] = useState('');
  // Bulk selection is a separate axis from the detail selection above: ticking a
  // checkbox never changes which transaction the right-hand panel shows.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [droppedIds, setDroppedIds] = useState<Set<string>>(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [lastBulkMatchedIds, setLastBulkMatchedIds] = useState<string[]>([]);
  // Drafts the import commit created for us; reported here because the import
  // tab is already hidden by the time we land.
  const [lastDraftTxIds, setLastDraftTxIds] = useState<string[]>([]);
  const [seenDraftBatch, setSeenDraftBatch] = useState<string[]>(autoDraftTxIds);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const partnerPickerRef = useRef<PartnerPickerHandle>(null);
  const effectiveAutoMatchableOnly = reviewPhase === 'auto' || autoMatchableOnly;

  useEffect(() => {
    setReviewPhase(initialPhase);
    if (initialPhase === 'auto') {
      setReviewFilter('pending');
      setAutoMatchableOnly(true);
    }
  }, [initialPhase, refreshKey]);

  // A fresh batch of auto-created drafts arrived from the import commit. Compared
  // by identity, which is stable because the parent holds it in state.
  if (autoDraftTxIds !== seenDraftBatch) {
    setSeenDraftBatch(autoDraftTxIds);
    if (autoDraftTxIds.length > 0) {
      setLastDraftTxIds(autoDraftTxIds);
      setSuccessMessage(t('draftsCreatedCount', { count: autoDraftTxIds.length }));
    }
  }

  const selectedItem = useMemo(
    () => items.find((item) => item.transaction_id === selectedTransactionId) || null,
    [items, selectedTransactionId]
  );

  const allSelected = items.length > 0 && items.every((item) => selectedIds.has(item.transaction_id));
  const someSelected = items.some((item) => selectedIds.has(item.transaction_id));

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsQueueLoading(true);
      setErrorMessage(null);
      setSelectedIds(new Set());
      setDroppedIds(new Set());
      setBulkConfirmOpen(false);
      try {
        const [queueResult, accountResult] = await Promise.all([
          bankingApi.getReviewQueue({
            limit: REVIEW_PAGE_SIZE,
            offset: 0,
            auto_matchable_only: effectiveAutoMatchableOnly || undefined,
            review_state: reviewFilter === 'all' ? undefined : reviewFilter,
            hide_drafted: hideDrafted || undefined,
          }),
          accountingApi.getAccounts(),
        ]);
        if (cancelled) return;
        setItems(queueResult.items);
        setQueueTotal(queueResult.total);
        setQueueTotalAllStates(queueResult.total_all_states ?? queueResult.total);
        setQueueBreakdown(queueResult.counts ?? { total: queueResult.total, auto_ready: 0, drafted: 0, pending_other: queueResult.total });
        setScannedCount(Math.min(REVIEW_PAGE_SIZE, queueResult.total));
        setAccounts(accountResult);
        setSelectedTransactionId((current) => (
          current && queueResult.items.some((item) => item.transaction_id === current)
            ? current
            : queueResult.items[0]?.transaction_id || null
        ));
        if (reviewPhase === 'auto') {
          if ((queueResult.counts?.auto_ready ?? 0) === 0) {
            setReviewPhase('rest');
            setAutoMatchableOnly(false);
          } else {
            setSelectedIds(new Set(queueResult.items.filter((item) => item.auto_match_ready).map((item) => item.transaction_id)));
            setBulkConfirmOpen(true);
          }
        }
      } catch (error) {
        if (!cancelled) setErrorMessage(getErrorMessage(error));
      } finally {
        if (!cancelled) setIsQueueLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [effectiveAutoMatchableOnly, hideDrafted, reviewFilter, refreshKey, reviewPhase]);

  useEffect(() => {
    onCountChange?.(queueTotal);
  }, [onCountChange, queueTotal]);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = !allSelected && someSelected;
    }
  }, [allSelected, someSelected]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedItem) {
      setSuggestedCandidates([]);
      setAutoMatchPlan(undefined);
      setAutoMatchReason(undefined);
      setManualAllocations([]);
      return;
    }

    // Seed the manual-posting fields before the request, not after: if
    // suggestMatches fails, values from the previous row would otherwise stay
    // put — and a leaked counterparty would land on a real journal entry.
    setReviewNote(selectedItem.review_note || '');
    setManualAccountId(selectedItem.suggested_manual_account_id || '');
    setManualPartnerId(selectedItem.counterparty_partner_id || '');
    setManualPartnerName(selectedItem.counterparty_partner_name || '');
    setManualPartnerType('');
    setManualPartnerRegCode('');
    setPartnerCreateQuery('');
    setManualDescriptionDirty(false);
    setManualDescription(
      buildManualDescription(selectedItem, selectedItem.counterparty_partner_name || '')
    );

    const loadCandidates = async () => {
      setIsCandidateLoading(true);
      setAutoMatchPlan(undefined);
      setAutoMatchReason(undefined);
      setCandidateError(null);
      try {
        const result = await bankingApi.suggestMatches(selectedItem.transaction_id);
        if (cancelled) return;
        setSuggestedCandidates(result.candidates);
        setAutoMatchPlan(result.auto_match_plan);
        setAutoMatchReason(result.auto_match_reason);
        setManualAllocations(
          result.candidates.slice(0, 2).map((candidate) => ({
            invoice_id: candidate.invoice_id,
            amount: String(candidate.open_amount),
          }))
        );
      } catch (error) {
        if (cancelled) return;
        setCandidateError(getErrorMessage(error));
      } finally {
        if (!cancelled) setIsCandidateLoading(false);
      }
    };

    void loadCandidates();
    return () => { cancelled = true; };
  }, [selectedItem]);

  const refreshQueue = async (preferredTransactionId?: string | null) => {
    const targetScannedCount = Math.max(REVIEW_PAGE_SIZE, scannedCount);
    let offset = 0;
    let total = 0;
    let refreshedItems: BankReviewQueueItem[] = [];
    let totalAllStates = 0;

    do {
      const result = await bankingApi.getReviewQueue({
        limit: REVIEW_PAGE_SIZE,
        offset,
        auto_matchable_only: effectiveAutoMatchableOnly || undefined,
        review_state: reviewFilter === 'all' ? undefined : reviewFilter,
        hide_drafted: hideDrafted || undefined,
      });
      refreshedItems = mergeQueueItems(refreshedItems, result.items);
      total = result.total;
      totalAllStates = result.total_all_states ?? result.total;
      setQueueBreakdown(result.counts ?? { total: result.total, auto_ready: 0, drafted: 0, pending_other: result.total });
      offset += REVIEW_PAGE_SIZE;
    } while (offset < targetScannedCount && offset < total);

    setItems(refreshedItems);
    setQueueTotal(total);
    setQueueTotalAllStates(totalAllStates);
    setScannedCount(Math.min(offset, total));
    const nextSelected = preferredTransactionId && refreshedItems.some((item) => item.transaction_id === preferredTransactionId)
      ? preferredTransactionId
      : refreshedItems[0]?.transaction_id || null;
    setSelectedTransactionId(nextSelected);
  };

  const handleLoadMore = async () => {
    if (isLoadingMore || scannedCount >= queueTotal) return;
    setIsLoadingMore(true);
    setErrorMessage(null);
    try {
      const result = await bankingApi.getReviewQueue({
        limit: REVIEW_PAGE_SIZE,
        offset: scannedCount,
        auto_matchable_only: effectiveAutoMatchableOnly || undefined,
        review_state: reviewFilter === 'all' ? undefined : reviewFilter,
        hide_drafted: hideDrafted || undefined,
      });
      setItems((current) => mergeQueueItems(current, result.items));
      setQueueTotal(result.total);
      setQueueTotalAllStates(result.total_all_states ?? result.total);
      setQueueBreakdown(result.counts ?? { total: result.total, auto_ready: 0, drafted: 0, pending_other: result.total });
      setScannedCount(Math.min(scannedCount + REVIEW_PAGE_SIZE, result.total));
      setSelectedTransactionId((current) => current || result.items[0]?.transaction_id || null);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsLoadingMore(false);
    }
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
    if (!selectedItem || !autoMatchPlan) return;
    const currentIndex = items.findIndex((item) => item.transaction_id === selectedItem.transaction_id);
    const nextId = items[currentIndex + 1]?.transaction_id || items[currentIndex - 1]?.transaction_id || null;
    await runAction('auto', async () => {
      await bankingApi.autoMatch(selectedItem.transaction_id);
      await refreshQueue(nextId);
    });
  };

  const handleReview = async (state: 'pending' | 'reviewed') => {
    if (!selectedItem) return;
    await runAction(`review-${state}`, async () => {
      await bankingApi.reviewTransaction(selectedItem.transaction_id, {
        review_state: state,
        note: reviewNote || undefined,
      });
      await refreshQueue(selectedItem.transaction_id);
    });
  };

  const handleIgnore = async () => {
    if (!selectedItem) return;
    await runAction('ignore', async () => {
      await bankingApi.ignoreTransaction(selectedItem.transaction_id, { reason: ignoreReason || undefined });
      await refreshQueue(selectedItem.transaction_id);
    });
  };

  const handleMarkMissingReceipt = async () => {
    if (!selectedItem) return;
    await runAction('mark-missing-receipt', async () => {
      await bankingApi.markMissingReceipt(selectedItem.transaction_id, {
        partner_id: manualPartnerId || undefined,
        description: manualDescription || undefined,
      });
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
      await refreshQueue(selectedItem.transaction_id);
    });
  };

  const handleManualPost = async () => {
    if (!selectedItem || !manualAccountId) return;
    const account = accounts.find((option) => option.id === manualAccountId);
    await runAction('manual-post', async () => {
      await bankingApi.manualPost(selectedItem.transaction_id, {
        counter_account_id: manualAccountId,
        description: manualDescription || undefined,
        partner_id: manualPartnerId || undefined,
      });
      await refreshQueue(selectedItem.transaction_id);
      const labels = { code: account?.code || '', name: account?.name || '' };
      setSuccessMessage(
        manualPartnerName
          ? t('postedToAccountWithPartner', { ...labels, partner: manualPartnerName })
          : t('postedToAccount', labels)
      );
    });
  };

  // Picking a counterparty re-seeds the description, unless the accountant has
  // already typed their own.
  const handlePartnerChange = (partnerId: string, partnerName: string, partnerType = '', partnerRegCode = '') => {
    setManualPartnerId(partnerId);
    setManualPartnerName(partnerName);
    setManualPartnerType(partnerType);
    setManualPartnerRegCode(partnerRegCode);
    if (!manualDescriptionDirty && selectedItem) {
      setManualDescription(buildManualDescription(selectedItem, partnerName));
    }
  };

  const handleSingleMatch = async (candidate: BankMatchCandidate) => {
    if (!selectedItem) return;
    await runAction(`match-${candidate.invoice_id}`, async () => {
      await bankingApi.matchInvoice(selectedItem.transaction_id, {
        invoice_id: candidate.invoice_id,
        reference: selectedItem.reference || undefined,
      });
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
      await refreshQueue(selectedItem.transaction_id);
    });
  };

  const toggleSelected = (transactionId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(transactionId)) {
        next.delete(transactionId);
      } else {
        next.add(transactionId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((current) => (
      items.length > 0 && items.every((item) => current.has(item.transaction_id))
        ? new Set<string>()
        : new Set(items.map((item) => item.transaction_id))
    ));
  };

  const selectAutoReady = () => {
    setSelectedIds(new Set(items.filter((item) => item.auto_match_ready).map((item) => item.transaction_id)));
  };

  const draftableSelected = items.filter(
    (item) => selectedIds.has(item.transaction_id) && item.amount < 0 && !item.has_missing_receipt_placeholder
  );

  // Manual fallback for rows the import did not draft -- an exclusion rule caught
  // them, auto-create was off, or they arrived before the feature existed.
  const handleBulkCreateDrafts = async () => {
    const ids = draftableSelected.map((item) => item.transaction_id);
    if (ids.length === 0) return;
    await runAction('bulk-drafts', async () => {
      const result = await bankingApi.bulkMarkMissingReceipt(ids);
      setLastDraftTxIds(result.created.map((entry) => entry.transaction_id));
      setSelectedIds(new Set());
      if (result.errors.length > 0) {
        const details = result.errors.slice(0, 3).map((entry) => `${entry.transaction_id.slice(0, 8)}: ${entry.error}`).join(' · ');
        setErrorMessage(`${t('draftsCreatedCount', { count: result.created.length })}\n${details}`);
      } else {
        setSuccessMessage(t('draftsCreatedCount', { count: result.created.length }));
      }
      await refreshQueue(selectedTransactionId);
    });
  };

  const handleBulkAutoMatch = async () => {
    const ids = items
      .filter((item) => selectedIds.has(item.transaction_id) && item.auto_match_summary && !droppedIds.has(item.transaction_id))
      .map((item) => item.transaction_id);
    if (ids.length === 0) return;
    await runAction('bulk-auto-match', async () => {
      const result = await bankingApi.bulkAutoMatch(ids);
      if (result.errors.length > 0 || result.skipped > 0) {
        const summary = t('bulkAutoMatchResult', {
          matched: result.auto_matched.length,
          skipped: result.skipped,
          failed: result.errors.length,
        });
        const details = result.errors.slice(0, 3).map((entry) => `${entry.transaction_id.slice(0, 8)}: ${entry.error}`).join(' · ');
        setErrorMessage(details ? `${summary}\n${details}` : summary);
      } else {
        const matchedIds = new Set(result.auto_matched.map((entry) => entry.transaction_id));
        const matchedTotal = items.filter((item) => matchedIds.has(item.transaction_id)).reduce((sum, item) => sum + Math.abs(item.amount), 0);
        setSuccessMessage(`${t('bulkEntriesCreated', { count: result.auto_matched.length })}\n${t('bulkSettledSummary', { count: result.auto_matched.length, sum: matchedTotal.toFixed(2) })}`);
      }
      setLastBulkMatchedIds(result.auto_matched.map((entry) => entry.transaction_id));
      setSelectedIds(new Set());
      setDroppedIds(new Set());
      setBulkConfirmOpen(false);
      if (reviewPhase === 'auto' && result.auto_matched.length > 0) {
        setReviewPhase('rest');
        setAutoMatchableOnly(false);
      } else {
        await refreshQueue();
      }
    });
  };

  const handleUndoDrafts = async () => {
    if (lastDraftTxIds.length === 0) return;
    await runAction('undo-drafts', async () => {
      const result = await bankingApi.undoAutoDrafts(lastDraftTxIds);
      setLastDraftTxIds([]);
      onAutoDraftsHandled?.();
      setSuccessMessage(t('draftsRemovedCount', { count: result.deleted }));
      await refreshQueue(selectedTransactionId);
    });
  };

  const handleUndoBulk = async () => {
    if (lastBulkMatchedIds.length === 0) return;
    await runAction('undo-bulk', async () => {
      await Promise.all(lastBulkMatchedIds.map((id) => bankingApi.unmatch(id, { reason: 'Bulk auto-match undo' })));
      setLastBulkMatchedIds([]);
      setSuccessMessage(t('matchReverted'));
      await refreshQueue();
    });
  };

  const queueCounts = {
    total: queueTotal,
    autoReady: queueBreakdown.auto_ready,
    // Progress is about the whole queue, not the loaded page: with the default
    // "Ootel" filter the reviewed rows are not among the items at all, so they are
    // counted as the difference between the unfiltered queue and what is pending.
    reviewed: reviewFilter === 'pending'
      ? Math.max(queueTotalAllStates - queueTotal, 0)
      : items.filter((item) => item.review_state === 'reviewed').length,
    progressTotal: reviewFilter === 'pending' ? queueTotalAllStates : queueTotal,
  };

  const selectedIndex = selectedItem
    ? items.findIndex((item) => item.transaction_id === selectedItem.transaction_id)
    : -1;
  const autoReadySelected = items.filter((item) => selectedIds.has(item.transaction_id) && item.auto_match_summary);
  const bulkItems = autoReadySelected;
  const bulkConfirmCount = bulkItems.filter((item) => !droppedIds.has(item.transaction_id)).length;

  useEffect(() => {
    if (!successMessage) return;
    const timeout = window.setTimeout(() => {
      setSuccessMessage(null);
      setLastBulkMatchedIds([]);
    }, lastBulkMatchedIds.length > 0 ? 15000 : 8000);
    return () => window.clearTimeout(timeout);
  }, [lastBulkMatchedIds.length, successMessage]);

  useEffect(() => {
    onSummaryChange?.({
      cells: [
        { label: t('queueItems'), value: queueCounts.total },
        { label: t('autoMatchReady'), value: queueCounts.autoReady, color: 'var(--pos, #0e7b5a)' },
        { label: t('needsReview'), value: queueCounts.total - queueCounts.autoReady },
        { label: t('reviewed'), value: `${queueCounts.reviewed}/${queueCounts.progressTotal}` },
      ],
      progress: { label: t('reviewed'), done: queueCounts.reviewed, total: queueCounts.progressTotal },
    });
  }, [onSummaryChange, queueCounts.autoReady, queueCounts.reviewed, queueCounts.progressTotal, queueCounts.total, t]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.matches('input, select, textarea')) return;
      if ((event.key === 'j' || event.key === 'J' || event.key === 'ArrowDown') && selectedIndex < items.length - 1) {
        event.preventDefault();
        setSelectedTransactionId(items[selectedIndex + 1].transaction_id);
      } else if ((event.key === 'k' || event.key === 'K' || event.key === 'ArrowUp') && selectedIndex > 0) {
        event.preventDefault();
        setSelectedTransactionId(items[selectedIndex - 1].transaction_id);
      } else if (event.key === 'Enter' && autoMatchPlan && !actionLoading && !bulkConfirmOpen) {
        event.preventDefault();
        void handleAutoMatch();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const openBulkConfirm = () => {
    if (selectedIds.size === 0) selectAutoReady();
    setDroppedIds(new Set());
    setBulkConfirmOpen(true);
  };

  const reviewCount = selectedIds.size > 0
    ? autoReadySelected.length
    : items.filter((item) => item.auto_match_ready).length;
  const hasMoreQueueItems = scannedCount < queueTotal;
  const remainingQueueItems = Math.max(queueTotal - items.length, 0);
  const bulkTotal = bulkItems
    .filter((item) => !droppedIds.has(item.transaction_id))
    .reduce((sum, item) => sum + Math.abs(item.amount), 0);
  const bankLineText = selectedItem ? getBankLineText(selectedItem) : '';
  const merchantPrefill = selectedItem ? getDetectedMerchantName(selectedItem) : '';

  return (
    <div className="relative flex h-full min-h-0 flex-col gap-2 overflow-hidden">
      <div className="card flex h-[34px] flex-shrink-0 items-center overflow-hidden text-[11.5px]">
        <div className={`flex h-full flex-1 items-center gap-2 border-r border-slate-200 px-3 ${reviewPhase === 'auto' ? 'bg-orange-50 text-[var(--primary)]' : 'text-slate-500'}`}>
          <span className="font-mono font-bold">1.</span>
          <span className="font-semibold">{t('reviewPhaseAuto', { count: queueBreakdown.auto_ready })}</span>
        </div>
        <div className={`flex h-full flex-1 items-center gap-2 px-3 ${reviewPhase === 'rest' ? 'bg-orange-50 text-[var(--primary)]' : 'text-slate-500'}`}>
          <span className="font-mono font-bold">2.</span>
          <span className="font-semibold">{t('reviewPhaseRest', { count: queueBreakdown.pending_other })}</span>
        </div>
      </div>
      <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[420px_minmax(0,1fr)]">
        <aside className="card flex min-h-0 flex-col overflow-hidden">
          <div className="flex h-[38px] flex-shrink-0 items-center gap-2 border-b border-slate-200 bg-slate-50/80 px-[11px]">
            <input ref={selectAllRef} type="checkbox" checked={allSelected} onChange={toggleSelectAll} disabled={items.length === 0} aria-label={t('all')} className="h-4 w-4 flex-shrink-0" />
            <h2 className="whitespace-nowrap text-[12.5px] font-bold text-slate-900">
              {t('transactions')} · {items.length < queueTotal ? `${items.length}/${queueTotal}` : items.length}
            </h2>
            <div className="flex-1" />
            {reviewPhase === 'rest' && <select value={reviewFilter} onChange={(event) => setReviewFilter(event.target.value as ReviewStateFilter)} aria-label={t('reviewState')} className="h-[26px] max-w-[92px] rounded-md border border-slate-200 bg-white px-1.5 text-[11px] text-slate-700">
              <option value="all">{t('all')}</option><option value="pending">{t('pending')}</option><option value="reviewed">{t('reviewed')}</option>
            </select>}
            {reviewPhase === 'rest' && <button onClick={() => setAutoMatchableOnly((value) => !value)} aria-pressed={autoMatchableOnly} className={`h-[26px] whitespace-nowrap rounded-md border px-2 text-[10.5px] font-semibold ${autoMatchableOnly ? 'border-[var(--primary)] bg-orange-50 text-[var(--primary)]' : 'border-slate-200 bg-white text-slate-600'}`}>{t('onlyAutoReady')}</button>}
            {reviewPhase === 'rest' && <button onClick={() => setHideDrafted((value) => !value)} role="switch" aria-checked={!hideDrafted} className={`h-[26px] whitespace-nowrap rounded-md border px-2 text-[10.5px] font-semibold ${!hideDrafted ? 'border-[var(--primary)] bg-orange-50 text-[var(--primary)]' : 'border-slate-200 bg-white text-slate-600'}`}>
              {hideDrafted ? t('draftedHiddenCount', { count: queueBreakdown.drafted }) : t('showDraftedRows')}
            </button>}
            <button onClick={() => void refreshQueue(selectedTransactionId)} aria-label="Refresh" className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"><RefreshCw className="h-4 w-4" /></button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {isQueueLoading ? <div className="p-4 text-sm text-slate-500">{t('loadingQueue')}</div> : <>
              {items.length === 0 && <div className="p-4 text-sm text-slate-500">{t('noUnmatchedTransactions')}</div>}
              {items.map((item, rowIndex) => {
              const posted = item.matched_status !== 'unmatched';
              return (
                <div key={item.transaction_id} role="row" className={`grid min-h-[46px] grid-cols-[18px_minmax(0,1fr)] gap-2 border-b border-slate-100 px-[11px] py-2 transition-colors ${rowIndex % 2 ? 'bg-slate-50/55' : ''} ${selectedTransactionId === item.transaction_id ? '!bg-blue-50' : 'hover:bg-slate-50'} ${posted ? 'opacity-55' : ''}`}>
                  <input type="checkbox" checked={selectedIds.has(item.transaction_id)} onChange={() => toggleSelected(item.transaction_id)} onClick={(event) => event.stopPropagation()} aria-label={item.counterparty_name || t('unknownCounterparty')} className="mt-0.5 h-4 w-4" />
                  <button onClick={() => setSelectedTransactionId(item.transaction_id)} className="min-w-0 text-left">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-slate-900">{item.counterparty_name || t('unknownCounterparty')}</span>
                      <span className={`flex-shrink-0 font-mono text-[12.5px] font-semibold tabular-nums ${item.amount > 0 ? 'text-emerald-700' : 'text-slate-900'}`}>{item.amount.toFixed(2)} {item.currency}</span>
                    </div>
                    <div className="mt-0.5 flex min-w-0 items-center gap-1.5 overflow-hidden text-[11px] text-slate-500">
                      <span className="min-w-0 truncate">{item.reference || item.description || t('noReference')}</span><span className="flex-shrink-0">· {item.tx_date}</span>
                      <span className={`ml-auto flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${posted ? 'bg-slate-100 text-slate-600' : item.auto_match_summary ? 'bg-emerald-50 text-emerald-700' : item.has_missing_receipt_placeholder ? 'bg-sky-50 text-sky-700' : 'bg-amber-50 text-amber-700'}`}>
                        {posted ? t('postedTag', { invoice: item.auto_match_summary?.invoice_number || '' }) : item.auto_match_summary ? ((item.auto_match_invoice_count || 1) > 1 ? t('matchTagMulti', { count: item.auto_match_invoice_count || 1 }) : t('matchTag', { invoice: item.auto_match_summary.invoice_number })) : item.has_missing_receipt_placeholder ? t('draftTag') : t('awaitingDecision')}
                      </span>
                    </div>
                  </button>
                </div>
              );
              })}
              {hasMoreQueueItems && (
                <div className="flex justify-center border-t border-slate-200 bg-slate-50/80 p-2">
                  <button
                    onClick={() => void handleLoadMore()}
                    disabled={isLoadingMore}
                    className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {isLoadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                    {autoMatchableOnly ? t('loadMore') : t('loadMoreCount', { count: remainingQueueItems })}
                  </button>
                </div>
              )}
            </>}
          </div>
        </aside>

        <section className="card flex min-h-0 flex-col overflow-hidden">
          {bulkConfirmOpen ? (
            <>
              <div className="flex flex-shrink-0 items-start gap-4 border-b border-slate-200 bg-slate-50/80 px-5 py-3">
                <div><h2 className="text-base font-bold text-slate-900">{t('bulkConfirmTitle', { count: bulkConfirmCount })}</h2><p className="mt-0.5 text-xs text-slate-500">{t('bulkConfirmDescription')}</p></div>
                <div className="ml-auto text-right"><div className="font-mono text-[19px] font-bold tabular-nums text-slate-900">{bulkTotal.toFixed(2)} EUR</div><div className="text-[11px] text-slate-500">{t('invoicesToSettle', { count: bulkConfirmCount })}</div></div>
              </div>
              <div className="grid flex-shrink-0 grid-cols-[18px_1.15fr_88px_1fr_110px_54px] gap-2 border-b border-slate-200 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                <span /><span>{t('transactions')}</span><span>{t('amount')}</span><span>{t('linksToInvoice')}</span><span>{t('invoiceOpenAfter')}</span><span>{t('matchScore')}</span>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {bulkItems.map((item) => {
                  const summary = item.auto_match_summary!; const dropped = droppedIds.has(item.transaction_id);
                  return <div key={item.transaction_id} className={`grid grid-cols-[18px_1.15fr_88px_1fr_110px_54px] items-center gap-2 border-b border-slate-100 px-4 py-2 text-[11.5px] ${dropped ? 'opacity-40' : ''}`}>
                    <input type="checkbox" checked={!dropped} onChange={() => setDroppedIds((current) => { const next = new Set(current); if (next.has(item.transaction_id)) next.delete(item.transaction_id); else next.add(item.transaction_id); return next; })} className="h-4 w-4" />
                    <div className="min-w-0"><div className="truncate font-semibold text-slate-900">{item.counterparty_name || t('unknownCounterparty')}</div><div className="truncate font-mono text-[10.5px] text-slate-500">{item.reference || t('noReference')} · {item.tx_date}</div></div>
                    <span className="font-mono font-semibold tabular-nums">{item.amount.toFixed(2)}</span>
                    <div className="min-w-0"><div className="truncate font-semibold">{summary.invoice_number}</div><div className="truncate text-[10.5px] text-slate-500">{summary.partner_name}</div></div>
                    <span className="font-mono text-[10.5px] tabular-nums">{summary.open_amount_before.toFixed(2)} → {summary.open_amount_after.toFixed(2)}</span>
                    <span className="font-mono font-semibold tabular-nums">{summary.score}%</span>
                  </div>;
                })}
              </div>
              <div className="flex-shrink-0 border-t border-slate-200 px-5 py-2 text-[11.5px] text-slate-500">{t('bulkEntriesNote', { count: bulkConfirmCount })}</div>
            </>
          ) : !selectedItem ? (
            <div className="p-8 text-sm text-slate-500">{t('selectQueueItem')}</div>
          ) : (
            <>
              <div className="flex flex-shrink-0 items-center gap-4 border-b border-slate-200 bg-slate-50/80 px-5 py-2.5">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    {!selectedItem.counterparty_partner_id ? (
                      <PartnerPicker
                        ref={partnerPickerRef}
                        value={manualPartnerId}
                        onChange={handlePartnerChange}
                        onRequestCreate={(query) => { setPartnerCreateQuery(query); setPartnerModalOpen(true); }}
                        initialQuery={partnerCreateQuery || selectedItem.counterparty_name || merchantPrefill}
                        fallbackLabel={manualPartnerName}
                        fallbackType={manualPartnerType}
                        fallbackRegCode={manualPartnerRegCode}
                        unselectedLabel={selectedItem.counterparty_name || t('unknownCounterparty')}
                        sourceText={bankLineText}
                        disabled={!!actionLoading}
                      />
                    ) : (
                      <h2 className="truncate text-sm font-semibold text-slate-900">{selectedItem.counterparty_partner_name || selectedItem.counterparty_name || t('bankTransaction')}</h2>
                    )}
                    {selectedItem.import_parsed_payload?.counterparty_source === 'card_descriptor' && (
                      // The statement carried no counterparty; this name was read
                      // out of the card descriptor, so say so rather than implying
                      // the bank sent it.
                      <span title={selectedItem.import_parsed_payload.card_descriptor?.raw || undefined} className="flex-shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">
                        {t('derivedFromCardDescriptor')}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-[11.5px] text-slate-500">{selectedItem.reference || selectedItem.description || t('noFreeTextReference')} · {selectedItem.tx_date}</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <button onClick={() => selectedIndex > 0 && setSelectedTransactionId(items[selectedIndex - 1].transaction_id)} disabled={selectedIndex <= 0} className="inline-flex h-[26px] items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-xs disabled:opacity-35"><ChevronUp className="h-4 w-4" /><kbd>K</kbd></button>
                  <span className="font-mono text-xs tabular-nums text-slate-500">{selectedIndex + 1} / {items.length}</span>
                  <button onClick={() => selectedIndex < items.length - 1 && setSelectedTransactionId(items[selectedIndex + 1].transaction_id)} disabled={selectedIndex < 0 || selectedIndex >= items.length - 1} className="inline-flex h-[26px] items-center gap-1 rounded-md border border-slate-200 bg-white px-2 text-xs disabled:opacity-35"><kbd>J</kbd><ChevronDown className="h-4 w-4" /></button>
                </div>
                <div className="text-right"><div className={`font-mono text-lg font-semibold tabular-nums ${selectedItem.amount > 0 ? 'text-emerald-700' : 'text-slate-900'}`}>{selectedItem.amount.toFixed(2)} {selectedItem.currency}</div><div className="text-[11px] text-slate-500">{t('reviewStateValue', { state: t(selectedItem.review_state || 'pending') })}</div></div>
              </div>
              <div className="flex min-h-0 flex-1 flex-col px-3 pb-1">
                <ReviewActionPanel selectedItem={selectedItem} accounts={accounts} suggestedCandidates={suggestedCandidates} autoMatchPlan={autoMatchPlan} autoMatchReason={autoMatchReason} isCandidateLoading={isCandidateLoading} actionLoading={actionLoading} reviewNote={reviewNote} setReviewNote={setReviewNote} ignoreReason={ignoreReason} setIgnoreReason={setIgnoreReason} manualAccountId={manualAccountId} setManualAccountId={setManualAccountId} manualDescription={manualDescription} setManualDescription={(value) => { setManualDescriptionDirty(true); setManualDescription(value); }} manualPartnerId={manualPartnerId} manualPartnerName={manualPartnerName} manualAllocations={manualAllocations} setManualAllocations={setManualAllocations} dismissReason={dismissReason} setDismissReason={setDismissReason} onAutoMatch={handleAutoMatch} onReview={handleReview} onIgnore={handleIgnore} onMarkMissingReceipt={handleMarkMissingReceipt} onDismissMissingReceipt={handleDismissMissingReceipt} onManualPost={handleManualPost} onSingleMatch={handleSingleMatch} onSplitMatch={handleSplitMatch} onAccountCreated={(message) => { setSuccessMessage(message); void accountingApi.getAccounts({ force: true }).then(setAccounts).catch(() => {}); }} />
              </div>
            </>
          )}
        </section>
      </div>

      <BankFooterBar status={bulkConfirmOpen ? t('toConfirmCount', { count: bulkConfirmCount }) : selectedIds.size > 0 ? `${t('selectedCount', { count: selectedIds.size })} · ${autoReadySelected.length} ${t('autoReady')}` : t('autoReadyCount', { count: queueCounts.autoReady })}>
        {bulkConfirmOpen ? <button onClick={() => setBulkConfirmOpen(false)} className="h-8 rounded-lg px-3 text-xs text-slate-600 hover:bg-slate-50">{t('back')}</button> : selectedIds.size > 0 ? <button onClick={() => setSelectedIds(new Set())} className="h-8 rounded-lg px-3 text-xs text-slate-600 hover:bg-slate-50">{t('clearSelection')}</button> : queueCounts.autoReady > 0 ? <button onClick={selectAutoReady} className="h-8 rounded-lg px-3 text-xs text-[var(--primary)] hover:bg-orange-50">{t('selectAllAutoReady')}</button> : null}
        {!hideDrafted && !bulkConfirmOpen && draftableSelected.length > 0 && <button onClick={handleBulkCreateDrafts} disabled={!!actionLoading} className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">{actionLoading === 'bulk-drafts' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileQuestion className="h-4 w-4" />} {t('createDraftsButton', { count: draftableSelected.length })}</button>}
        <button onClick={bulkConfirmOpen ? handleBulkAutoMatch : openBulkConfirm} disabled={(bulkConfirmOpen ? bulkConfirmCount : reviewCount) === 0 || !!actionLoading} className="inline-flex h-8 items-center gap-2 rounded-lg bg-[var(--primary)] px-3 text-xs font-semibold text-white hover:bg-[var(--primary-hover)] disabled:opacity-50">{actionLoading === 'bulk-auto-match' && <Loader2 className="h-4 w-4 animate-spin" />} {bulkConfirmOpen ? t('confirmNMatches', { count: bulkConfirmCount }) : t('reviewAndConfirm', { count: reviewCount })}</button>
      </BankFooterBar>

      {(errorMessage || candidateError || successMessage) && (() => {
        const toastError = errorMessage || candidateError;
        return (
          <div className={`fixed bottom-5 right-5 z-50 w-[min(420px,calc(100vw-40px))] border-l-4 p-3 shadow-lg ${toastError ? 'border-red-500 bg-red-50 text-red-800' : 'border-emerald-500 bg-white text-slate-800'}`}>
            <div className="flex items-start gap-2">
              {toastError && <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />}
              <span className="whitespace-pre-line text-sm">{toastError || successMessage}</span>
              {!toastError && lastBulkMatchedIds.length > 0 && (
                <button onClick={handleUndoBulk} className="ml-auto flex-shrink-0 text-xs font-semibold text-[var(--primary)]">{t('undo')}</button>
              )}
              {!toastError && lastBulkMatchedIds.length === 0 && lastDraftTxIds.length > 0 && (
                <button onClick={handleUndoDrafts} disabled={!!actionLoading} className="ml-auto flex-shrink-0 text-xs font-semibold text-[var(--primary)] disabled:opacity-50">{t('undo')}</button>
              )}
              {/* Errors stay until dismissed -- they are the ones worth reading. */}
              <button
                onClick={() => { setErrorMessage(null); setCandidateError(null); setSuccessMessage(null); }}
                aria-label={t('close')}
                className={`${(!toastError && (lastBulkMatchedIds.length > 0 || lastDraftTxIds.length > 0)) ? '' : 'ml-auto'} flex-shrink-0 text-slate-400 hover:text-slate-600`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })()}

      <AddPartnerModal
        open={partnerModalOpen}
        onClose={() => {
          setPartnerModalOpen(false);
          window.setTimeout(() => partnerPickerRef.current?.open(), 0);
        }}
        onCreated={(partner) => {
          accountingApi.invalidatePartnersCache();
          handlePartnerChange(partner.id, partner.name, partner.type, partner.reg_code || '');
          setPartnerModalOpen(false);
          setSuccessMessage(t('partnerCreatedAndSelected', { name: partner.name }));
          window.setTimeout(() => partnerPickerRef.current?.focus(), 0);
        }}
        defaultType="supplier"
        prefillName={partnerCreateQuery || merchantPrefill}
        sourceNote={bankLineText || undefined}
      />
    </div>
  );
}
