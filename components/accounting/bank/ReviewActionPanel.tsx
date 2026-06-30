'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import { useTranslations } from 'next-intl';
import {
  CheckCircle2,
  ChevronDown,
  FileQuestion,
  Filter,
  Loader2,
  ShieldCheck,
  Sparkles,
  Split,
  UserCheck,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import type { AccountOption } from '@/lib/api/accounting.api';
import type { BankMatchCandidate, BankReviewQueueItem } from '@/lib/api/banking.api';
import { formatLabel } from './shared';

export type ManualAllocation = {
  invoice_id: string;
  amount: string;
};

export function updateAllocation(
  setAllocations: Dispatch<SetStateAction<ManualAllocation[]>>,
  index: number,
  key: keyof ManualAllocation,
  value: string
) {
  setAllocations((current) => current.map((allocation, currentIndex) => currentIndex === index ? { ...allocation, [key]: value } : allocation));
}

type Props = {
  selectedItem: BankReviewQueueItem;
  accounts: AccountOption[];
  suggestedCandidates: BankMatchCandidate[];
  isCandidateLoading: boolean;
  actionLoading: string | null;
  reviewNote: string;
  setReviewNote: (value: string) => void;
  ignoreReason: string;
  setIgnoreReason: (value: string) => void;
  manualAccountId: string;
  setManualAccountId: (value: string) => void;
  manualDescription: string;
  setManualDescription: (value: string) => void;
  manualAllocations: ManualAllocation[];
  setManualAllocations: Dispatch<SetStateAction<ManualAllocation[]>>;
  dismissReason: string;
  setDismissReason: (value: string) => void;
  onAutoMatch: () => void;
  onReview: (state: 'pending' | 'reviewed') => void;
  onIgnore: () => void;
  onMarkMissingReceipt: () => void;
  onDismissMissingReceipt: () => void;
  onManualPost: () => void;
  onSingleMatch: (candidate: BankMatchCandidate) => void;
  onSplitMatch: () => void;
};

export function ReviewActionPanel({
  selectedItem,
  accounts,
  suggestedCandidates,
  isCandidateLoading,
  actionLoading,
  reviewNote,
  setReviewNote,
  ignoreReason,
  setIgnoreReason,
  manualAccountId,
  setManualAccountId,
  manualDescription,
  setManualDescription,
  manualAllocations,
  setManualAllocations,
  dismissReason,
  setDismissReason,
  onAutoMatch,
  onReview,
  onIgnore,
  onMarkMissingReceipt,
  onDismissMissingReceipt,
  onManualPost,
  onSingleMatch,
  onSplitMatch,
}: Props) {
  const t = useTranslations('accounting');
  const [showSplit, setShowSplit] = useState(false);
  const [showOther, setShowOther] = useState(false);

  const busy = !!actionLoading;

  return (
    <div className="space-y-4">
      {/* Primary action row */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-900">{t('quickActions')}</h2>
        <p className="mt-1 text-sm text-slate-500">{t('quickActionsDescription')}</p>
        <div className="mt-4 grid gap-3">
          <button
            onClick={onAutoMatch}
            disabled={!selectedItem.auto_match_ready || busy}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {actionLoading === 'auto' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            <span>{t('autoMatch')}</span>
          </button>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => onReview('reviewed')}
              disabled={busy}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionLoading === 'review-reviewed' ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
              <span>{t('markReviewed')}</span>
            </button>
            <button
              onClick={() => onReview('pending')}
              disabled={busy}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionLoading === 'review-pending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}
              <span>{t('resetPending')}</span>
            </button>
          </div>

          <textarea
            value={reviewNote}
            onChange={(event) => setReviewNote(event.target.value)}
            placeholder={t('reviewNote')}
            className="min-h-24 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* Match to invoice (suggested matches + split) */}
      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">{t('matchToInvoice')}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('suggestedInvoiceMatchesDescription')}</p>
        </div>

        {isCandidateLoading ? (
          <div className="p-5 text-sm text-slate-500">{t('loadingCandidates')}</div>
        ) : suggestedCandidates.length === 0 ? (
          <div className="p-5 text-sm text-slate-500">{t('noInvoiceCandidates')}</div>
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
                      {candidate.partner_name || t('unknownPartner')} · {t('openAmountValue', { amount: candidate.open_amount.toFixed(2), currency: candidate.currency })}
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      {candidate.match_reasons.map(formatLabel).join(', ')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-700">
                      {t('scoreValue', { score: candidate.score })}
                    </div>
                    <button
                      onClick={() => onSingleMatch(candidate)}
                      disabled={busy}
                      className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      <span>{t('match')}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-slate-200 p-4">
          <button
            onClick={() => setShowSplit((value) => !value)}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-700"
          >
            <Split className="h-4 w-4" />
            <span>{t('splitAcrossInvoices')}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showSplit ? 'rotate-180' : ''}`} />
          </button>

          {showSplit && (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-slate-500">{t('splitMatchDescription')}</p>
              {manualAllocations.map((allocation, index) => (
                <div key={`${allocation.invoice_id}-${index}`} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
                  <select
                    value={allocation.invoice_id}
                    onChange={(event) => updateAllocation(setManualAllocations, index, 'invoice_id', event.target.value)}
                    className="h-10 rounded-lg border border-slate-200 px-3"
                  >
                    <option value="">{t('selectInvoice')}</option>
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
                    placeholder={t('amount')}
                  />
                </div>
              ))}
              <div className="flex gap-3">
                <button
                  onClick={() => setManualAllocations((current) => [...current, { invoice_id: '', amount: '' }])}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Split className="h-4 w-4" />
                  <span>{t('addAllocation')}</span>
                </button>
                <button
                  onClick={onSplitMatch}
                  disabled={!manualAllocations.some((allocation) => allocation.invoice_id) || busy}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionLoading === 'split-match' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  <span>{t('runSplitMatch')}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Other actions (collapsed by default) */}
      <div className="card overflow-hidden">
        <button
          onClick={() => setShowOther((value) => !value)}
          className="flex w-full items-center justify-between px-5 py-4 text-left"
        >
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{t('otherActions')}</h2>
            <p className="mt-1 text-sm text-slate-500">{t('otherActionsDescription')}</p>
          </div>
          <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${showOther ? 'rotate-180' : ''}`} />
        </button>

        {showOther && (
          <div className="space-y-5 border-t border-slate-200 p-5">
            {/* Manual posting */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900">{t('manualPosting')}</h3>
              <p className="mt-1 text-sm text-slate-500">{t('manualPostingDescription')}</p>
              <div className="mt-3 grid gap-3">
                {selectedItem.suggested_manual_account_name && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    {t('suggestedDefault', { account: `${selectedItem.suggested_manual_account_code || '-'} · ${selectedItem.suggested_manual_account_name}` })}
                  </div>
                )}
                <select
                  value={manualAccountId}
                  onChange={(event) => setManualAccountId(event.target.value)}
                  className="h-11 rounded-lg border border-slate-200 px-3"
                >
                  <option value="">{t('selectCounterAccount')}</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.code} · {account.name}
                    </option>
                  ))}
                </select>
                <input
                  value={manualDescription}
                  onChange={(event) => setManualDescription(event.target.value)}
                  placeholder={t('manualPostingDescriptionPlaceholder')}
                  className="h-11 rounded-lg border border-slate-200 px-3"
                />
                <button
                  onClick={onManualPost}
                  disabled={!manualAccountId || busy}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionLoading === 'manual-post' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  <span>{t('createManualPosting')}</span>
                </button>
              </div>
            </div>

            {/* Ignore */}
            <div className="border-t border-slate-200 pt-5">
              <h3 className="text-sm font-semibold text-slate-900">{t('ignoreTransaction')}</h3>
              <p className="mt-1 text-sm text-slate-500">{t('ignoreTransactionDescription')}</p>
              <div className="mt-3 grid gap-3">
                <input
                  value={ignoreReason}
                  onChange={(event) => setIgnoreReason(event.target.value)}
                  placeholder={t('reasonForIgnoring')}
                  className="h-11 rounded-lg border border-slate-200 px-3"
                />
                <button
                  onClick={onIgnore}
                  disabled={busy}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-red-200 px-3 text-sm text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {actionLoading === 'ignore' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                  <span>{t('ignoreTransaction')}</span>
                </button>
              </div>
            </div>

            {/* Missing receipt (only for outgoing payments) */}
            {selectedItem.amount < 0 && (
              <div className="border-t border-slate-200 pt-5">
                <h3 className="text-sm font-semibold text-slate-900">{t('markMissingReceipt')}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedItem.has_missing_receipt_placeholder ? t('receiptPlaceholderCreated') : t('markMissingReceiptDescription')}
                </p>
                <div className="mt-3 grid gap-3">
                  {selectedItem.has_missing_receipt_placeholder ? (
                    <>
                      <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{t('receiptPlaceholderCreated')}</span>
                      </div>
                      {selectedItem.placeholder_invoice_id && (
                        <Link
                          href={`/invoices/${selectedItem.placeholder_invoice_id}/edit`}
                          className="text-sm font-medium text-[var(--primary)] underline"
                        >
                          {t('openDraftInvoice')}
                        </Link>
                      )}
                      <input
                        value={dismissReason}
                        onChange={(event) => setDismissReason(event.target.value)}
                        placeholder={t('dismissReason')}
                        className="h-11 rounded-lg border border-slate-200 px-3"
                      />
                      <button
                        onClick={onDismissMissingReceipt}
                        disabled={busy}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {actionLoading === 'dismiss-missing-receipt' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                        <span>{t('noReceiptExpected')}</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={onMarkMissingReceipt}
                        disabled={busy}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-3 text-sm text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {actionLoading === 'mark-missing-receipt' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileQuestion className="h-4 w-4" />}
                        <span>{t('markMissingReceipt')}</span>
                      </button>
                      <button
                        onClick={onDismissMissingReceipt}
                        disabled={busy}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {actionLoading === 'dismiss-missing-receipt' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                        <span>{t('noReceiptExpected')}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
