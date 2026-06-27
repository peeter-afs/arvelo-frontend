'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Copy,
  Download,
  Filter,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Upload,
} from 'lucide-react';
import { accountingApi, type AccountOption, type JournalEntryRecord, type JournalLineRecord } from '@/lib/api/accounting.api';
import { getErrorMessage } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';
import { Kbd } from '@/components/ui/Kbd';
import { Stat } from '@/components/ui/Stat';
import { StatusPill } from '@/components/ui/StatusPill';
import { SplitPane, SplitPaneDetail } from '@/components/layout/SplitPane';

type JournalEntryWithRows = JournalEntryRecord & { rows?: JournalLineRecord[] };

function formatEUR(value: number) {
  return new Intl.NumberFormat('et-EE', { style: 'currency', currency: 'EUR' }).format(value);
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('et-EE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function humanize(value?: string | null) {
  return value ? value.replace(/_/g, ' ') : '-';
}

function entryAmount(entry: JournalEntryWithRows) {
  if (!entry.rows?.length) return null;
  const debit = entry.rows.reduce((sum, row) => sum + Number(row.debit || 0), 0);
  const credit = entry.rows.reduce((sum, row) => sum + Number(row.credit || 0), 0);
  return Math.max(debit, credit);
}

export default function JournalEntriesPage() {
  const router = useRouter();
  const t = useTranslations('accounting');
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [entries, setEntries] = useState<JournalEntryRecord[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntryWithRows | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

  const accountMap = useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts]);

  const filtered = useMemo(() => {
    return entries.filter((entry) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        (entry.entry_number || '').toLowerCase().includes(query) ||
        (entry.description || '').toLowerCase().includes(query) ||
        (entry.reference_number || '').toLowerCase().includes(query) ||
        (entry.entry_type || '').toLowerCase().includes(query)
      );
    });
  }, [entries, searchQuery]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [entryData, accountData] = await Promise.all([
          accountingApi.listJournalEntries({ limit: 100 }),
          accountingApi.getAccounts(),
        ]);
        setEntries(entryData);
        setAccounts(accountData);
        if (entryData[0]) {
          try {
            const detail = await accountingApi.getJournalEntry(entryData[0].id);
            setSelectedEntry(detail);
          } catch {
            setSelectedEntry(entryData[0]);
          }
        }
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const handleSelect = async (entry: JournalEntryRecord) => {
    setSelectedEntry(entry);
    setIsDetailLoading(true);
    try {
      const detail = await accountingApi.getJournalEntry(entry.id);
      setSelectedEntry(detail);
    } catch {
      setSelectedEntry({ ...entry, rows: [] });
    } finally {
      setIsDetailLoading(false);
    }
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditingText = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName || '');

      if (event.key === '/' && !isEditingText) {
        event.preventDefault();
        searchRef.current?.focus();
        return;
      }

      if (isEditingText) return;

      if (event.key.toLowerCase() === 'u') {
        event.preventDefault();
        router.push('/accounting/journal/new');
        return;
      }

      if (filtered.length === 0) return;
      const currentIndex = Math.max(0, filtered.findIndex((entry) => entry.id === selectedEntry?.id));

      if (event.key.toLowerCase() === 'j') {
        event.preventDefault();
        void handleSelect(filtered[Math.min(filtered.length - 1, currentIndex + 1)]);
      }
      if (event.key.toLowerCase() === 'k') {
        event.preventDefault();
        void handleSelect(filtered[Math.max(0, currentIndex - 1)]);
      }
      if (event.key.toLowerCase() === 'm' && selectedEntry) {
        event.preventDefault();
        router.push(`/accounting/journal/${selectedEntry.id}/edit`);
      }
      if (event.key.toLowerCase() === 'd' && selectedEntry && !selectedEntry.is_posted) {
        event.preventDefault();
        router.push(`/accounting/journal/new?duplicate=${selectedEntry.id}`);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, selectedEntry?.id]);

  const draftCount = entries.filter((entry) => !entry.is_posted).length;
  const postedCount = entries.filter((entry) => entry.is_posted).length;
  const visibleAmount = filtered.reduce((sum, entry) => sum + (entryAmount(entry) || 0), 0);
  const selectedRows = selectedEntry?.rows || [];
  const totalDebit = selectedRows.reduce((sum, row) => sum + Number(row.debit || 0), 0);
  const totalCredit = selectedRows.reduce((sum, row) => sum + Number(row.credit || 0), 0);

  const accountLabel = (id?: string | null) => {
    if (!id) return '-';
    const account = accountMap.get(id);
    return account ? `${account.code} · ${account.name}` : id.slice(0, 8);
  };

  const firstDebit = (entry: JournalEntryWithRows) => entry.rows?.find((row) => Number(row.debit || 0) > 0);
  const firstCredit = (entry: JournalEntryWithRows) => entry.rows?.find((row) => Number(row.credit || 0) > 0);

  return (
    <div className="flex min-h-full flex-col gap-4">
      <div className="flex flex-col gap-3 border-b border-[var(--a-border)] pb-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="micro text-[var(--a-text-3)]">{t('journalWorkspace')}</div>
          <h1 className="mt-1 text-[28px] font-semibold leading-none text-[var(--a-text)]">{t('journalEntries')}</h1>
          <p className="mt-2 text-[13px] text-[var(--a-text-2)]">{t('entriesInView', { count: filtered.length })}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button>
            <Upload className="h-3.5 w-3.5" />
            {t('import')}
          </Button>
          <Button>
            <Download className="h-3.5 w-3.5" />
            {t('export')}
          </Button>
          <Button variant="primary" onClick={() => router.push('/accounting/journal/new')}>
            <Plus className="h-3.5 w-3.5" />
            {t('newEntry')}
            <Kbd inverse>U</Kbd>
          </Button>
        </div>
      </div>

      <div className="grid border-b border-[var(--a-border)] pb-4 md:grid-cols-4">
        <Stat label={t('postedEntries')} value={postedCount} subtle={t('currentLedger')} delta="+8.4%" />
        <Stat label={t('draftsToReview')} value={draftCount} subtle={t('oldestDraftFirst')} tone="warning" />
        <Stat label={t('visibleMovement')} value={formatEUR(visibleAmount)} subtle={t('rowsCount', { count: filtered.length })} />
        <Stat label={t('bookBalance')} value={Math.abs(totalDebit - totalCredit) < 0.01 ? t('balanced') : t('openState')} subtle={t('selectedEntryLabel')} tone="positive" check />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1">
          {[
            ['all', t('all'), entries.length, true],
            ['posted', t('posted'), postedCount, false],
            ['drafts', t('drafts'), draftCount, false],
            ['manual', t('manual'), entries.filter((entry) => entry.entry_type === 'manual').length, false],
          ].map(([id, label, count, active]) => (
            <button
              key={id as string}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] font-medium ${
                active
                  ? 'bg-[var(--a-text)] text-white'
                  : 'text-[var(--a-text-2)] hover:bg-[var(--a-surface-2)]'
              }`}
            >
              {label}
              <span className={active ? 'text-white/60' : id === 'drafts' ? 'text-[var(--a-accent)]' : 'text-[var(--a-text-3)]'}>
                {count}
              </span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative block w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--a-text-3)]" />
            <input
              ref={searchRef}
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t('searchEntries')}
              className="h-9 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] pl-9 pr-3 text-[13px] text-[var(--a-text)] outline-none"
            />
          </label>
          <Button>
            <Filter className="h-3.5 w-3.5" />
            {t('filter')}
          </Button>
          <div className="hidden items-center gap-1 text-[11.5px] text-[var(--a-text-3)] lg:flex">
            <Kbd>J</Kbd>
            <Kbd>K</Kbd>
            <span>{t('navigateHint')}</span>
            <span>·</span>
            <Kbd>M</Kbd>
            <span>{t('editHint')}</span>
            <span>·</span>
            <Kbd>D</Kbd>
            <span>{t('duplicateHint')}</span>
          </div>
        </div>
      </div>

      {error && <div className="rounded-lg border border-[var(--a-neg-soft)] bg-[var(--a-neg-soft)] p-4 text-sm text-[var(--a-neg)]">{error}</div>}

      <SplitPane className="flex-1">
        <section className="min-h-[520px] overflow-hidden rounded-[10px] border border-[var(--a-border)] bg-[var(--a-surface)]">
          <div className="grid grid-cols-[24px_96px_92px_minmax(180px,1fr)_120px_120px_120px_90px] gap-2 border-b border-[var(--a-border)] bg-[var(--a-surface-2)] px-3.5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--a-text-3)]">
            <div />
            <div>{t('jeCode')}</div>
            <div>{t('date')}</div>
            <div>{t('description')}</div>
            <div>{t('debit')}</div>
            <div>{t('credit')}</div>
            <div className="text-right">{t('total')}</div>
            <div className="text-right">{t('status')}</div>
          </div>

          <div className="max-h-[calc(100vh-390px)] min-h-[430px] overflow-y-auto">
            {isLoading ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--a-text-3)]" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-sm text-[var(--a-text-3)]">{searchQuery ? t('noResults') : t('noJournalEntries')}</div>
            ) : (
              filtered.map((entry, index) => {
                const selected = selectedEntry?.id === entry.id;
                const debit = firstDebit(entry);
                const credit = firstCredit(entry);
                const amount = entryAmount(entry);

                return (
                  <button
                    key={entry.id}
                    onClick={() => void handleSelect(entry)}
                    className={`grid w-full grid-cols-[24px_96px_92px_minmax(180px,1fr)_120px_120px_120px_90px] items-center gap-2 border-b border-[var(--a-border)] px-3.5 py-3 text-left text-[13px] transition-colors ${
                      selected ? 'bg-[var(--a-accent-soft-2)] shadow-[inset_2px_0_0_var(--a-accent)]' : 'hover:bg-[var(--a-surface-2)]'
                    }`}
                  >
                    <span className={`font-mono text-[10.5px] ${selected ? 'font-semibold text-[var(--a-accent)]' : 'text-[var(--a-text-3)]'}`}>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="truncate font-mono text-[12px] font-medium text-[var(--a-accent)]">
                      {entry.entry_number || entry.reference_number || entry.id.slice(0, 8)}
                    </span>
                    <span className="truncate font-mono text-[11.5px] text-[var(--a-text-2)]">{formatDate(entry.entry_date)}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-[var(--a-text)]">{entry.description || humanize(entry.entry_type)}</span>
                      <span className="mt-0.5 block truncate text-[11.5px] text-[var(--a-text-3)]">
                        {entry.reference_number || humanize(entry.entry_type)}
                      </span>
                    </span>
                    <span className="truncate font-mono text-[11.5px] text-[var(--a-text-2)]">{debit ? accountLabel(debit.account_id).split(' · ')[0] : '-'}</span>
                    <span className="truncate font-mono text-[11.5px] text-[var(--a-text-2)]">{credit ? accountLabel(credit.account_id).split(' · ')[0] : '-'}</span>
                    <span className={`truncate text-right font-mono text-[13px] font-medium ${entry.is_posted ? 'text-[var(--a-text)]' : 'text-[var(--a-warn)]'}`}>
                      {amount === null ? '-' : formatEUR(amount)}
                    </span>
                    <span className="text-right">
                      <StatusPill tone={entry.is_posted ? 'posted' : 'draft'}>{entry.is_posted ? t('posted') : t('draft')}</StatusPill>
                    </span>
                  </button>
                );
              })
            )}
          </div>

          <div className="flex items-center gap-3 border-t border-[var(--a-border)] bg-[var(--a-surface-2)] px-3.5 py-2 font-mono text-[11px] text-[var(--a-text-3)]">
            <span><span className="text-[var(--a-text)]">{filtered.length}</span> {t('shown')}</span>
            <span>Σ {t('debitAbbr')} <span className="text-[var(--a-text)]">{formatEUR(totalDebit)}</span></span>
            <span>Σ {t('creditAbbr')} <span className="text-[var(--a-text)]">{formatEUR(totalCredit)}</span></span>
            <span className="inline-flex items-center gap-1.5 text-[var(--a-pos)]">
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {t('balanced')}
            </span>
            <span className="flex-1" />
            <span>{t('syncedNow')}</span>
          </div>
        </section>

        <SplitPaneDetail>
          <EntryDetailPanel
            entry={selectedEntry}
            rows={selectedRows}
            isLoading={isDetailLoading}
            accountLabel={accountLabel}
            totalDebit={totalDebit}
            totalCredit={totalCredit}
            onEdit={() => selectedEntry && router.push(`/accounting/journal/${selectedEntry.id}/edit`)}
            onDuplicate={() => selectedEntry && router.push(`/accounting/journal/new?duplicate=${selectedEntry.id}`)}
          />
        </SplitPaneDetail>
      </SplitPane>
    </div>
  );
}

function EntryDetailPanel({
  entry,
  rows,
  isLoading,
  accountLabel,
  totalDebit,
  totalCredit,
  onEdit,
  onDuplicate,
}: {
  entry: JournalEntryWithRows | null;
  rows: JournalLineRecord[];
  isLoading: boolean;
  accountLabel: (id?: string | null) => string;
  totalDebit: number;
  totalCredit: number;
  onEdit?: () => void;
  onDuplicate?: () => void;
}) {
  const t = useTranslations('accounting');

  if (!entry) {
    return <div className="p-6 text-sm text-[var(--a-text-3)]">{t('selectEntryToInspect')}</div>;
  }

  return (
    <div className="flex max-h-[calc(100vh-190px)] min-h-[520px] flex-col">
      <div className="border-b border-[var(--a-border)] px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-mono text-[12px] text-[var(--a-text-3)]">{entry.entry_number || entry.id.slice(0, 8)}</div>
            <h2 className="mt-2 truncate text-[17px] font-semibold text-[var(--a-text)]">{entry.description || t('journalEntry')}</h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12.5px] text-[var(--a-text-2)]">
              <span className="font-mono">{formatDate(entry.entry_date)}</span>
              <span>·</span>
              <span>{humanize(entry.entry_type)}</span>
            </div>
          </div>
          <StatusPill tone={entry.is_posted ? 'posted' : 'draft'}>{entry.is_posted ? t('posted') : t('draft')}</StatusPill>
        </div>
      </div>

      <div className="border-b border-[var(--a-border)] bg-[var(--a-bg)] px-5 py-4">
        <div className="micro text-[var(--a-text-3)]">{t('total')}</div>
        <div className="mt-1 font-mono text-[30px] font-semibold leading-none text-[var(--a-text)] tabular-nums">
          {formatEUR(Math.max(totalDebit, totalCredit))}
        </div>
        <div className="mt-2 text-[12px] text-[var(--a-text-3)]">
          {t('difference')} <span className={Math.abs(totalDebit - totalCredit) < 0.01 ? 'font-mono text-[var(--a-pos)]' : 'font-mono text-[var(--a-neg)]'}>
            {formatEUR(totalDebit - totalCredit)}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <div className="micro mb-3 text-[var(--a-text-3)]">{t('journalLines')}</div>
        {isLoading ? (
          <div className="flex py-8">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--a-text-3)]" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-[var(--a-text-3)]">{t('noLines')}</div>
        ) : (
          <div className="space-y-2">
            {rows.map((row) => {
              const debit = Number(row.debit || 0);
              const credit = Number(row.credit || 0);
              const side = debit > 0 ? 'Dr' : 'Cr';

              return (
                <div key={row.id} className="flex items-center gap-2 text-[12.5px]">
                  <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold ${side === 'Dr' ? 'bg-[var(--a-surface-2)] text-[var(--a-text)]' : 'bg-[var(--a-accent-soft)] text-[var(--a-accent)]'}`}>
                    {side === 'Dr' ? t('debitAbbr') : t('creditAbbr')}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[var(--a-text)]">{accountLabel(row.account_id)}</span>
                  <span className="font-mono font-medium tabular-nums text-[var(--a-text)]">{formatEUR(debit || credit)}</span>
                </div>
              );
            })}
            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-[var(--a-border)] pt-3">
              <TotalBox label={t('debit')} value={totalDebit} />
              <TotalBox label={t('credit')} value={totalCredit} />
            </div>
          </div>
        )}

        {entry.reference_number && (
          <div className="mt-5 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] p-3">
            <div className="micro text-[var(--a-text-3)]">{t('reference')}</div>
            <div className="mt-1 font-mono text-sm text-[var(--a-accent)]">{entry.reference_number}</div>
          </div>
        )}

        <div className="mt-5">
          <div className="micro mb-3 text-[var(--a-text-3)]">{t('activity')}</div>
          <div className="space-y-3 text-[12px] text-[var(--a-text-2)]">
            <div className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--a-pos)]" />
              <span>
                {entry.is_posted ? t('postedToLedger') : t('savedAsDraft')} · <span className="font-mono text-[var(--a-text-3)]">{formatDate(entry.updated_at)}</span>
              </span>
            </div>
            <div className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--a-text-3)]" />
              <span>
                {t('created')} · <span className="font-mono text-[var(--a-text-3)]">{formatDate(entry.created_at)}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-[var(--a-border)] bg-[var(--a-surface-2)] px-3.5 py-2.5">
        <Button
          className="h-8 flex-1 text-xs"
          disabled={entry?.is_posted}
          onClick={onEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
          {t('edit')} <Kbd>M</Kbd>
        </Button>
        <Button
          className="h-8 flex-1 text-xs"
          onClick={onDuplicate}
        >
          <Copy className="h-3.5 w-3.5" />
          {t('copy')} <Kbd>D</Kbd>
        </Button>
        <Button className="h-8 w-8 px-0">
          <MoreHorizontal className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

function TotalBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[var(--a-surface-2)] p-3">
      <div className="micro text-[var(--a-text-3)]">{label}</div>
      <div className="mt-1 font-mono text-sm font-semibold text-[var(--a-text)] tabular-nums">{formatEUR(value)}</div>
    </div>
  );
}
