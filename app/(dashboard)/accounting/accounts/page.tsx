'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ChevronDown, Edit2, Filter, Loader2, Plus, Search, Upload, X } from 'lucide-react';
import { accountingApi, type AccountRecord } from '@/lib/api/accounting.api';
import { getErrorMessage } from '@/lib/api/client';
import { Button } from '@/components/ui/Button';
import { Kbd } from '@/components/ui/Kbd';
import { Stat } from '@/components/ui/Stat';
import { StatusPill } from '@/components/ui/StatusPill';
import { TypeBadge } from '@/components/ui/TypeBadge';
import { SplitPane, SplitPaneDetail } from '@/components/layout/SplitPane';

const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'revenue', 'expense'] as const;

function labelOfType(type: string) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('et-EE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

export default function ChartOfAccountsPage() {
  const t = useTranslations('accounting');
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<AccountRecord | null>(null);
  const [creatingDefaults, setCreatingDefaults] = useState(false);
  const [collapsedTypes, setCollapsedTypes] = useState<Set<string>>(new Set());

  const toggleGroup = (type: string) => {
    setCollapsedTypes((current) => {
      const next = new Set(current);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const handleCreateDefaults = async () => {
    setCreatingDefaults(true);
    setError(null);
    try {
      await accountingApi.createDefaultChart();
      await loadAccounts();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCreatingDefaults(false);
    }
  };

  const loadAccounts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await accountingApi.listAccounts();
      setAccounts(data);
      setSelectedAccount((current) => current || data[0] || null);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAccounts();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName || '')) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const filtered = useMemo(() => {
    return accounts.filter((account) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return account.code.toLowerCase().includes(query) || account.name.toLowerCase().includes(query) || account.type.includes(query);
    });
  }, [accounts, searchQuery]);

  const grouped = useMemo(() => {
    return ACCOUNT_TYPES.map((type) => ({
      type,
      rows: filtered.filter((account) => account.type === type),
      total: accounts.filter((account) => account.type === type).length,
    })).filter((group) => group.rows.length > 0 || !searchQuery);
  }, [accounts, filtered, searchQuery]);

  const handleCreated = () => {
    setShowCreateModal(false);
    void loadAccounts();
  };

  const activeCount = accounts.filter((account) => account.is_active).length;
  const systemCount = accounts.filter((account) => account.is_system).length;

  return (
    <div className="flex min-h-full flex-col gap-4">
      <div className="flex flex-col gap-3 border-b border-[var(--a-border)] pb-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="micro text-[var(--a-text-3)]">Master register</div>
          <h1 className="mt-1 text-[28px] font-semibold leading-none text-[var(--a-text)]">{t('chartOfAccounts')}</h1>
          <p className="mt-2 text-[13px] text-[var(--a-text-2)]">{accounts.length} accounts · {activeCount} active · {systemCount} system locked</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/accounting/accounts/import"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[var(--a-border)] bg-[var(--a-surface)] px-3 text-[13px] font-medium text-[var(--a-text-2)] hover:bg-[var(--a-surface-2)]"
          >
            <Upload className="h-3.5 w-3.5" />
            {t('import')}
          </Link>
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <Plus className="h-3.5 w-3.5" />
            {t('newAccount')}
            <Kbd inverse>N</Kbd>
          </Button>
        </div>
      </div>

      <div className="grid border-b border-[var(--a-border)] pb-4 md:grid-cols-4">
        <Stat label="Accounts" value={accounts.length} subtle={`${activeCount} active`} />
        <Stat label="Assets" value={accounts.filter((account) => account.type === 'asset').length} subtle="balance sheet" />
        <Stat label="Revenue" value={accounts.filter((account) => account.type === 'revenue').length} subtle="income statement" tone="positive" />
        <Stat label="Expenses" value={accounts.filter((account) => account.type === 'expense').length} subtle="income statement" tone="danger" />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block w-full max-w-md">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--a-text-3)]" />
          <input
            ref={searchRef}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t('searchAccounts')}
            className="h-9 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] pl-9 pr-3 text-[13px] text-[var(--a-text)] outline-none"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <Button>
            <Filter className="h-3.5 w-3.5" />
            Type: All
            <ChevronDown className="h-3 w-3" />
          </Button>
          <Button>
            Status: Active
            <ChevronDown className="h-3 w-3" />
          </Button>
          <div className="hidden items-center gap-1 text-[11.5px] text-[var(--a-text-3)] lg:flex">
            <Kbd>J</Kbd>
            <Kbd>K</Kbd>
            <span>navigate</span>
            <span>·</span>
            <Kbd>↵</Kbd>
            <span>open ledger</span>
          </div>
        </div>
      </div>

      {error && <div className="rounded-lg border border-[var(--a-neg-soft)] bg-[var(--a-neg-soft)] p-4 text-sm text-[var(--a-neg)]">{error}</div>}

      <SplitPane className="flex-1">
        <section className="min-h-[520px] overflow-hidden rounded-[10px] border border-[var(--a-border)] bg-[var(--a-surface)]">
          <div className="grid grid-cols-[34px_92px_minmax(220px,1fr)_120px_110px_125px_90px] gap-3 border-b border-[var(--a-border)] bg-[var(--a-surface-2)] px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--a-text-3)]">
            <div />
            <div>{t('code')}</div>
            <div>{t('accountName')}</div>
            <div>{t('type')}</div>
            <div>Status</div>
            <div>Updated</div>
            <div className="text-right">Locked</div>
          </div>

          <div className="max-h-[calc(100vh-390px)] min-h-[430px] overflow-y-auto">
            {isLoading ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-[var(--a-text-3)]" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 p-8 text-sm text-[var(--a-text-3)]">
                <span>{searchQuery ? t('noResults') : t('noAccounts')}</span>
                {!searchQuery && accounts.length === 0 && (
                  <Button onClick={handleCreateDefaults} disabled={creatingDefaults}>
                    {creatingDefaults ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {t('createDefaultChart')}
                  </Button>
                )}
              </div>
            ) : (
              grouped.map((group) => {
                const collapsed = collapsedTypes.has(group.type);
                return (
                <div key={group.type}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.type)}
                    aria-expanded={!collapsed}
                    className="sticky top-0 z-10 flex w-full items-center justify-between border-b border-[var(--a-border)] bg-[var(--a-surface-2)] px-4 py-2.5 text-left transition-colors hover:bg-[var(--a-surface-3,var(--a-surface-2))]"
                  >
                    <div className="flex items-center gap-2">
                      <ChevronDown className={`h-3.5 w-3.5 text-[var(--a-text-2)] transition-transform ${collapsed ? '-rotate-90' : ''}`} />
                      <TypeBadge type={group.type} label={labelOfType(group.type)} />
                      <span className="text-[11.5px] text-[var(--a-text-3)]">· {group.rows.length} accounts</span>
                    </div>
                    <span className="font-mono text-[11.5px] tabular-nums text-[var(--a-text-3)]">{group.total} total</span>
                  </button>
                  {!collapsed && group.rows.map((account) => {
                    const selected = selectedAccount?.id === account.id;

                    return (
                      <button
                        key={account.id}
                        onClick={() => setSelectedAccount(account)}
                        className={`grid w-full grid-cols-[34px_92px_minmax(220px,1fr)_120px_110px_125px_90px] items-center gap-3 border-b border-[var(--a-border)] px-4 py-3 text-left text-[13px] transition-colors ${
                          selected ? 'bg-[var(--a-accent-soft-2)] shadow-[inset_2px_0_0_var(--a-accent)]' : 'hover:bg-[var(--a-surface-2)]'
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${account.is_active ? 'bg-[var(--a-pos)]' : 'bg-[var(--a-text-3)]'}`} />
                        <span className="font-mono text-[13px] tabular-nums text-[var(--a-text-2)]">{account.code}</span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-[var(--a-text)]">{account.name}</span>
                          <span className="mt-0.5 block truncate text-[11.5px] text-[var(--a-text-3)]">{account.parent_id ? `Parent ${account.parent_id.slice(0, 8)}` : 'Top level'}</span>
                        </span>
                        <TypeBadge type={account.type} label={t(account.type)} />
                        <StatusPill tone={account.is_active ? 'success' : 'neutral'}>{account.is_active ? t('active') : t('inactive')}</StatusPill>
                        <span className="font-mono text-[11.5px] tabular-nums text-[var(--a-text-2)]">{formatDate(account.updated_at)}</span>
                        <span className="text-right text-[11.5px] text-[var(--a-text-3)]">{account.is_system ? 'System' : 'Editable'}</span>
                      </button>
                    );
                  })}
                </div>
                );
              })
            )}
          </div>

          <div className="flex items-center gap-3 border-t border-[var(--a-border)] bg-[var(--a-surface-2)] px-3.5 py-2 font-mono text-[11px] text-[var(--a-text-3)]">
            <span>Showing <span className="text-[var(--a-text)]">{filtered.length}</span></span>
            <span><span className="text-[var(--a-text)]">{grouped.filter((group) => group.rows.length > 0).length}</span> types</span>
            <span className="inline-flex items-center gap-1.5 text-[var(--a-pos)]">
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              balanced
            </span>
            <span className="flex-1" />
            <span>Press J K navigate</span>
          </div>
        </section>

        <SplitPaneDetail>
          <AccountDetailPanel
            account={selectedAccount}
            onUpdated={loadAccounts}
          />
        </SplitPaneDetail>
      </SplitPane>

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
  onUpdated,
}: {
  account: AccountRecord | null;
  onUpdated: () => void;
}) {
  const t = useTranslations('accounting');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(account?.name || '');
  const [editType, setEditType] = useState<AccountRecord['type']>(account?.type || 'asset');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsEditing(false);
    setEditName(account?.name || '');
    setEditType(account?.type || 'asset');
    setError(null);
  }, [account?.id, account?.name, account?.type]);

  const handleSave = async () => {
    if (!account) return;
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

  if (!account) {
    return <div className="p-6 text-sm text-[var(--a-text-3)]">Select an account to inspect its setup.</div>;
  }

  return (
    <div className="flex max-h-[calc(100vh-190px)] min-h-[520px] flex-col">
      <div className="border-b border-[var(--a-border)] px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-mono text-[12px] text-[var(--a-accent)]">{account.code}</div>
            <h2 className="mt-2 truncate text-[17px] font-semibold text-[var(--a-text)]">{account.name}</h2>
            <div className="mt-2 flex items-center gap-2">
              <TypeBadge type={account.type} label={t(account.type)} />
              <StatusPill tone={account.is_active ? 'success' : 'neutral'}>{account.is_active ? t('active') : t('inactive')}</StatusPill>
            </div>
          </div>
          <Button
            className="h-8 w-8 px-0"
            disabled={account.is_system}
            onClick={() => setIsEditing(true)}
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {error && <div className="mx-5 mt-4 rounded-lg border border-[var(--a-neg-soft)] bg-[var(--a-neg-soft)] p-3 text-sm text-[var(--a-neg)]">{error}</div>}

      <div className="min-h-0 flex-1 overflow-y-auto p-5">
        <div className="space-y-4">
          <DetailRow label={t('code')} value={<span className="font-mono">{account.code}</span>} />
          <div>
            <div className="micro mb-2 text-[var(--a-text-3)]">{t('accountName')}</div>
            {isEditing ? (
              <input
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                className="h-10 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] px-3 text-sm outline-none"
              />
            ) : (
              <div className="text-sm text-[var(--a-text)]">{account.name}</div>
            )}
          </div>
          <div>
            <div className="micro mb-2 text-[var(--a-text-3)]">{t('type')}</div>
            {isEditing ? (
              <select
                value={editType}
                onChange={(event) => setEditType(event.target.value as AccountRecord['type'])}
                className="h-10 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] px-3 text-sm outline-none"
              >
                {ACCOUNT_TYPES.map((type) => (
                  <option key={type} value={type}>{t(type)}</option>
                ))}
              </select>
            ) : (
              <TypeBadge type={account.type} label={t(account.type)} />
            )}
          </div>
          <DetailRow label="System account" value={account.is_system ? 'Yes' : 'No'} />
          <DetailRow label="Created" value={<span className="font-mono">{formatDate(account.created_at)}</span>} />
          <DetailRow label="Updated" value={<span className="font-mono">{formatDate(account.updated_at)}</span>} />
          <DetailRow label="ID" value={<span className="break-all font-mono text-[11px] text-[var(--a-text-3)]">{account.id}</span>} />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-[var(--a-border)] bg-[var(--a-surface-2)] px-3.5 py-2.5">
        {isEditing ? (
          <>
            <Button onClick={() => { setIsEditing(false); setEditName(account.name); setEditType(account.type); }}>{t('cancel')}</Button>
            <Button variant="primary" onClick={handleSave} disabled={isSaving || !editName.trim()}>
              {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t('save')}
            </Button>
          </>
        ) : (
          <Button disabled={account.is_system} onClick={() => setIsEditing(true)}>
            <Edit2 className="h-3.5 w-3.5" />
            {t('edit')}
          </Button>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border-b border-[var(--a-border)] pb-3 last:border-0">
      <div className="micro mb-1 text-[var(--a-text-3)]">{label}</div>
      <div className="text-sm text-[var(--a-text)]">{value}</div>
    </div>
  );
}

function CreateAccountModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const t = useTranslations('accounting');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountRecord['type']>('asset');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-[10px] border border-[var(--a-border)] bg-[var(--a-surface)] p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <div className="micro text-[var(--a-text-3)]">Chart of accounts</div>
            <h2 className="mt-1 text-lg font-semibold text-[var(--a-text)]">{t('newAccount')}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-[var(--a-text-3)] hover:bg-[var(--a-surface-2)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && <div className="mb-4 rounded-lg border border-[var(--a-neg-soft)] bg-[var(--a-neg-soft)] p-3 text-sm text-[var(--a-neg)]">{error}</div>}

        <div className="space-y-4">
          <Field label={t('accountCode')}>
            <input
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="1000"
              required
              autoFocus
              className="h-10 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] px-3 font-mono text-sm outline-none"
            />
          </Field>
          <Field label={t('accountName')}>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className="h-10 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] px-3 text-sm outline-none"
            />
          </Field>
          <Field label={t('accountType')}>
            <select
              value={type}
              onChange={(event) => setType(event.target.value as AccountRecord['type'])}
              className="h-10 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] px-3 text-sm outline-none"
            >
              {ACCOUNT_TYPES.map((accountType) => (
                <option key={accountType} value={accountType}>{t(accountType)}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button onClick={onClose}>{t('cancel')}</Button>
          <Button variant="primary" type="submit" disabled={isSaving || !code.trim() || !name.trim()}>
            {isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {t('createAccount')}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="micro text-[var(--a-text-3)]">{label}</span>
      {children}
    </label>
  );
}
