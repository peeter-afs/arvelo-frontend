'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import {
  accountingApi,
  type AccountOption,
  type JournalEntryRecord,
  type PartnerOption,
} from '@/lib/api/accounting.api';
import { getErrorMessage } from '@/lib/api/client';
import { getIsoToday } from '@/lib/utils/date';
import { useClientDateInput } from '@/lib/hooks/useClientDateInput';
import { Button } from '@/components/ui/Button';
import { Kbd } from '@/components/ui/Kbd';
import { CommandBar } from '@/components/layout/CommandBar';

// ─── Types ────────────────────────────────────────────────────────────────────

type EntryType = 'manual' | 'invoice' | 'payment' | 'adjustment';

type DraftLine = {
  account_id: string;
  partner_id?: string;
  debit: string;
  credit: string;
  description: string;
};

type JournalEntryComposerProps = {
  mode: 'create' | 'edit';
  entryId?: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeid(): string {
  return Math.random().toString(36).slice(2, 10);
}

type DraftLineWithKey = DraftLine & { _key: string };

function emptyLine(): DraftLineWithKey {
  return { _key: makeid(), account_id: '', partner_id: '', debit: '', credit: '', description: '' };
}

function parseAmount(value: string): number {
  const n = parseFloat(value.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/** Format ISO date as DD.MM.YYYY for display */
function isoToDisplay(iso: string): string {
  if (!iso || iso.length < 10) return iso;
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}.${m}.${y}`;
}

/** Parse DD.MM.YYYY display value back to ISO */
function displayToIso(display: string): string {
  const parts = display.split('.');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return display;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AccountCombo({
  value,
  accounts,
  onChange,
}: {
  value: string;
  accounts: AccountOption[];
  onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = accounts.find((a) => a.id === value);

  const filtered =
    query.trim() === ''
      ? accounts.slice(0, 40)
      : accounts
          .filter(
            (a) =>
              a.code.toLowerCase().includes(query.toLowerCase()) ||
              a.name.toLowerCase().includes(query.toLowerCase())
          )
          .slice(0, 40);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        value={open ? query : selected ? `${selected.code} · ${selected.name}` : ''}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
        onFocus={() => {
          setQuery('');
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search account…"
        className="h-8 w-full rounded border border-[var(--a-border)] bg-[var(--a-surface)] px-2 font-mono text-[11.5px] text-[var(--a-text)] placeholder:text-[var(--a-text-3)] outline-none focus:border-[var(--a-accent)]"
      />
      {open && filtered.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-0.5 max-h-48 w-72 overflow-y-auto rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] shadow-lg">
          {filtered.map((a) => (
            <button
              key={a.id}
              type="button"
              onMouseDown={() => {
                onChange(a.id);
                setQuery('');
                setOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-[var(--a-surface-2)]"
            >
              <span className="font-mono text-[11px] text-[var(--a-accent)]">{a.code}</span>
              <span className="truncate text-[12px] text-[var(--a-text)]">{a.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PartnerCombo({
  value,
  partners,
  onChange,
}: {
  value: string;
  partners: PartnerOption[];
  onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = partners.find((p) => p.id === value);

  const filtered =
    query.trim() === ''
      ? partners.slice(0, 40)
      : partners
          .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 40);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        type="text"
        value={open ? query : selected ? selected.name : ''}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
        onFocus={() => {
          setQuery('');
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="No partner"
        className="h-8 w-full rounded border border-[var(--a-border)] bg-[var(--a-surface)] px-2 text-[12.5px] text-[var(--a-text)] placeholder:text-[var(--a-text-3)] outline-none focus:border-[var(--a-accent)]"
      />
      {open && (
        <div className="absolute left-0 top-full z-50 mt-0.5 max-h-48 w-64 overflow-y-auto rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] shadow-lg">
          <button
            type="button"
            onMouseDown={() => {
              onChange('');
              setQuery('');
              setOpen(false);
            }}
            className="flex w-full items-center px-3 py-1.5 text-left text-[12px] text-[var(--a-text-3)] hover:bg-[var(--a-surface-2)]"
          >
            — None
          </button>
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={() => {
                onChange(p.id);
                setQuery('');
                setOpen(false);
              }}
              className="flex w-full items-center px-3 py-1.5 text-left hover:bg-[var(--a-surface-2)]"
            >
              <span className="truncate text-[12px] text-[var(--a-text)]">{p.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function JournalEntryComposer({ mode, entryId }: JournalEntryComposerProps) {
  const t = useTranslations('accounting');
  const router = useRouter();

  // ── Data ────────────────────────────────────────────────────────────────────
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [isLoading, setIsLoading] = useState(mode === 'edit');
  const [isSaving, setIsSaving] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // ── Form fields ─────────────────────────────────────────────────────────────
  const [entryDate, setEntryDate] = useClientDateInput(() => getIsoToday());
  const [displayDate, setDisplayDate] = useState('');
  const [entryNumber, setEntryNumber] = useState('');
  const [entryType, setEntryType] = useState<EntryType>('manual');
  const [reference, setReference] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<DraftLineWithKey[]>([emptyLine(), emptyLine()]);

  // Track which is the "last focused" line index for ⌘D duplicate
  const lastFocusedLineRef = useRef<number>(0);

  // Saved draft ID — once we save in create mode, switch to edit
  const [savedId, setSavedId] = useState<string | undefined>(entryId);

  // ── Load reference data ──────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [accs, parts] = await Promise.all([
          accountingApi.getAccounts(),
          accountingApi.getPartners(),
        ]);
        setAccounts(accs);
        setPartners(parts);
      } catch (err) {
        setErrorMessage(getErrorMessage(err));
      }
    };
    void load();
  }, []);

  // ── Load existing entry (edit mode) ─────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'edit' || !entryId) return;
    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const entry: JournalEntryRecord = await accountingApi.getJournalEntry(entryId);
        setEntryDate(entry.entry_date.slice(0, 10));
        setDisplayDate(isoToDisplay(entry.entry_date.slice(0, 10)));
        setEntryNumber(entry.entry_number ?? '');
        setEntryType((entry.entry_type as EntryType) ?? 'manual');
        setReference(entry.reference_number ?? '');
        setDescription(entry.description ?? '');
        if (entry.rows && entry.rows.length > 0) {
          setLines(
            entry.rows.map((row) => ({
              _key: makeid(),
              account_id: row.account_id,
              partner_id: row.partner_id ?? '',
              debit: row.debit ? String(row.debit) : '',
              credit: row.credit ? String(row.credit) : '',
              description: row.description ?? '',
            }))
          );
        }
      } catch (err) {
        setErrorMessage(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [mode, entryId, setEntryDate]);

  // Keep displayDate in sync when entryDate initialises (create mode)
  useEffect(() => {
    if (entryDate && !displayDate) {
      setTimeout(() => setDisplayDate(isoToDisplay(entryDate)), 0);
    }
  }, [entryDate, displayDate]);

  // ── Totals ──────────────────────────────────────────────────────────────────
  const totalDebit = lines.reduce((sum, l) => sum + parseAmount(l.debit), 0);
  const totalCredit = lines.reduce((sum, l) => sum + parseAmount(l.credit), 0);
  const difference = totalDebit - totalCredit;
  const isBalanced = Math.abs(difference) < 0.01;

  // ── Build payload ────────────────────────────────────────────────────────────
  const buildPayload = useCallback(() => {
    return {
      entry_date: entryDate || getIsoToday(),
      entry_type: entryType,
      description: description || undefined,
      reference_number: reference || undefined,
      rows: lines
        .filter((l) => l.account_id)
        .map((l) => ({
          account_id: l.account_id,
          partner_id: l.partner_id || undefined,
          debit: parseAmount(l.debit),
          credit: parseAmount(l.credit),
          description: l.description || undefined,
        })),
    };
  }, [entryDate, entryType, description, reference, lines]);

  // ── Save draft ───────────────────────────────────────────────────────────────
  const handleSaveDraft = useCallback(async (): Promise<JournalEntryRecord | null> => {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSaving(true);
    try {
      const payload = buildPayload();
      let saved: JournalEntryRecord;
      if (savedId) {
        saved = await accountingApi.updateJournalEntry(savedId, payload);
      } else {
        saved = await accountingApi.createJournalEntry(payload);
        setSavedId(saved.id);
        // Navigate to edit URL so back/refresh works correctly
        router.replace(`/accounting/journal/${saved.id}/edit`);
      }
      setSuccessMessage('Draft saved.');
      setTimeout(() => setSuccessMessage(null), 3000);
      return saved;
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [buildPayload, savedId, router]);

  // ── Post entry ────────────────────────────────────────────────────────────────
  const handlePost = useCallback(async () => {
    const activeLines = lines.filter((l) => l.account_id);
    const validationError: string | null =
      activeLines.length < 2
        ? 'At least two lines with accounts are required.'
        : !isBalanced
          ? `Entry is not balanced. Difference: ${difference.toFixed(2)}`
          : null;
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }
    setIsPosting(true);
    setErrorMessage(null);
    try {
      const saved = await handleSaveDraft();
      if (!saved) {
        setIsPosting(false);
        return;
      }
      await accountingApi.postJournalEntry(saved.id);
      router.push('/accounting/journal');
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
      setIsPosting(false);
    }
  }, [lines, isBalanced, difference, handleSaveDraft, router]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;

      if (e.key === 'Enter') {
        e.preventDefault();
        if (isBalanced) void handlePost();
        return;
      }
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault();
        void handleSaveDraft();
        return;
      }
      if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        const idx = lastFocusedLineRef.current;
        setLines((prev) => {
          const src = prev[idx] ?? prev[prev.length - 1];
          if (!src) return prev;
          const copy: DraftLineWithKey = { ...src, _key: makeid() };
          const next = [...prev];
          next.splice(idx + 1, 0, copy);
          return next;
        });
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isBalanced, handlePost, handleSaveDraft]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') router.back();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [router]);

  // ── Line helpers ──────────────────────────────────────────────────────────────
  const updateLine = (index: number, patch: Partial<DraftLine>) => {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };

  const removeLine = (index: number) => {
    setLines((prev) => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
  };

  const addLine = () => {
    setLines((prev) => [...prev, emptyLine()]);
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  const isWorking = isSaving || isPosting;
  const modeLabel = mode === 'create' ? 'New entry' : (entryNumber || 'Edit entry');

  const commandBarActions = (
    <>
      <Button
        onClick={() => void handleSaveDraft()}
        disabled={isWorking}
      >
        {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Save draft
        <Kbd>⌘S</Kbd>
      </Button>
      <Button
        variant="primary"
        onClick={() => void handlePost()}
        disabled={isWorking || !isBalanced}
      >
        {isPosting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Post entry
        <Kbd inverse>⌘⏎</Kbd>
      </Button>
    </>
  );

  if (isLoading) {
    return (
      <div className="flex min-h-full flex-col">
        <CommandBar crumbs={['Journal', modeLabel]} actions={commandBarActions} />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--a-text-3)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-[var(--a-surface)]">
      <CommandBar crumbs={['Journal', modeLabel]} actions={commandBarActions} />

      <div className="flex flex-1 gap-6 px-4 pb-8 pt-4 sm:px-6 lg:px-7">
        {/* ── Left sticky card ─────────────────────────────────────────────── */}
        <aside className="w-72 shrink-0">
          <div className="sticky top-4 rounded-[10px] border border-[var(--a-border)] bg-[var(--a-surface)] p-4">
            <div className="micro mb-4 text-[var(--a-text-3)]">{t('entryDetails') as string || 'Entry details'}</div>

            <div className="space-y-3.5">
              {/* Date */}
              <div>
                <label className="micro mb-1.5 block text-[var(--a-text-3)]">
                  {t('date') as string || 'Date'}
                </label>
                <input
                  type="text"
                  value={displayDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setDisplayDate(e.target.value);
                    const iso = displayToIso(e.target.value);
                    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) setEntryDate(iso);
                  }}
                  onBlur={() => {
                    const iso = displayToIso(displayDate);
                    if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
                      setEntryDate(iso);
                      setDisplayDate(isoToDisplay(iso));
                    } else {
                      setDisplayDate(isoToDisplay(entryDate));
                    }
                  }}
                  placeholder="DD.MM.YYYY"
                  className="h-9 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] px-3 font-mono text-[13px] text-[var(--a-text)] outline-none focus:border-[var(--a-accent)]"
                />
              </div>

              {/* JE number */}
              <div>
                <label className="micro mb-1.5 block text-[var(--a-text-3)]">
                  JE Number
                </label>
                <input
                  type="text"
                  value={entryNumber || (mode === 'create' ? 'Auto-assigned' : '—')}
                  readOnly
                  className="h-9 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] px-3 font-mono text-[13px] text-[var(--a-text-3)] outline-none"
                />
              </div>

              {/* Type */}
              <div>
                <label className="micro mb-1.5 block text-[var(--a-text-3)]">
                  {t('type') as string || 'Type'}
                </label>
                <select
                  value={entryType}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                    setEntryType(e.target.value as EntryType)
                  }
                  className="h-9 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] px-3 text-[13px] text-[var(--a-text)] outline-none focus:border-[var(--a-accent)]"
                >
                  <option value="manual">Manual</option>
                  <option value="invoice">Invoice</option>
                  <option value="payment">Payment</option>
                  <option value="adjustment">Adjustment</option>
                </select>
              </div>

              {/* Reference */}
              <div>
                <label className="micro mb-1.5 block text-[var(--a-text-3)]">
                  {t('reference') as string || 'Reference'}
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReference(e.target.value)}
                  placeholder="REF-001"
                  className="h-9 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] px-3 text-[13px] text-[var(--a-text)] placeholder:text-[var(--a-text-3)] outline-none focus:border-[var(--a-accent)]"
                />
              </div>

              {/* Partner */}
              <div>
                <label className="micro mb-1.5 block text-[var(--a-text-3)]">
                  {t('partner') as string || 'Partner'}
                </label>
                <PartnerCombo
                  value={partnerId}
                  partners={partners}
                  onChange={setPartnerId}
                />
              </div>
            </div>

            {/* Mobile action buttons */}
            <div className="mt-5 flex flex-col gap-2 lg:hidden">
              <Button
                className="w-full"
                onClick={() => void handleSaveDraft()}
                disabled={isWorking}
              >
                {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save draft
              </Button>
              <Button
                variant="primary"
                className="w-full"
                onClick={() => void handlePost()}
                disabled={isWorking || !isBalanced}
              >
                {isPosting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Post entry
              </Button>
            </div>
          </div>
        </aside>

        {/* ── Right: lines + totals + description ──────────────────────────── */}
        <div className="min-w-0 flex-1">
          {/* Notices */}
          {errorMessage && (
            <div className="mb-4 rounded-lg border border-[var(--a-neg-soft)] bg-[var(--a-neg-soft)] px-4 py-3 text-[13px] text-[var(--a-neg)]">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="mb-4 rounded-lg border border-[var(--a-pos-soft,var(--a-surface-2))] bg-[var(--a-pos-soft,var(--a-surface-2))] px-4 py-3 text-[13px] text-[var(--a-pos)]">
              {successMessage}
            </div>
          )}

          {/* Lines table */}
          <div className="overflow-x-auto rounded-[10px] border border-[var(--a-border)]">
            {/* Header */}
            <div className="grid grid-cols-[1fr_180px_96px_96px_32px] gap-2 border-b border-[var(--a-border)] bg-[var(--a-surface-2)] px-3.5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--a-text-3)]">
              <div>Account</div>
              <div>Description</div>
              <div className="text-right">Debit</div>
              <div className="text-right">Credit</div>
              <div />
            </div>

            {/* Rows */}
            <div>
              {lines.map((line, index) => (
                <div
                  key={line._key}
                  className="grid grid-cols-[1fr_180px_96px_96px_32px] items-center gap-2 border-b border-[var(--a-border)] px-3.5 py-2"
                  onFocus={() => { lastFocusedLineRef.current = index; }}
                >
                  {/* Account picker */}
                  <AccountCombo
                    value={line.account_id}
                    accounts={accounts}
                    onChange={(id) => updateLine(index, { account_id: id })}
                  />

                  {/* Line description */}
                  <input
                    type="text"
                    value={line.description}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateLine(index, { description: e.target.value })
                    }
                    placeholder="Description"
                    className="h-8 w-full rounded border border-[var(--a-border)] bg-[var(--a-surface)] px-2 text-[12.5px] text-[var(--a-text)] placeholder:text-[var(--a-text-3)] outline-none focus:border-[var(--a-accent)]"
                  />

                  {/* Debit */}
                  <input
                    type="text"
                    inputMode="decimal"
                    value={line.debit}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateLine(index, { debit: e.target.value })
                    }
                    placeholder="0.00"
                    className="h-8 w-full rounded border border-[var(--a-border)] bg-[var(--a-surface)] px-2 text-right font-mono text-[12.5px] tabular-nums text-[var(--a-text)] placeholder:text-[var(--a-text-3)] outline-none focus:border-[var(--a-accent)]"
                  />

                  {/* Credit */}
                  <input
                    type="text"
                    inputMode="decimal"
                    value={line.credit}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateLine(index, { credit: e.target.value })
                    }
                    placeholder="0.00"
                    className="h-8 w-full rounded border border-[var(--a-border)] bg-[var(--a-surface)] px-2 text-right font-mono text-[12.5px] tabular-nums text-[var(--a-text)] placeholder:text-[var(--a-text-3)] outline-none focus:border-[var(--a-accent)]"
                  />

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    className="flex h-7 w-7 items-center justify-center rounded text-[var(--a-text-3)] hover:bg-[var(--a-neg-soft)] hover:text-[var(--a-neg)]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add line */}
            <div className="px-3.5 py-2">
              <button
                type="button"
                onClick={addLine}
                className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--a-text-3)] hover:text-[var(--a-text)]"
              >
                <Plus className="h-3.5 w-3.5" />
                Add line
              </button>
            </div>

            {/* Totals row */}
            <div className="grid grid-cols-[1fr_180px_96px_96px_32px] items-center gap-2 border-t border-[var(--a-border)] bg-[var(--a-surface-2)] px-3.5 py-2.5">
              <div className="text-[11.5px] font-medium text-[var(--a-text-2)]">Totals</div>
              <div />
              <div className="text-right font-mono text-[12.5px] font-semibold tabular-nums text-[var(--a-text)]">
                {totalDebit.toFixed(2)}
              </div>
              <div className="text-right font-mono text-[12.5px] font-semibold tabular-nums text-[var(--a-text)]">
                {totalCredit.toFixed(2)}
              </div>
              <div />
            </div>

            {/* Difference row */}
            <div className="flex items-center justify-end gap-3 border-t border-[var(--a-border)] bg-[var(--a-surface-2)] px-3.5 py-2 text-[11.5px]">
              <span className="text-[var(--a-text-3)]">Difference</span>
              <span
                className={`font-mono font-semibold tabular-nums ${
                  isBalanced ? 'text-[var(--a-pos)]' : 'text-[var(--a-neg)]'
                }`}
              >
                {difference.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Description textarea */}
          <div className="mt-5">
            <label className="micro mb-1.5 block text-[var(--a-text-3)]">
              {t('description') as string || 'Description'}
            </label>
            <textarea
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional memo or narrative for this entry…"
              className="w-full resize-y rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] px-3 py-2.5 text-[13px] text-[var(--a-text)] placeholder:text-[var(--a-text-3)] outline-none focus:border-[var(--a-accent)]"
            />
          </div>

          {/* Keyboard hint footer */}
          <div className="mt-4 flex items-center gap-3 font-mono text-[11px] text-[var(--a-text-3)]">
            <span>
              <Kbd>⌘⏎</Kbd>
              {' '}post
            </span>
            <span>·</span>
            <span>
              <Kbd>⌘S</Kbd>
              {' '}save draft
            </span>
            <span>·</span>
            <span>
              <Kbd>⌘D</Kbd>
              {' '}duplicate line
            </span>
            <span>·</span>
            <span>
              <Kbd>Esc</Kbd>
              {' '}back
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
