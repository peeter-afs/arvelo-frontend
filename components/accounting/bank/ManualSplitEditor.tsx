'use client';

import { useTranslations } from 'next-intl';
import { Plus, X } from 'lucide-react';
import type { AccountClass, AccountOption } from '@/lib/api/accounting.api';
import { AccountPicker, type SuggestedAccount } from './AccountPicker';
import { RemainderBadge } from './RemainderBadge';

export type ManualPostLine = {
  /** Stable react key; account_id is not usable because rows start empty. */
  key: string;
  account_id: string;
  /** Free text so the field can be cleared mid-typing; parsed on use. */
  amount: string;
};

let lineSeq = 0;

export function emptyManualLine(accountId = '', amount = ''): ManualPostLine {
  lineSeq += 1;
  return { key: `manual-line-${lineSeq}`, account_id: accountId, amount };
}

export function parseManualAmount(value: string): number {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function manualLinesTotal(lines: ManualPostLine[]): number {
  return Math.round(lines.reduce((total, line) => total + parseManualAmount(line.amount), 0) * 100) / 100;
}

/**
 * True once the posting can be committed: every row has an account and, when
 * split, the rows add up to the transaction to the cent. The SQL function
 * demands exact equality, so this is stricter than the 0.01 tolerance the
 * journal composer uses.
 */
export function manualLinesReady(lines: ManualPostLine[], gross: number): boolean {
  if (lines.length === 0) return false;
  if (lines.some((line) => !line.account_id)) return false;
  if (lines.length === 1) return true;
  if (lines.some((line) => parseManualAmount(line.amount) === 0)) return false;
  return Math.abs(gross - manualLinesTotal(lines)) < 0.005;
}

export function ManualSplitEditor({
  accounts,
  lines,
  setLines,
  gross,
  defaultScope,
  suggested,
  suggestedSplit,
  seedAccountId,
  disabled,
  onAccountCreated,
}: {
  accounts: AccountOption[];
  lines: ManualPostLine[];
  setLines: (lines: ManualPostLine[]) => void;
  /** Absolute transaction amount the rows must add up to. */
  gross: number;
  defaultScope: AccountClass;
  suggested: SuggestedAccount[];
  /** Ready-made split rows; amounts are present only when they come from payroll. */
  suggestedSplit: Array<{ account_id: string; code: string; name: string; amount?: number }>;
  /** What the single row was seeded with, so a user's own pick is not overwritten. */
  seedAccountId: string;
  disabled: boolean;
  onAccountCreated?: (message: string) => void;
}) {
  const t = useTranslations('accounting');
  const isSplit = lines.length > 1;
  const remainder = Math.round((gross - manualLinesTotal(lines)) * 100) / 100;

  const update = (index: number, patch: Partial<ManualPostLine>) => {
    setLines(lines.map((line, currentIndex) => (currentIndex === index ? { ...line, ...patch } : line)));
  };

  const startSplit = () => {
    // Take the suggestion only while the single row is still what we put there —
    // an account the user picked themselves must survive turning on the split.
    // Amounts ride along only when they are known (an imported payroll batch);
    // from posting history they stay blank, because last month's figure is not
    // this month's.
    const untouched = !lines[0]?.account_id || lines[0].account_id === seedAccountId;
    if (untouched && suggestedSplit.length > 1) {
      setLines(suggestedSplit.map((row) => emptyManualLine(row.account_id, row.amount != null ? row.amount.toFixed(2) : '')));
      return;
    }
    setLines([{ ...lines[0], amount: gross.toFixed(2) }, emptyManualLine()]);
  };

  const removeRow = (index: number) => {
    const next = lines.filter((_, currentIndex) => currentIndex !== index);
    // Back to one row means back to "the whole transaction", so drop the amount.
    setLines(next.length === 1 ? [{ ...next[0], amount: '' }] : next);
  };

  return (
    <div className="space-y-2">
      {lines.map((line, index) => (
        <div key={line.key} className={isSplit ? 'flex items-start gap-2' : undefined}>
          <div className="min-w-0 flex-1">
            <AccountPicker
              accounts={accounts}
              value={line.account_id}
              onChange={(accountId) => update(index, { account_id: accountId })}
              onAccountCreated={(_account, message) => onAccountCreated?.(message)}
              defaultScope={defaultScope}
              suggested={index === 0 ? suggested : []}
              disabled={disabled}
            />
          </div>
          {isSplit && (
            <>
              <input
                value={line.amount}
                onChange={(event) => update(index, { amount: event.target.value })}
                inputMode="decimal"
                placeholder={t('splitAmount')}
                aria-label={t('splitAmount')}
                disabled={disabled}
                className="h-8 w-[104px] flex-shrink-0 rounded-lg border border-slate-200 px-2 text-right font-mono text-sm tabular-nums"
              />
              <button
                type="button"
                onClick={() => update(index, { amount: (parseManualAmount(line.amount) + remainder).toFixed(2) })}
                disabled={disabled || Math.abs(remainder) < 0.005}
                title={t('fillRemainder')}
                className="h-8 flex-shrink-0 rounded-lg border border-slate-200 px-2 text-[11px] text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                {t('fillRemainder')}
              </button>
              <button
                type="button"
                onClick={() => removeRow(index)}
                disabled={disabled}
                title={t('removeSplitRow')}
                aria-label={t('removeSplitRow')}
                className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      ))}

      <div className="flex items-center gap-3">
        {isSplit ? (
          <>
            <button
              type="button"
              onClick={() => setLines([...lines, emptyManualLine()])}
              disabled={disabled || lines.length >= 50}
              className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[var(--primary)] hover:underline disabled:opacity-40"
            >
              <Plus className="h-3 w-3" />
              {t('addSplitRow')}
            </button>
            <RemainderBadge remainder={remainder} />
          </>
        ) : (
          <button
            type="button"
            onClick={startSplit}
            disabled={disabled}
            className="text-[11.5px] font-medium text-[var(--primary)] hover:underline disabled:opacity-40"
          >
            {t('splitAcrossAccounts')}
          </button>
        )}
      </div>
    </div>
  );
}
