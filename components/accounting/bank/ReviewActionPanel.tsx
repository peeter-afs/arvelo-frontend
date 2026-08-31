'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import { useTranslations } from 'next-intl';
import {
  ArrowRight,
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
import type { BankAutoMatchPlan, BankAutoMatchReason, BankMatchCandidate, BankReviewQueueItem } from '@/lib/api/banking.api';
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
  autoMatchPlan?: BankAutoMatchPlan;
  autoMatchReason?: BankAutoMatchReason;
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
  autoMatchPlan,
  autoMatchReason,
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
  // The note field stays out of the way by default so the invoice-match list
  // sits above the fold. Without an explicit toggle it follows the note itself:
  // open when the selected transaction has one, closed when it does not. The
  // override resets whenever the selection changes.
  const [noteOverride, setNoteOverride] = useState<boolean | null>(null);
  const [noteItemId, setNoteItemId] = useState(selectedItem.transaction_id);
  if (noteItemId !== selectedItem.transaction_id) {
    setNoteItemId(selectedItem.transaction_id);
    setNoteOverride(null);
  }
  const showNote = noteOverride ?? !!reviewNote;

  const busy = !!actionLoading;
  // Older payloads carried only `invoice`; fall back so a response cached from
  // before the multi-invoice change still renders.
  const planInvoices = autoMatchPlan
    ? (autoMatchPlan.invoices?.length ? autoMatchPlan.invoices : [autoMatchPlan.invoice])
    : [];

  return (
    <div className="space-y-4">
      {/* The primary decision is shown as a concrete, reviewable posting plan. */}
      <div className="card p-4">
        <div className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.11em] text-slate-500">
          <Sparkles className="h-4 w-4" />
          <span>{autoMatchPlan ? t('whatAutoMatchDoes') : t('noAutoMatch')}</span>
        </div>

        {autoMatchPlan ? (
          <div className="mt-3 grid items-stretch gap-2 lg:grid-cols-[minmax(0,1fr)_20px_minmax(0,1.15fr)]">
            <div className="rounded-lg border border-slate-200 p-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                {planInvoices.length > 1 ? t('linksToNInvoices', { count: planInvoices.length }) : t('linksToInvoice')}
              </div>
              {/* Every invoice the payment settles, so the preview can never
                  understate what confirming actually does. */}
              {planInvoices.map((planInvoice, index) => (
                <div key={planInvoice.invoice_id} className={index > 0 ? 'mt-3 border-t border-dashed border-slate-200 pt-2' : ''}>
                  <div className="mt-1 text-[13px] font-bold text-slate-900">{planInvoice.invoice_number}</div>
                  <div className="truncate text-xs text-slate-600">{planInvoice.partner_name || t('unknownPartner')}</div>
                  <div className="mt-0.5 text-[11px] text-slate-500">{t('dueDate')}: {planInvoice.due_date}</div>
                  <div className="my-2 border-t border-dashed border-slate-200" />
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 text-[11.5px]">
                    <span className="text-slate-500">{t('invoiceOpenBefore')}</span>
                    <span className="font-mono font-semibold tabular-nums">{planInvoice.open_amount_before.toFixed(2)}</span>
                    <span className="text-slate-500">{t('invoiceOpenAfter')}</span>
                    <span className="font-mono font-semibold tabular-nums">
                      {planInvoice.open_amount_after.toFixed(2)}
                      {planInvoice.settles_invoice && <span className="ml-1 text-emerald-700">· {t('invoiceSettled')}</span>}
                    </span>
                  </div>
                </div>
              ))}
              <div className="mt-2 flex flex-wrap gap-1">
                {autoMatchPlan.match_reasons.map((reason) => (
                  <span key={reason} className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] text-slate-600">{formatLabel(reason)}</span>
                ))}
              </div>
            </div>
            <div className="hidden items-center justify-center lg:flex"><ArrowRight className="h-4 w-4 text-slate-400" /></div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-800">
                {t('createsEntry', { date: autoMatchPlan.journal_preview?.entry_date || selectedItem.value_date || selectedItem.tx_date })}
              </div>
              {autoMatchPlan.journal_preview ? (
                <div className="mt-2 space-y-1.5">
                  {autoMatchPlan.journal_preview.lines.map((line, index) => (
                    <div key={`${line.account_code}-${index}`} className="grid grid-cols-[52px_minmax(0,1fr)_auto] gap-2 text-[11.5px]">
                      <span className="font-mono text-slate-500">{line.account_code}</span>
                      <span className="truncate text-slate-700">{line.account_name}</span>
                      <span className="font-mono font-semibold tabular-nums text-slate-900">{line.amount > 0 ? '+' : ''}{line.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-2 text-xs text-slate-500">{t('noInvoiceCandidates')}</div>
              )}
              <p className="mt-3 text-[11.5px] leading-4 text-slate-500">{t('entryPostedNote')}</p>
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-[var(--primary)]/25 bg-orange-50 px-3 py-2 text-xs text-slate-700">
            {autoMatchReason ? t(`autoMatchReason_${autoMatchReason}`) : t('noClearAutoMatchCandidate')}
          </div>
        )}

        <div className="mt-3 flex min-h-9 flex-wrap items-center gap-2">
          {autoMatchPlan && (
            <button onClick={onAutoMatch} disabled={busy} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--primary)] px-3 text-xs font-semibold text-white hover:bg-[var(--primary-hover)] disabled:opacity-50">
              {actionLoading === 'auto' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {t('confirmMatch')} <kbd className="rounded border border-white/30 px-1 text-[10px]">↵</kbd>
            </button>
          )}
          <button onClick={() => document.getElementById('invoice-match-candidates')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50">{t('matchOtherInvoice')}</button>
          <button onClick={() => { setShowOther(true); requestAnimationFrame(() => document.getElementById('other-bank-actions')?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }} className="h-9 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50">{t('postToAccount')}</button>
          <div className="flex-1" />
          <button onClick={onIgnore} disabled={busy} className="h-9 rounded-lg px-3 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">{t('ignoreTransaction')}</button>
        </div>

        <div className="mt-3 border-t border-slate-200 pt-3">
          <div className="flex flex-wrap gap-2">
            <button onClick={() => onReview('reviewed')} disabled={busy} className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              {actionLoading === 'review-reviewed' ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}{t('markReviewed')}
            </button>
            <button onClick={() => onReview('pending')} disabled={busy} className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              {actionLoading === 'review-pending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Filter className="h-4 w-4" />}{t('resetPending')}
            </button>
          </div>

          <div>
            <button
              onClick={() => setNoteOverride(!showNote)}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-700"
            >
              <span>{t('addReviewNote')}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showNote ? 'rotate-180' : ''}`} />
            </button>

            {showNote && (
              <textarea
                value={reviewNote}
                onChange={(event) => setReviewNote(event.target.value)}
                placeholder={t('reviewNote')}
                className="mt-3 min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            )}
          </div>
        </div>
      </div>

      {/* Missing purchase invoice, surfaced rather than buried in "other
          actions": for an outgoing payment this is the everyday state, and the
          draft is now usually created for you at import. Only money out — a
          draft purchase invoice makes no sense for money in. */}
      {selectedItem.amount < 0 && (
        <div className="card flex flex-wrap items-center gap-3 p-4">
          {selectedItem.has_missing_receipt_placeholder ? (
            <>
              <span className="inline-flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                {t('receiptPlaceholderCreated')}
              </span>
              {selectedItem.placeholder_invoice_id && (
                <Link
                  href={`/invoices/${selectedItem.placeholder_invoice_id}/edit`}
                  className="text-sm font-medium text-[var(--primary)] underline"
                >
                  {t('openDraftInvoice')}
                </Link>
              )}
            </>
          ) : (
            <>
              <span className="text-sm text-slate-500">{t('markMissingReceiptDescription')}</span>
              <button
                onClick={onMarkMissingReceipt}
                disabled={busy}
                className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {actionLoading === 'mark-missing-receipt' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileQuestion className="h-4 w-4" />}
                <span>{t('markMissingReceipt')}</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Match to invoice (suggested matches + split) */}
      <div id="invoice-match-candidates" className="card scroll-mt-3 overflow-hidden">
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
      <div id="other-bank-actions" className="card scroll-mt-3 overflow-hidden">
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
