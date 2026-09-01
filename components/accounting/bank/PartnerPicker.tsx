'use client';

import { useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, Loader2, Plus, Search } from 'lucide-react';
import { accountingApi, type PartnerOption } from '@/lib/api/accounting.api';

type RoleFilter = 'supplier' | 'customer' | 'all';

// Suppliers first regardless of the amount sign: a bank row without a
// counterparty is nearly always money going out to a vendor, and a partner
// typed 'both' shows up under either chip anyway.
const ROLE_FILTERS: Array<{ key: RoleFilter; labelKey: 'supplierPlural' | 'customerPlural' | 'all' }> = [
  { key: 'supplier', labelKey: 'supplierPlural' },
  { key: 'customer', labelKey: 'customerPlural' },
  { key: 'all', labelKey: 'all' },
];

/**
 * GET /api/accounting/partners filters the `type` column with `_eq` and does not
 * join accounting_partner_roles, so the role chips filter client-side — that is
 * also what makes a 'both' partner appear under both chips.
 */
export function matchesRoleFilter(type: string | null | undefined, filter: RoleFilter): boolean {
  if (filter === 'all') return true;
  return type === filter || type === 'both';
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

export type PartnerPickerHandle = { focus: () => void };

export const PartnerPicker = forwardRef<PartnerPickerHandle, {
  value: string;
  onChange: (partnerId: string, partnerName: string) => void;
  /** Opens the "Loo partner" modal, seeded with whatever the user typed. */
  onRequestCreate: (query: string) => void;
  /** Name the bank/card descriptor gave us — seeds the search on open. */
  initialQuery?: string;
  /** Shown on the trigger when the id is not (yet) in the loaded list. */
  fallbackLabel?: string | null;
  disabled?: boolean;
}>(function PartnerPicker({ value, onChange, onRequestCreate, initialQuery, fallbackLabel, disabled = false }, ref) {
  const t = useTranslations('accounting');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('supplier');
  const [hotIndex, setHotIndex] = useState(0);
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useImperativeHandle(ref, () => ({ focus: () => triggerRef.current?.focus() }), []);

  // The cached active-partner list is enough to show a selected partner on the
  // trigger without opening the panel.
  useEffect(() => {
    let cancelled = false;
    void accountingApi
      .getPartners()
      .then((list) => { if (!cancelled) setPartners((current) => (current.length > 0 ? current : list)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Server-side search once the query is meaningful; the cached list covers
  // browsing. is_active must be sent explicitly — the controller coerces a
  // missing param to false and would return only inactive partners.
  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    const handle = window.setTimeout(() => {
      setIsLoading(true);
      void accountingApi
        .listPartners({ search: trimmed, is_active: true })
        .then((list) => {
          setPartners((current) => {
            const byId = new Map(current.map((partner) => [partner.id, partner]));
            for (const partner of list) {
              byId.set(partner.id, {
                id: partner.id,
                name: partner.name,
                type: partner.type,
                reg_code: partner.reg_code,
                is_active: partner.is_active,
              });
            }
            return Array.from(byId.values());
          });
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }, 250);
    return () => { window.clearTimeout(handle); setIsLoading(false); };
  }, [open, query]);

  const selected = partners.find((partner) => partner.id === value);

  const roleLabel = (type: string | null | undefined) =>
    type === 'both' ? t('both') : type === 'customer' ? t('customer') : t('supplier');

  const flat = useMemo(() => {
    const q = normalize(query);
    return partners.filter((partner) => {
      if (!partner.is_active) return false;
      if (!matchesRoleFilter(partner.type, roleFilter)) return false;
      if (!q) return true;
      return partner.name.toLowerCase().includes(q) || String(partner.reg_code || '').toLowerCase().includes(q);
    });
  }, [partners, query, roleFilter]);

  const openPanel = () => {
    if (disabled) return;
    setOpen(true);
    setQuery(initialQuery?.trim() || '');
    setRoleFilter('supplier');
    setHotIndex(0);
    // The detail panel is itself a scroll container, so the inline panel needs
    // to be brought into view rather than relying on an absolute popover.
    window.setTimeout(() => panelRef.current?.scrollIntoView({ block: 'nearest' }), 0);
  };

  const pick = (partner: PartnerOption) => {
    onChange(partner.id, partner.name);
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

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        disabled={disabled}
        className="flex h-8 w-full items-center gap-2 rounded-lg border border-slate-200 px-3 text-left text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {selected ? (
          <>
            <span className="min-w-0 flex-1 truncate">{selected.name}</span>
            <span className="flex-shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
              {roleLabel(selected.type)}
            </span>
            {selected.reg_code && <span className="flex-shrink-0 font-mono text-xs text-slate-500">{selected.reg_code}</span>}
          </>
        ) : value && fallbackLabel ? (
          <span className="min-w-0 flex-1 truncate">{fallbackLabel}</span>
        ) : (
          <span className="flex-1 text-slate-400">{t('counterpartyPlaceholder')}</span>
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
                  // preventDefault on Enter also stops ReviewActionPanel's
                  // root handler from committing the posting.
                  if (event.key === 'ArrowDown') { event.preventDefault(); moveHot(1); }
                  else if (event.key === 'ArrowUp') { event.preventDefault(); moveHot(-1); }
                  else if (event.key === 'Enter') { event.preventDefault(); if (flat[hotIndex]) pick(flat[hotIndex]); }
                  else if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
                }}
                placeholder={t('counterpartySearch')}
                className="h-8 min-w-0 flex-1 text-sm outline-none"
              />
              {isLoading && <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-slate-400" />}
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {ROLE_FILTERS.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => { setRoleFilter(entry.key); setHotIndex(0); }}
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${roleFilter === entry.key ? 'bg-[var(--primary)] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {t(entry.labelKey)}
                </button>
              ))}
            </div>
          </div>

          <div ref={listRef} className="max-h-[206px] overflow-y-auto">
            {flat.length === 0 ? (
              <div className="p-3 text-sm text-slate-500">{t('noPartnerMatch', { query })}</div>
            ) : (
              flat.map((partner, index) => (
                <button
                  key={partner.id}
                  type="button"
                  data-row-index={index}
                  onClick={() => pick(partner)}
                  className={`grid w-full grid-cols-[minmax(0,1fr)_auto_74px] items-center gap-2 px-3 py-1.5 text-left text-sm ${hotIndex === index ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                >
                  <span className="truncate text-slate-700">{highlight(partner.name, query)}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                    {roleLabel(partner.type)}
                  </span>
                  <span className="truncate font-mono text-xs text-slate-500">
                    {partner.reg_code ? highlight(partner.reg_code, query) : ''}
                  </span>
                </button>
              ))
            )}
          </div>

          <div className="flex items-center gap-2 border-t border-slate-100 p-2">
            <button
              type="button"
              onClick={() => { setOpen(false); onRequestCreate(query.trim()); }}
              className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" />
              {t('addNewPartner')}
            </button>
            <span className="text-[11px] text-slate-400">{t('addPartnerHint')}</span>
            <span className="ml-auto text-[11px] text-slate-400">↑ ↓ · ↵ · Esc</span>
          </div>
        </div>
      )}
    </div>
  );
});
