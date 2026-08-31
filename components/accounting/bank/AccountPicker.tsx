'use client';

import { useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, Loader2, Plus, Search } from 'lucide-react';
import { accountingApi, type AccountClass, type AccountOption } from '@/lib/api/accounting.api';
import { getErrorMessage } from '@/lib/api/client';

type Scope = AccountClass | 'all';

// Literal keys, not template strings: next-intl types t() against the message
// catalogue, and a computed key would force an `any` cast.
const SCOPE_LABEL = {
  expense: 'scopeExpense',
  income: 'scopeIncome',
  asset: 'scopeAsset',
  liability: 'scopeLiability',
  // Not offered as a chip — equity accounts are reachable through "Kõik" — but
  // the map must cover every class so grouping under "Kõik" has a label.
  equity: 'scopeEquity',
  all: 'scopeAll',
} as const;

const SCOPES: Array<{ key: Scope; labelKey: (typeof SCOPE_LABEL)[keyof typeof SCOPE_LABEL] }> = [
  { key: 'expense', labelKey: 'scopeExpense' },
  { key: 'income', labelKey: 'scopeIncome' },
  { key: 'asset', labelKey: 'scopeAsset' },
  { key: 'liability', labelKey: 'scopeLiability' },
  { key: 'all', labelKey: 'scopeAll' },
];

// The chart stores 'revenue'; the enriched payload carries account_class, but a
// cached response may predate it, so fall back to the raw type.
function classOf(account: AccountOption): AccountClass {
  if (account.account_class) return account.account_class;
  return account.type === 'revenue' ? 'income' : (account.type as AccountClass);
}

function groupOf(account: AccountOption, fallback: string): string {
  return account.group_name || fallback;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/** Split a string on the matched query so it can be rendered with <mark>. */
function highlight(text: string, query: string) {
  const q = normalize(query);
  if (!q) return text;
  const at = text.toLowerCase().indexOf(q);
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <mark className="bg-amber-100 px-0 text-inherit">{text.slice(at, at + q.length)}</mark>
      {text.slice(at + q.length)}
    </>
  );
}

export type SuggestedAccount = {
  account_id: string;
  code: string;
  name: string;
  reason?: string;
};

export function AccountPicker({
  accounts,
  value,
  onChange,
  onAccountCreated,
  defaultScope,
  suggested = [],
  canCreate = true,
  disabled = false,
}: {
  accounts: AccountOption[];
  value: string;
  onChange: (accountId: string) => void;
  onAccountCreated?: (account: AccountOption, message: string) => void;
  /** Expenses for money out, income for money in — where the posting almost always lands. */
  defaultScope: AccountClass;
  suggested?: SuggestedAccount[];
  canCreate?: boolean;
  disabled?: boolean;
}) {
  const t = useTranslations('accounting');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<Scope>(defaultScope);
  const [hotIndex, setHotIndex] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createCode, setCreateCode] = useState('');
  const [createClass, setCreateClass] = useState<AccountClass>(defaultScope);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selected = accounts.find((account) => account.id === value);

  const matches = useMemo(() => {
    const q = normalize(query);
    return accounts.filter((account) => {
      if (!account.is_active) return false;
      if (scope !== 'all' && classOf(account) !== scope) return false;
      if (!q) return true;
      return account.code.toLowerCase().includes(q) || account.name.toLowerCase().includes(q);
    });
  }, [accounts, query, scope]);

  // Suggested history sits on top, but only while browsing: once the user types
  // they are looking for something specific.
  const suggestedRows = useMemo(() => {
    if (query.trim()) return [];
    return suggested
      .map((row) => accounts.find((account) => account.id === row.account_id))
      .filter((account): account is AccountOption => !!account)
      .slice(0, 3);
  }, [accounts, suggested, query]);

  const groups = useMemo(() => {
    const suggestedIds = new Set(suggestedRows.map((account) => account.id));
    const byGroup = new Map<string, AccountOption[]>();
    for (const account of matches) {
      if (suggestedIds.has(account.id)) continue;
      const key = groupOf(account, t(SCOPE_LABEL[classOf(account)]));
      const list = byGroup.get(key) || [];
      list.push(account);
      byGroup.set(key, list);
    }
    return Array.from(byGroup.entries()).map(([name, rows]) => ({ name, rows }));
  }, [matches, suggestedRows, t]);

  // Flat visible order drives keyboard navigation: suggested first, then groups.
  const flat = useMemo(
    () => [...suggestedRows, ...groups.flatMap((group) => group.rows)],
    [suggestedRows, groups]
  );

  const openPanel = () => {
    if (disabled) return;
    setOpen(true);
    setQuery('');
    setScope(defaultScope);
    setHotIndex(0);
    setShowCreate(false);
    // The detail panel is itself a scroll container, so the inline panel needs
    // to be brought into view rather than relying on an absolute popover.
    window.setTimeout(() => panelRef.current?.scrollIntoView({ block: 'nearest' }), 0);
  };

  const pick = (account: AccountOption) => {
    onChange(account.id);
    setOpen(false);
  };

  // scrollIntoView on the option would also scroll the outer panel; move the
  // list's own scrollTop instead.
  const moveHot = (delta: number) => {
    if (flat.length === 0) return;
    const next = Math.min(Math.max(hotIndex + delta, 0), flat.length - 1);
    setHotIndex(next);
    const list = listRef.current;
    const row = list?.querySelector<HTMLElement>(`[data-row-index="${next}"]`);
    if (!list || !row) return;
    const top = row.offsetTop;
    const bottom = top + row.offsetHeight;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
  };

  const nextFreeCode = (accountClass: AccountClass) => {
    const prefix = { expense: '5', income: '4', asset: '1', liability: '2', equity: '3' }[accountClass];
    const used = accounts
      .filter((account) => account.code.startsWith(prefix))
      .map((account) => Number(account.code))
      .filter((code) => Number.isFinite(code));
    const highest = used.length > 0 ? Math.max(...used) : Number(`${prefix}000`);
    return String(highest + 10);
  };

  const startCreate = () => {
    setCreateName(query.trim());
    setCreateClass(scope === 'all' ? defaultScope : scope);
    setCreateCode(nextFreeCode(scope === 'all' ? defaultScope : scope));
    setCreateError(null);
    setShowCreate(true);
  };

  const submitCreate = async () => {
    if (!createCode.trim() || !createName.trim()) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      const created = await accountingApi.createAccount({
        code: createCode.trim(),
        name: createName.trim(),
        account_class: createClass,
      });
      onAccountCreated?.(created, t('accountAddedToChart', { code: created.code, name: created.name }));
      onChange(created.id);
      setOpen(false);
      setShowCreate(false);
    } catch (error) {
      setCreateError(getErrorMessage(error));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        disabled={disabled}
        className="flex h-8 w-full items-center gap-2 rounded-lg border border-slate-200 px-3 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {selected ? (
          <>
            <span className="font-mono text-xs text-slate-500">{selected.code}</span>
            <span className="min-w-0 flex-1 truncate">{selected.name}</span>
          </>
        ) : (
          <span className="flex-1 text-slate-400">{t('searchAccountPlaceholder')}</span>
        )}
        <ChevronDown className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div ref={panelRef} className="mt-2 rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-2">
            <div className="flex items-center gap-2 rounded-md border border-slate-200 px-2">
              <Search className="h-4 w-4 flex-shrink-0 text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={(event) => { setQuery(event.target.value); setHotIndex(0); }}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown') { event.preventDefault(); moveHot(1); }
                  else if (event.key === 'ArrowUp') { event.preventDefault(); moveHot(-1); }
                  else if (event.key === 'Enter') { event.preventDefault(); if (flat[hotIndex]) pick(flat[hotIndex]); }
                  else if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
                }}
                placeholder={t('searchAccountPlaceholder')}
                className="h-8 min-w-0 flex-1 text-sm outline-none"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {SCOPES.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => { setScope(entry.key); setHotIndex(0); }}
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${scope === entry.key ? 'bg-[var(--primary)] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {t(entry.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <div ref={listRef} className="max-h-[206px] overflow-y-auto">
            {flat.length === 0 ? (
              <div className="p-3 text-sm text-slate-500">{t('noAccountMatch', { query })}</div>
            ) : (
              <>
                {suggestedRows.length > 0 && (
                  <>
                    <div className="sticky top-0 z-10 bg-slate-50 px-3 py-1 text-[9.5px] font-bold uppercase tracking-[0.1em] text-slate-500">
                      {t('suggestedAccounts')}
                    </div>
                    {suggestedRows.map((account, index) => (
                      <AccountRow
                        key={`suggested-${account.id}`}
                        account={account}
                        index={index}
                        hot={hotIndex === index}
                        query={query}
                        onPick={pick}
                      />
                    ))}
                  </>
                )}
                {groups.map((group) => (
                  <div key={group.name}>
                    <div className="sticky top-0 z-10 bg-slate-50 px-3 py-1 text-[9.5px] font-bold uppercase tracking-[0.1em] text-slate-500">
                      {group.name}
                    </div>
                    {group.rows.map((account) => {
                      const index = flat.indexOf(account);
                      return (
                        <AccountRow
                          key={account.id}
                          account={account}
                          index={index}
                          hot={hotIndex === index}
                          query={query}
                          onPick={pick}
                        />
                      );
                    })}
                  </div>
                ))}
              </>
            )}
          </div>

          {canCreate && (
            showCreate ? (
              <div className="space-y-2 border-t border-slate-100 p-2">
                <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2">
                  <div>
                    <input
                      value={createCode}
                      onChange={(event) => setCreateCode(event.target.value)}
                      className="h-8 w-full rounded-md border border-slate-200 px-2 font-mono text-sm"
                    />
                    {createError && <div className="mt-1 text-[11px] text-red-600">{createError}</div>}
                  </div>
                  <input
                    value={createName}
                    onChange={(event) => setCreateName(event.target.value)}
                    className="h-8 w-full rounded-md border border-slate-200 px-2 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-slate-500">{t('accountClass')}</label>
                  <select
                    value={createClass}
                    onChange={(event) => {
                      const nextClass = event.target.value as AccountClass;
                      setCreateClass(nextClass);
                      setCreateCode(nextFreeCode(nextClass));
                    }}
                    className="h-8 rounded-md border border-slate-200 px-2 text-sm"
                  >
                    {SCOPES.filter((entry) => entry.key !== 'all').map((entry) => (
                      <option key={entry.key} value={entry.key}>{t(entry.labelKey)}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={submitCreate}
                    disabled={isCreating || !createCode.trim() || !createName.trim()}
                    className="ml-auto inline-flex h-8 items-center gap-2 rounded-lg bg-[var(--primary)] px-3 text-xs font-semibold text-white hover:bg-[var(--primary-hover)] disabled:opacity-50"
                  >
                    {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t('createAndSelect')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 border-t border-slate-100 p-2">
                <button
                  type="button"
                  onClick={startCreate}
                  className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Plus className="h-4 w-4" />
                  {t('addNewAccount')}
                </button>
                <span className="ml-auto text-[11px] text-slate-400">↑ ↓ · ↵ · Esc</span>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

function AccountRow({
  account,
  index,
  hot,
  query,
  onPick,
}: {
  account: AccountOption;
  index: number;
  hot: boolean;
  query: string;
  onPick: (account: AccountOption) => void;
}) {
  return (
    <button
      type="button"
      data-row-index={index}
      onClick={() => onPick(account)}
      className={`grid w-full grid-cols-[46px_minmax(0,1fr)] items-center gap-2 px-3 py-1.5 text-left text-sm ${hot ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
    >
      <span className="font-mono text-xs text-slate-500">{highlight(account.code, query)}</span>
      <span className="truncate text-slate-700">{highlight(account.name, query)}</span>
    </button>
  );
}
