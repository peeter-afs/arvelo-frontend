'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Search, Filter, Download, Upload, Edit2, Trash2, MoreHorizontal, X, Loader2, ChevronRight } from 'lucide-react';
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
  const [selectedAccount, setSelectedAccount] = useState<AccountRecord | null>(null);

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

  const handleSelect = (account: AccountRecord) => {
    setSelectedAccount((prev) => prev?.id === account.id ? null : account);
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
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,380px)]">
          <div>
            <div className="hidden md:block card overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t('code')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t('accountName')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t('type')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{t('status')}</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {filtered.map((account) => (
                    <tr
                      key={account.id}
                      onClick={() => handleSelect(account)}
                      className={`border-b border-slate-100 cursor-pointer transition-colors ${selectedAccount?.id === account.id ? 'bg-[var(--primary)]/5' : 'hover:bg-slate-50/50'}`}
                    >
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
                      <td className="px-3 py-4">
                        <ChevronRight className={`h-4 w-4 text-slate-400 transition-transform ${selectedAccount?.id === account.id ? 'rotate-90' : ''}`} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-2">
              {filtered.map((account) => (
                <div
                  key={account.id}
                  onClick={() => handleSelect(account)}
                  className={`card p-4 transition-colors cursor-pointer ${selectedAccount?.id === account.id ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/10' : 'active:bg-slate-50'}`}
                >
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
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:flex mt-6 justify-between items-center">
              <p className="text-sm text-slate-600">
                {t('showingEntries', { from: 1, to: filtered.length, total: filtered.length })}
              </p>
            </div>
          </div>

          {selectedAccount && (
            <AccountDetailPanel
              account={selectedAccount}
              onClose={() => setSelectedAccount(null)}
              onUpdated={loadAccounts}
            />
          )}
        </div>
      )}

      {showCreateModal && (
        <CreateAccountModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}

function AccountDetailPanel({
  account,
  onClose,
  onUpdated
}: {
  account: AccountRecord;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const t = useTranslations('accounting');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(account.name);
  const [editType, setEditType] = useState(account.type);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsEditing(false);
    setEditName(account.name);
    setEditType(account.type);
    setError(null);
  }, [account.id]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await accountingApi.updateAccount(account.id, {
        name: editName.trim(),
        type: editType,
      });
      setIsEditing(false);
      onUpdated();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const rows: Array<{ label: string; value: React.ReactNode }> = [
    { label: t('code'), value: <span className="font-mono">{account.code}</span> },
    {
      label: t('accountName'),
      value: isEditing ? (
        <input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="h-9 w-full rounded-lg border border-slate-200 px-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/10"
        />
      ) : (
        account.name
      ),
    },
    {
      label: t('type'),
      value: isEditing ? (
        <select
          value={editType}
          onChange={(e) => setEditType(e.target.value as typeof editType)}
          className="h-9 w-full rounded-lg border border-slate-200 px-2 text-sm focus:border-[var(--primary)] focus:outline-none focus:ring-4 focus:ring-[var(--primary)]/10"
        >
          {ACCOUNT_TYPES.map((t_) => (
            <option key={t_} value={t_}>{t(t_)}</option>
          ))}
        </select>
      ) : (
        <span className={`px-2 py-0.5 text-xs font-medium rounded-md ${getTypeColor(account.type)}`}>
          {t(account.type)}
        </span>
      ),
    },
    {
      label: t('status'),
      value: (
        <div className="flex items-center gap-2">
          <div className={`h-1.5 w-1.5 rounded-full ${account.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          <span className="text-sm">{account.is_active ? t('active') : t('inactive')}</span>
        </div>
      ),
    },
    {
      label: 'ID',
      value: <span className="font-mono text-xs text-slate-400 break-all">{account.id}</span>,
    },
  ];

  return (
    <div className="card overflow-hidden self-start sticky top-6">
      <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4 flex items-center justify-between">
        <div>
          <div className="text-base font-semibold text-slate-900">{account.code} · {account.name}</div>
          <div className="mt-0.5 text-xs text-slate-500">{t('accountDetails')}</div>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      {error && (
        <div className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="divide-y divide-slate-100">
        {rows.map((row) => (
          <div key={row.label} className="px-5 py-3 flex items-center justify-between gap-4">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 whitespace-nowrap">{row.label}</span>
            <div className="text-sm text-slate-900 text-right min-w-0">{row.value}</div>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 px-5 py-4 flex items-center justify-end gap-3">
        {isEditing ? (
          <>
            <button
              onClick={() => { setIsEditing(false); setEditName(account.name); setEditType(account.type); }}
              className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !editName.trim()}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--primary)] px-3 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-50"
            >
              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>{t('save')}</span>
            </button>
          </>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            disabled={account.is_system}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>{t('edit')}</span>
          </button>
        )}
      </div>
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
