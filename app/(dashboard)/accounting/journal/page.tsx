'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Search, Filter, Download, Eye, MoreHorizontal, Loader2, X } from 'lucide-react';
import { accountingApi, type JournalEntryRecord, type JournalLineRecord, type AccountOption } from '@/lib/api/accounting.api';
import { getErrorMessage } from '@/lib/api/client';

function statusColor(isPosted: boolean) {
  return isPosted ? 'bg-emerald-500' : 'bg-amber-500';
}

function statusLabel(isPosted: boolean, t: (k: string) => string) {
  return isPosted ? t('posted') : t('draft');
}

export default function JournalEntriesPage() {
  const t = useTranslations('accounting');
  const [searchQuery, setSearchQuery] = useState('');
  const [entries, setEntries] = useState<JournalEntryRecord[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<(JournalEntryRecord & { rows?: JournalLineRecord[] }) | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);

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
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  const filtered = entries.filter((e) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (e.entry_number || '').toLowerCase().includes(q) ||
      (e.description || '').toLowerCase().includes(q) ||
      (e.reference_number || '').toLowerCase().includes(q)
    );
  });

  const handleSelect = async (entry: JournalEntryRecord) => {
    if (selectedEntry?.id === entry.id) {
      setSelectedEntry(null);
      return;
    }
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

  const accountLabel = (id: string) => {
    const a = accountMap.get(id);
    return a ? `${a.code} · ${a.name}` : id.slice(0, 8);
  };

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">{t('journalEntries')}</h1>
        <p className="text-sm text-slate-500 mt-1">{t('journalDescription')}</p>
      </div>

      <div className="hidden md:flex mb-6 justify-between items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('searchEntries')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ fontSize: '16px' }}
            className="w-72 h-10 pl-9 pr-4 border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 transition-all"
          />
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <button className="h-10 px-4 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2 text-sm text-slate-700 transition-colors">
            <Filter className="h-4 w-4" />
            <span>{t('filter')}</span>
          </button>
          <button className="h-10 px-4 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2 text-sm text-slate-700 transition-colors">
            <Download className="h-4 w-4" />
            <span>{t('export')}</span>
          </button>
          <button className="h-10 px-4 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] flex items-center gap-2 text-sm font-medium transition-colors">
            <Plus className="h-4 w-4" />
            <span>{t('newEntry')}</span>
          </button>
        </div>
      </div>

      <div className="md:hidden mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder={t('searchEntries')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ fontSize: '16px' }}
            className="w-full h-11 pl-10 pr-4 border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="flex-1 h-10 px-4 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-2 text-sm text-slate-700">
            <Filter className="h-4 w-4" />
            <span>{t('filter')}</span>
          </button>
          <button className="flex-1 h-10 px-4 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center justify-center gap-2 text-sm text-slate-700">
            <Download className="h-4 w-4" />
            <span>{t('export')}</span>
          </button>
          <button className="h-10 w-10 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center justify-center text-slate-700">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>

      <button className="md:hidden fixed bottom-6 right-6 w-[52px] h-[52px] bg-[var(--primary)] text-white rounded-full shadow-lg hover:bg-[var(--primary-hover)] flex items-center justify-center z-20 transition-all active:scale-95">
        <Plus className="h-6 w-6" />
      </button>

      {error && (
        <div className="mb-4 card border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {isLoading ? (
        <div className="card p-12 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-sm text-slate-500">
          {searchQuery ? t('noResults') : t('noJournalEntries')}
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,400px)]">
          <div>
            <div className="hidden md:block card overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t('date')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t('reference')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t('description')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t('type')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t('status')}</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {filtered.map((entry) => (
                    <tr
                      key={entry.id}
                      onClick={() => handleSelect(entry)}
                      className={`border-b border-slate-100 cursor-pointer transition-colors ${
                        selectedEntry?.id === entry.id ? 'bg-[var(--primary)]/5' : 'hover:bg-slate-50/50'
                      } ${!entry.is_posted ? 'border-l-2 border-l-amber-300' : ''}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">{entry.entry_date}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-[var(--primary)]">
                        {entry.entry_number || entry.reference_number || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">{entry.description || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 capitalize">{entry.entry_type?.replace(/_/g, ' ') || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className={`h-1.5 w-1.5 rounded-full ${statusColor(entry.is_posted)}`} />
                          <span className="text-xs text-slate-600">{statusLabel(entry.is_posted, t)}</span>
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <Eye className="h-4 w-4 text-slate-400" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-2">
              {filtered.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => handleSelect(entry)}
                  className={`card p-4 cursor-pointer transition-colors ${
                    selectedEntry?.id === entry.id ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/10' : 'active:bg-slate-50'
                  } ${!entry.is_posted ? 'border-l-2 border-l-amber-300' : ''}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-500">{entry.entry_date}</span>
                    <div className="flex items-center gap-1.5">
                      <div className={`h-1.5 w-1.5 rounded-full ${statusColor(entry.is_posted)}`} />
                      <span className="text-xs text-slate-600">{statusLabel(entry.is_posted, t)}</span>
                    </div>
                  </div>
                  <div className="font-mono text-sm text-[var(--primary)] mb-1">
                    {entry.entry_number || entry.reference_number || '-'}
                  </div>
                  <div className="text-sm text-slate-600">{entry.description || '-'}</div>
                </div>
              ))}
            </div>

            <div className="hidden md:flex mt-6 justify-between items-center">
              <p className="text-sm text-slate-600">
                {t('showingEntries', { from: 1, to: filtered.length, total: filtered.length })}
              </p>
            </div>
          </div>

          {selectedEntry && (
            <EntryDetailPanel
              entry={selectedEntry}
              isLoading={isDetailLoading}
              accountLabel={accountLabel}
              onClose={() => setSelectedEntry(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}

function EntryDetailPanel({
  entry,
  isLoading,
  accountLabel,
  onClose,
}: {
  entry: JournalEntryRecord & { rows?: JournalLineRecord[] };
  isLoading: boolean;
  accountLabel: (id: string) => string;
  onClose: () => void;
}) {
  const t = useTranslations('accounting');

  const rows = entry.rows || [];
  const totalDebit = rows.reduce((s, r) => s + Number(r.debit || 0), 0);
  const totalCredit = rows.reduce((s, r) => s + Number(r.credit || 0), 0);

  return (
    <div className="card overflow-hidden self-start sticky top-6">
      <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4 flex items-center justify-between">
        <div>
          <div className="text-base font-semibold text-slate-900">
            {entry.entry_number || entry.reference_number || t('journalEntry')}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">{entry.entry_date} · {entry.entry_type?.replace(/_/g, ' ')}</div>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="divide-y divide-slate-100">
        {entry.description && (
          <div className="px-5 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 mb-1">{t('description')}</div>
            <div className="text-sm text-slate-900">{entry.description}</div>
          </div>
        )}

        <div className="px-5 py-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{t('status')}</span>
          <div className="flex items-center gap-2">
            <div className={`h-1.5 w-1.5 rounded-full ${statusColor(entry.is_posted)}`} />
            <span className="text-sm text-slate-900">{statusLabel(entry.is_posted, t)}</span>
          </div>
        </div>

        {entry.reference_number && (
          <div className="px-5 py-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{t('reference')}</span>
            <span className="text-sm font-mono text-slate-900">{entry.reference_number}</span>
          </div>
        )}
      </div>

      <div className="border-t border-slate-200">
        <div className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          {t('journalLines')}
        </div>

        {isLoading ? (
          <div className="px-5 pb-4 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : rows.length === 0 ? (
          <div className="px-5 pb-4 text-sm text-slate-500">{t('noLines')}</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((row) => (
              <div key={row.id} className="px-5 py-2.5 flex items-center justify-between gap-3">
                <div className="text-sm text-slate-700 truncate min-w-0">{accountLabel(row.account_id)}</div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  {Number(row.debit) > 0 && (
                    <span className="font-mono text-sm tabular-nums text-slate-900">
                      D {Number(row.debit).toFixed(2)}
                    </span>
                  )}
                  {Number(row.credit) > 0 && (
                    <span className="font-mono text-sm tabular-nums text-slate-900">
                      C {Number(row.credit).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div className="px-5 py-3 flex items-center justify-between bg-slate-50/80">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{t('total')}</span>
              <div className="flex items-center gap-4">
                <span className="font-mono text-sm font-semibold tabular-nums text-slate-900">D {totalDebit.toFixed(2)}</span>
                <span className="font-mono text-sm font-semibold tabular-nums text-slate-900">C {totalCredit.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
