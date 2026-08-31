'use client';

import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowRight, ChevronDown, Loader2, Sparkles } from 'lucide-react';
import Link from 'next/link';
import type { AccountOption } from '@/lib/api/accounting.api';
import type { BankAutoMatchPlan, BankAutoMatchReason, BankMatchCandidate, BankReviewQueueItem } from '@/lib/api/banking.api';
import { AccountPicker, type SuggestedAccount } from './AccountPicker';
import { InfoBox, formatLabel } from './shared';

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

// A bank transaction has exactly five possible outcomes. They are mutually
// exclusive, so they are routes with one commit button — not eight buttons of
// equal weight spread over three cards.
type Route = 'match' | 'invoice' | 'account' | 'doc' | 'ignore';

// Literal keys so t() stays type-checked against the catalogue.
const AUTO_MATCH_REASON_KEY = {
  no_document_candidate: 'autoMatchReason_no_document_candidate',
  amount_requires_split: 'autoMatchReason_amount_requires_split',
  ambiguous_candidates: 'autoMatchReason_ambiguous_candidates',
  low_confidence: 'autoMatchReason_low_confidence',
} as const;

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
  onAccountCreated?: (message: string) => void;
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
  onAutoMatch,
  onReview,
  onIgnore,
  onMarkMissingReceipt,
  onDismissMissingReceipt,
  onManualPost,
  onSingleMatch,
  onAccountCreated,
}: Props) {
  const t = useTranslations('accounting');

  // null means "follow the default", so the route moves to `match` by itself
  // once the plan finishes loading, while an explicit click still wins.
  const [route, setRoute] = useState<Route | null>(null);
  const [invoiceQuery, setInvoiceQuery] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [itemId, setItemId] = useState(selectedItem.transaction_id);

  if (itemId !== selectedItem.transaction_id) {
    setItemId(selectedItem.transaction_id);
    setRoute(null);
    setInvoiceQuery('');
    setSelectedInvoiceId('');
    setShowNoteInput(false);
    setShowDetails(false);
  }

  const isOutgoing = selectedItem.amount < 0;
  const hasDraft = selectedItem.has_missing_receipt_placeholder;
  const gross = Math.abs(selectedItem.amount);

  const activeRoute: Route = route
    ?? (autoMatchPlan ? 'match' : suggestedCandidates.length > 0 ? 'invoice' : 'account');

  const busy = !!actionLoading;
  const planInvoices = autoMatchPlan
    ? (autoMatchPlan.invoices?.length ? autoMatchPlan.invoices : [autoMatchPlan.invoice])
    : [];

  const filteredCandidates = useMemo(() => {
    const q = invoiceQuery.trim().toLowerCase();
    if (!q) return suggestedCandidates;
    return suggestedCandidates.filter((candidate) =>
      (candidate.invoice_number || '').toLowerCase().includes(q)
      || (candidate.partner_name || '').toLowerCase().includes(q)
    );
  }, [suggestedCandidates, invoiceQuery]);

  const pickedInvoice = suggestedCandidates.find((candidate) => candidate.invoice_id === selectedInvoiceId);
  const pickedAccount = accounts.find((account) => account.id === manualAccountId);

  const suggestedAccounts: SuggestedAccount[] = useMemo(() => {
    if (selectedItem.suggested_accounts?.length) return selectedItem.suggested_accounts;
    return selectedItem.suggested_manual_account_id
      ? [{
          account_id: selectedItem.suggested_manual_account_id,
          code: selectedItem.suggested_manual_account_code || '',
          name: selectedItem.suggested_manual_account_name || '',
        }]
      : [];
  }, [selectedItem]);

  const routes: Array<{ key: Route; label: string; count?: number; hidden?: boolean }> = [
    { key: 'match', label: t('routeMatch'), hidden: !autoMatchPlan },
    { key: 'invoice', label: t('routeInvoice'), count: suggestedCandidates.length },
    { key: 'account', label: t('routeAccount') },
    { key: 'doc', label: t('routeDoc'), hidden: !isOutgoing },
    { key: 'ignore', label: t('routeIgnore') },
  ];

  const commit = () => {
    if (busy) return;
    if (activeRoute === 'match' && autoMatchPlan) onAutoMatch();
    else if (activeRoute === 'invoice' && pickedInvoice) onSingleMatch(pickedInvoice);
    else if (activeRoute === 'account' && manualAccountId) onManualPost();
    else if (activeRoute === 'doc') onMarkMissingReceipt();
    else if (activeRoute === 'ignore') onIgnore();
  };

  const commitDisabled = busy
    || (activeRoute === 'match' && !autoMatchPlan)
    || (activeRoute === 'invoice' && !pickedInvoice)
    || (activeRoute === 'account' && !manualAccountId)
    || (activeRoute === 'doc' && hasDraft);

  const commitLabel = {
    match: t('confirmMatch'),
    invoice: t('linkSelectedInvoice'),
    account: t('createEntry'),
    doc: t('createDraft'),
    ignore: t('ignoreTransaction'),
  }[activeRoute];

  const summary = (() => {
    if (activeRoute === 'match' && planInvoices.length > 0) {
      return planInvoices.length > 1
        ? t('linksToNInvoices', { count: planInvoices.length })
        : t('willLinkAndPost', { invoice: planInvoices[0].invoice_number, amount: gross.toFixed(2) });
    }
    if (activeRoute === 'invoice') {
      return pickedInvoice
        ? t('willLinkInvoice', { invoice: pickedInvoice.invoice_number || '', partner: pickedInvoice.partner_name || '' })
        : t('pickInvoiceFirst');
    }
    if (activeRoute === 'account') {
      return pickedAccount
        ? t('willPostToAccount', { code: pickedAccount.code, name: pickedAccount.name })
        : t('pickAccountFirst');
    }
    if (activeRoute === 'doc') return t('willCreateDraft');
    return t('willIgnore');
  })();

  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      onKeyDown={(event) => {
        // Enter commits the active route. defaultPrevented covers the account
        // picker, whose own Enter selects an account.
        if (event.key !== 'Enter' || event.defaultPrevented) return;
        if ((event.target as HTMLElement).tagName === 'TEXTAREA') return;
        event.preventDefault();
        if (!commitDisabled) commit();
      }}
    >
      {/* Route tabs — one row, the active one underlined. Stay put while the
          workspace below them scrolls. */}
      <div className="sticky top-0 z-20 flex flex-shrink-0 gap-4 border-b border-slate-200 bg-white px-1">
        {routes.filter((entry) => !entry.hidden).map((entry) => (
          <button
            key={entry.key}
            onClick={() => setRoute(entry.key)}
            className={`-mb-px flex items-center gap-1.5 border-b-2 px-1 py-2 text-xs font-semibold transition-colors ${
              activeRoute === entry.key
                ? 'border-[var(--primary)] text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {entry.label}
            {typeof entry.count === 'number' && entry.count > 0 && (
              <span className="rounded-full bg-slate-100 px-1.5 text-[10px] font-bold text-slate-600">{entry.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Workspace — exactly one route at a time. This is the only scroller. */}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto py-3">
        {activeRoute === 'match' && (
          autoMatchPlan ? (
            <div className="grid items-stretch gap-2 lg:grid-cols-[minmax(0,1fr)_20px_minmax(0,1.15fr)]">
              <div className="rounded-lg border border-slate-200 p-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
                  {planInvoices.length > 1 ? t('linksToNInvoices', { count: planInvoices.length }) : t('linksToInvoice')}
                </div>
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
            <div className="rounded-lg border border-[var(--primary)]/25 bg-orange-50 px-3 py-2 text-xs text-slate-700">
              {autoMatchReason ? t(AUTO_MATCH_REASON_KEY[autoMatchReason]) : t('noClearAutoMatchCandidate')}
            </div>
          )
        )}

        {activeRoute === 'invoice' && (
          <div className="space-y-3">
            <input
              value={invoiceQuery}
              onChange={(event) => setInvoiceQuery(event.target.value)}
              placeholder={t('searchInvoicePlaceholder')}
              className="h-8 w-full rounded-lg border border-slate-200 px-3 text-sm"
            />
            {/* Fixed-height scroll box: the candidate list must never grow the panel. */}
            <div className="max-h-[206px] overflow-y-auto rounded-lg border border-slate-200">
              {isCandidateLoading ? (
                <div className="p-3 text-sm text-slate-500">{t('loadingCandidates')}</div>
              ) : filteredCandidates.length === 0 ? (
                <div className="p-3 text-sm text-slate-500">{t('noOpenInvoiceMatch')}</div>
              ) : (
                filteredCandidates.map((candidate) => {
                  const picked = candidate.invoice_id === selectedInvoiceId;
                  const amountMatches = Math.abs(candidate.open_amount - gross) < 0.01;
                  return (
                    <button
                      key={candidate.invoice_id}
                      onClick={() => setSelectedInvoiceId(candidate.invoice_id)}
                      className={`flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2 text-left last:border-b-0 ${picked ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                    >
                      <span className={`h-3 w-3 flex-shrink-0 rounded-full border ${picked ? 'border-[var(--primary)] bg-[var(--primary)]' : 'border-slate-300'}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-semibold text-slate-900">
                          {candidate.invoice_number || candidate.invoice_id.slice(0, 8)}
                        </span>
                        <span className="block truncate text-[11px] text-slate-500">
                          {candidate.partner_name || t('unknownPartner')} · {candidate.due_date || candidate.invoice_date}
                        </span>
                      </span>
                      {amountMatches && (
                        <span className="flex-shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                          {t('amountMatches')}
                        </span>
                      )}
                      <span className="flex-shrink-0 font-mono text-[12.5px] tabular-nums text-slate-900">
                        {candidate.open_amount.toFixed(2)}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
            {pickedInvoice && (
              <div className="rounded-lg border border-slate-200 p-3 text-[11.5px]">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1">
                  <span className="text-slate-500">{t('invoiceOpenBefore')}</span>
                  <span className="font-mono font-semibold tabular-nums">{pickedInvoice.open_amount.toFixed(2)}</span>
                  <span className="text-slate-500">{t('invoiceOpenAfter')}</span>
                  <span className="font-mono font-semibold tabular-nums">
                    {Math.max(pickedInvoice.open_amount - gross, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {activeRoute === 'account' && (
          <div className="space-y-3">
            <AccountPicker
              accounts={accounts}
              value={manualAccountId}
              onChange={setManualAccountId}
              onAccountCreated={(_account, message) => onAccountCreated?.(message)}
              defaultScope={isOutgoing ? 'expense' : 'income'}
              suggested={suggestedAccounts}
              disabled={busy}
            />
            <input
              value={manualDescription}
              onChange={(event) => setManualDescription(event.target.value)}
              placeholder={t('manualPostingDescriptionPlaceholder')}
              className="h-8 w-full rounded-lg border border-slate-200 px-3 text-sm"
            />
            {pickedAccount && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-800">
                  {t('createsEntry', { date: selectedItem.value_date || selectedItem.tx_date })}
                </div>
                {/* The entry the server actually posts: gross both sides, no VAT
                    split. manual_post_bank_transaction writes two lines with a
                    null tax_rate, so showing a net/VAT breakdown here would
                    promise something the posting never creates. */}
                <div className="mt-2 space-y-1.5">
                  {(isOutgoing
                    ? [
                        { code: pickedAccount.code, name: pickedAccount.name, amount: gross },
                        { code: '', name: selectedItem.bank_account_name || t('bankAccount'), amount: -gross },
                      ]
                    : [
                        { code: '', name: selectedItem.bank_account_name || t('bankAccount'), amount: gross },
                        { code: pickedAccount.code, name: pickedAccount.name, amount: -gross },
                      ]
                  ).map((line, index) => (
                    <div key={index} className="grid grid-cols-[52px_minmax(0,1fr)_auto] gap-2 text-[11.5px]">
                      <span className="font-mono text-slate-500">{line.code}</span>
                      <span className="truncate text-slate-700">{line.name}</span>
                      <span className="font-mono font-semibold tabular-nums text-slate-900">
                        {line.amount > 0 ? '+' : ''}{line.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeRoute === 'doc' && (
          <div className="space-y-3">
            <p className="text-xs text-slate-600">
              {hasDraft ? t('receiptPlaceholderCreated') : t('markMissingReceiptDescription')}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <InfoBox label={t('unknownCounterparty')} value={selectedItem.counterparty_name || '-'} />
              <InfoBox label={t('amount')} value={`${gross.toFixed(2)} ${selectedItem.currency}`} />
            </div>
            {hasDraft ? (
              // The draft already exists (usually auto-created at import), so the
              // only thing left here is to open it or say no receipt is coming.
              <div className="flex flex-wrap items-center gap-3">
                {selectedItem.placeholder_invoice_id && (
                  <Link
                    href={`/invoices/${selectedItem.placeholder_invoice_id}/edit`}
                    className="text-xs font-medium text-[var(--primary)] underline"
                  >
                    {t('openDraftInvoice')}
                  </Link>
                )}
                <button
                  onClick={onDismissMissingReceipt}
                  disabled={busy}
                  className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  {actionLoading === 'dismiss-missing-receipt' && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t('noReceiptExpected')}
                </button>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11.5px] text-slate-600">
                <div>{t('willCreateDraft')}</div>
                <div className="mt-1 font-semibold text-slate-700">{t('noEntryYet')}</div>
              </div>
            )}
          </div>
        )}

        {activeRoute === 'ignore' && (
          <div className="space-y-3">
            <input
              value={ignoreReason}
              onChange={(event) => setIgnoreReason(event.target.value)}
              placeholder={t('reasonPlaceholder')}
              className="h-8 w-full rounded-lg border border-slate-200 px-3 text-sm"
            />
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[11.5px] text-slate-600">
              <div>{t('willIgnore')}</div>
              <div className="mt-1">{t('broughtBackHint')}</div>
            </div>
          </div>
        )}

        {showNoteInput && (
          <input
            value={reviewNote}
            onChange={(event) => setReviewNote(event.target.value)}
            placeholder={t('reviewNote')}
            className="h-8 w-full rounded-lg border border-slate-200 px-3 text-sm"
          />
        )}

        <div className="card overflow-hidden">
          <button onClick={() => setShowDetails((value) => !value)} className="flex w-full items-center justify-between px-4 py-3 text-left">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">{t('transactionDetails')}</h2>
              <p className="text-xs text-slate-500">{t('transactionDetailsDescription')}</p>
            </div>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
          </button>
          {showDetails && (
            <div className="grid gap-3 border-t border-slate-200 p-4 lg:grid-cols-2">
              <InfoBox label={t('bankAccount')} value={selectedItem.bank_account_name || selectedItem.bank_account_iban || '-'} />
              <InfoBox label={t('counterpartyAccount')} value={selectedItem.counterparty_account || '-'} />
              <InfoBox label={t('description')} value={selectedItem.description || '-'} />
              <InfoBox label={t('importSource')} value={selectedItem.import_file_name || selectedItem.import_job_id?.slice(0, 8) || '-'} />
            </div>
          )}
        </div>
      </div>

      {/* Commit bar — one primary button, plus the workflow controls that are
          not outcomes: the note and the review state. */}
      <div className="sticky bottom-0 z-20 flex flex-wrap items-center gap-2 border-t border-slate-200 bg-white/95 px-1 py-2 backdrop-blur-sm">
        <span className="order-[-1] basis-full text-[12px] text-slate-500 sm:order-none sm:basis-auto sm:flex-1">
          {summary}
        </span>

        <button
          onClick={() => setShowNoteInput((value) => !value)}
          className="h-6 rounded-lg px-2 text-[11px] font-medium text-slate-500 hover:bg-slate-50"
        >
          {t('note')}
        </button>

        <div className="flex h-6 items-center overflow-hidden rounded-lg border border-slate-200">
          {(['pending', 'reviewed'] as const).map((state) => (
            <button
              key={state}
              onClick={() => onReview(state)}
              disabled={busy}
              className={`h-full px-2 text-[11px] font-medium disabled:opacity-50 ${
                (selectedItem.review_state || 'pending') === state
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {t(state)}
            </button>
          ))}
        </div>

        <button
          onClick={commit}
          disabled={commitDisabled}
          className={`inline-flex h-8 items-center gap-2 rounded-lg px-3 text-xs font-semibold disabled:opacity-50 ${
            activeRoute === 'ignore'
              ? 'border border-red-200 text-red-700 hover:bg-red-50'
              : 'bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)]'
          }`}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : activeRoute === 'match' ? <Sparkles className="h-4 w-4" /> : null}
          {commitLabel}
          {activeRoute !== 'doc' && activeRoute !== 'ignore' && (
            <kbd className="rounded border border-white/30 px-1 text-[10px]">↵</kbd>
          )}
        </button>
      </div>
    </div>
  );
}
