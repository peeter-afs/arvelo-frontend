'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Search, Filter, Download, Upload, Edit2, Trash2, MoreHorizontal, X, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { accountingApi, type AccountRecord } from '@/lib/api/accounting.api';
import { getErrorMessage } from '@/lib/api/client';

const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'revenue', 'expense'] as const;

function getTypeColor(type: string) {
  switch (type) {
    case 'asset': return 'bg-blue-50 text-blue-700';
    case 'liability': return 'bg-amber-50 text-amber-700';
    case 'equity': return 'bg-violet-50 text-violet-700';
    case 'revenue': return 'bg-emerald-50 text-emerald-700';
    case 'expense': return 'bg-rose-50 text-rose-700';
    default: return 'bg-slate-50 text-slate-700';
  }
}

export default function ChartOfAccountsPage() {
  const t = useTranslations('accounting');
  const [searchQuery, setSearchQuery] = useState('');
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadAccounts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await accountingApi.listAccounts();
      setAccounts(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAccounts();
  }, []);

  const filtered = accounts.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q);
  });

  const handleCreated = () => {
    setShowCreateModal(false);
    void loadAccounts();
  };

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">{t('chartOfAccounts')}</h1>
        <p className="text-sm text-slate-500 mt-1">{t('chartOfAccountsDescription')}</p>
      </div>

      <div className="hidden md:flex mb-6 justify-between items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('searchAccounts')}
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

          <Link
            href="/accounting/accounts/import"
            className="h-10 px-4 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2 text-sm text-slate-700 transition-colors"
          >
            <Upload className="h-4 w-4" />
            <span>{t('import')}</span>
          </Link>

          <button
            onClick={() => setShowCreateModal(true)}
            className="h-10 px-4 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>{t('newAccount')}</span>
          </button>
        </div>
      </div>

      <div className="md:hidden mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder={t('searchAccounts')}
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

      <button
        onClick={() => setShowCreateModal(true)}
        className="md:hidden fixed bottom-6 right-6 w-[52px] h-[52px] bg-[var(--primary)] text-white rounded-full shadow-lg hover:bg-[var(--primary-hover)] flex items-center justify-center z-20 transition-all active:scale-95"
      >
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
          {searchQuery ? t('noResults') : t('noAccounts')}
        </div>
      ) : (
        <>
          <div className="hidden md:block card overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t('code')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t('accountName')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t('type')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t('status')}</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {filtered.map((account) => (
                  <tr key={account.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-600">{account.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{account.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs font-medium rounded-md ${getTypeColor(account.type)}`}>
                        {t(account.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className={`h-1.5 w-1.5 rounded-full ${account.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        <span className="text-xs text-slate-600">{account.is_active ? t('active') : t('inactive')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-2">
            {filtered.map((account) => (
              <div key={account.id} className="card p-4 active:bg-slate-50 transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-xs text-slate-500">{account.code}</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-md ${getTypeColor(account.type)}`}>
                    {t(account.type)}
                  </span>
                </div>
                <div className="font-medium text-base text-slate-900 mb-3">{account.name}</div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className={`h-1.5 w-1.5 rounded-full ${account.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <span className="text-xs text-slate-600">{account.is_active ? t('active') : t('inactive')}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 active:bg-slate-200 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600 active:bg-slate-200 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="hidden md:flex mt-6 justify-between items-center">
        <p className="text-sm text-slate-600">
          {t('showingEntries', { from: 1, to: filtered.length, total: filtered.length })}
        </p>
      </div>

      {showCreateModal && (
        <CreateAccountModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}

function CreateAccountModal({
  onClose,
  onCreated
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const t = useTranslations('accounting');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('asset');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;

    setIsSaving(true);
    setError(null);
    try {
      await accountingApi.createAccount({ code: code.trim(), name: name.trim(), type });
      onCreated();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{t('newAccount')}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{t('accountCode')}</span>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="1000"
              required
              autoFocus
              className="h-11 w-full rounded-lg border border-slate-200 px-3 focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/10"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{t('accountName')}</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-11 w-full rounded-lg border border-slate-200 px-3 focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/10"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{t('accountType')}</span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="h-11 w-full rounded-lg border border-slate-200 px-3 focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/10"
            >
              {ACCOUNT_TYPES.map((t_) => (
                <option key={t_} value={t_}>{t(t_)}</option>
              ))}
            </select>
          </label>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSaving || !code.trim() || !name.trim()}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-50"
            >
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>{t('createAccount')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
