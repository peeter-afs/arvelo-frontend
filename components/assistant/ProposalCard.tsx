'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Check, Loader2, X } from 'lucide-react';
import type { AssistantItem } from '@/lib/stores/assistant.store';
import { useAssistantStore } from '@/lib/stores/assistant.store';

type ProposalItem = Extract<AssistantItem, { kind: 'proposal' }>;

/** A change the assistant proposed. Nothing happens until the user presses Confirm. */
export function ProposalCard({ item }: { item: ProposalItem }) {
  const t = useTranslations('assistant');
  const confirm = useAssistantStore((state) => state.confirm);
  const cancel = useAssistantStore((state) => state.cancel);
  const { proposal, status } = item;
  const [isPastExpiry, setIsPastExpiry] = useState(false);
  const expired = status === 'pending' && isPastExpiry;

  // The signed proposal stops being accepted at expiresAt; flip the card then.
  useEffect(() => {
    const timer = window.setTimeout(
      () => setIsPastExpiry(true),
      Math.max(0, new Date(proposal.expiresAt).getTime() - Date.now())
    );
    return () => window.clearTimeout(timer);
  }, [proposal.expiresAt]);

  return (
    <div className="rounded-[10px] border border-[var(--a-border-strong)] bg-[var(--a-surface)]">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--a-border)] px-3 py-2">
        <span className="text-[13px] font-semibold text-[var(--a-text)]">{proposal.title}</span>
        <StatusBadge status={status} expired={expired} />
      </div>

      <dl className="space-y-1 px-3 py-2 text-[12.5px]">
        {proposal.rows.map((row, index) => (
          <div key={index} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-2">
            <dt className="text-[var(--a-text-3)]">{row.label}</dt>
            <dd className="break-words font-medium text-[var(--a-text)]">{row.value}</dd>
          </div>
        ))}
      </dl>

      {proposal.warnings.length > 0 && (
        <ul className="mx-3 mb-2 space-y-1 rounded-md bg-[var(--a-warn-soft)] px-2.5 py-1.5 text-[12px] text-[var(--a-warn)]">
          {proposal.warnings.map((warning, index) => (
            <li key={index} className="flex gap-1.5">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              <span>{warning}</span>
            </li>
          ))}
        </ul>
      )}

      {(status === 'pending' || status === 'confirming') && !expired && (
        <div className="flex gap-2 border-t border-[var(--a-border)] px-3 py-2">
          <button
            type="button"
            onClick={() => confirm(proposal.id)}
            disabled={status === 'confirming'}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[var(--a-accent)] px-3 text-[12.5px] font-semibold text-[var(--a-accent-on)] disabled:opacity-60"
          >
            {status === 'confirming' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {t('confirm')}
          </button>
          <button
            type="button"
            onClick={() => cancel(proposal.id)}
            disabled={status === 'confirming'}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[var(--a-border)] px-3 text-[12.5px] font-medium text-[var(--a-text-2)] hover:bg-[var(--a-surface-2)] disabled:opacity-60"
          >
            <X className="h-3.5 w-3.5" />
            {t('cancel')}
          </button>
        </div>
      )}

      {expired && (
        <p className="border-t border-[var(--a-border)] px-3 py-2 text-[12px] text-[var(--a-text-3)]">{t('expired')}</p>
      )}

      {(status === 'done' || status === 'failed') && item.resultMessage && (
        <div
          className={`border-t border-[var(--a-border)] px-3 py-2 text-[12.5px] ${
            status === 'done' ? 'text-[var(--a-pos)]' : 'text-[var(--a-neg)]'
          }`}
        >
          {item.resultMessage}
          {status === 'done' && item.resultLink && (
            <Link href={item.resultLink} className="ml-1.5 text-[var(--a-accent)] underline underline-offset-2">
              {t('view')}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, expired }: { status: ProposalItem['status']; expired: boolean }) {
  const t = useTranslations('assistant');
  const label = expired
    ? t('statusExpired')
    : status === 'done'
      ? t('statusDone')
      : status === 'cancelled'
        ? t('statusCancelled')
        : status === 'failed'
          ? t('statusFailed')
          : t('statusPending');
  const tone =
    status === 'done'
      ? 'bg-[var(--a-pos-soft)] text-[var(--a-pos)]'
      : status === 'failed'
        ? 'bg-[var(--a-neg-soft)] text-[var(--a-neg)]'
        : status === 'cancelled' || expired
          ? 'bg-[var(--a-surface-2)] text-[var(--a-text-3)]'
          : 'bg-[var(--a-accent-soft)] text-[var(--a-accent)]';

  return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${tone}`}>{label}</span>;
}
