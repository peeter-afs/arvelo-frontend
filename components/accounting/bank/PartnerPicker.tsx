'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { ChevronDown, Loader2, Plus, Search } from 'lucide-react';
import {
  accountingApi,
  getPartnerOptionRoles,
  type PartnerOption,
  type PartnerOptionRole,
} from '@/lib/api/accounting.api';

type RoleFilter = PartnerOptionRole | 'all';

const ROLE_FILTERS: Array<{ key: RoleFilter; labelKey: 'supplierPlural' | 'customerPlural' | 'all' }> = [
  { key: 'supplier', labelKey: 'supplierPlural' },
  { key: 'customer', labelKey: 'customerPlural' },
  { key: 'all', labelKey: 'all' },
];

export function matchesRoleFilter(partner: PartnerOption, filter: RoleFilter): boolean {
  return filter === 'all' || getPartnerOptionRoles(partner).includes(filter);
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

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

function mergePartners(current: PartnerOption[], incoming: PartnerOption[]) {
  const byId = new Map(current.map((partner) => [partner.id, partner]));
  for (const partner of incoming) byId.set(partner.id, partner);
  return Array.from(byId.values());
}

export type PartnerPickerHandle = {
  focus: () => void;
  open: () => void;
};

type Props = {
  value: string;
  onChange: (partnerId: string, partnerName: string, partnerType: string, partnerRegCode?: string) => void;
  onRequestCreate: (query: string) => void;
  initialQuery?: string;
  fallbackLabel?: string | null;
  fallbackType?: string | null;
  fallbackRegCode?: string | null;
  unselectedLabel?: string;
  sourceText?: string;
  disabled?: boolean;
};

export const PartnerPicker = forwardRef<PartnerPickerHandle, Props>(function PartnerPicker({
  value,
  onChange,
  onRequestCreate,
  initialQuery,
  fallbackLabel,
  fallbackType,
  fallbackRegCode,
  unselectedLabel,
  sourceText,
  disabled = false,
}, ref) {
  const t = useTranslations('accounting');
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('supplier');
  const [hotIndex, setHotIndex] = useState(0);
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 440 });
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selected = partners.find((partner) => partner.id === value);

  const refreshCachedPartners = useCallback(() => {
    void accountingApi
      .getPartners()
      .then((list) => setPartners((current) => mergePartners(current, list)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshCachedPartners();
  }, [refreshCachedPartners]);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    let cancelled = false;
    const handle = window.setTimeout(() => {
      setIsLoading(true);
      void accountingApi
        .listPartners({ search: trimmed, is_active: true })
        .then((list) => {
          if (cancelled) return;
          setPartners((current) => mergePartners(current, list.map((partner) => ({
            id: partner.id,
            name: partner.name,
            type: partner.type,
            reg_code: partner.reg_code,
            is_active: partner.is_active,
          }))));
        })
        .catch(() => {})
        .finally(() => { if (!cancelled) setIsLoading(false); });
    }, 250);
    return () => { cancelled = true; window.clearTimeout(handle); };
  }, [open, query]);

  const updatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const width = Math.min(440, window.innerWidth - 24);
    const left = Math.min(Math.max(12, rect.left), window.innerWidth - width - 12);
    setPosition({ left, top: rect.bottom + 6, width });
  }, []);

  useEffect(() => {
    if (!open) return;
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open]);

  const openPanel = useCallback(() => {
    if (disabled) return;
    setQuery(value ? selected?.name || fallbackLabel || '' : initialQuery?.trim() || '');
    setRoleFilter('supplier');
    setHotIndex(0);
    updatePosition();
    setOpen(true);
    refreshCachedPartners();
  }, [disabled, fallbackLabel, initialQuery, refreshCachedPartners, selected?.name, updatePosition, value]);

  useImperativeHandle(ref, () => ({
    focus: () => triggerRef.current?.focus(),
    open: openPanel,
  }), [openPanel]);

  const roleLabel = (partner: PartnerOption | null, fallback?: string | null) => {
    const roles = partner ? getPartnerOptionRoles(partner) : fallback === 'both'
      ? ['supplier', 'customer']
      : fallback === 'supplier' || fallback === 'customer' ? [fallback] : [];
    if (roles.includes('supplier') && roles.includes('customer')) return t('both');
    return roles.includes('customer') ? t('customer') : roles.includes('supplier') ? t('supplier') : null;
  };

  const flat = useMemo(() => {
    const q = normalize(query);
    return partners.filter((partner) => {
      if (!partner.is_active || !matchesRoleFilter(partner, roleFilter)) return false;
      return !q || partner.name.toLowerCase().includes(q) || String(partner.reg_code || '').toLowerCase().includes(q);
    });
  }, [partners, query, roleFilter]);

  const pick = (partner: PartnerOption) => {
    const roles = getPartnerOptionRoles(partner);
    const type = roles.length > 1 ? 'both' : roles[0] || partner.type;
    onChange(partner.id, partner.name, type, partner.reg_code || undefined);
    setOpen(false);
  };

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

  const displayedName = selected?.name || (value ? fallbackLabel : null) || unselectedLabel || t('counterpartyPlaceholder');
  const displayedRole = roleLabel(selected || null, fallbackType);
  const displayedRegCode = selected?.reg_code || fallbackRegCode;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => open ? setOpen(false) : openPanel()}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-7 min-w-0 items-center gap-1.5 rounded-md px-1.5 text-left hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={`min-w-0 truncate text-sm ${value ? 'font-semibold text-slate-900' : 'italic text-slate-500'}`}>{displayedName}</span>
        {displayedRole && <span className="flex-shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">{displayedRole}</span>}
        {displayedRegCode && <span className="flex-shrink-0 font-mono text-[10px] text-slate-500">{displayedRegCode}</span>}
        <ChevronDown className={`h-3.5 w-3.5 flex-shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {!value && <span className="flex-shrink-0 text-[11px] text-slate-400">{t('counterpartyPickHint')}</span>}

      {open && createPortal(
        <div
          ref={panelRef}
          className="fixed z-50 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl"
          style={{ left: position.left, top: position.top, width: position.width }}
        >
          <div className="border-b border-slate-100 p-2">
            {sourceText && (
              <div className="mb-2 truncate font-mono text-[11px] text-slate-500" title={sourceText}>
                {t('counterpartyRaw')} {sourceText}
              </div>
            )}
            <div className="flex items-center gap-2 rounded-md border border-slate-200 px-2">
              <Search className="h-4 w-4 flex-shrink-0 text-slate-400" />
              <input
                autoFocus
                role="combobox"
                aria-expanded="true"
                aria-controls="partner-picker-listbox"
                value={query}
                onChange={(event) => { setQuery(event.target.value); setHotIndex(0); }}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown') { event.preventDefault(); moveHot(1); }
                  else if (event.key === 'ArrowUp') { event.preventDefault(); moveHot(-1); }
                  else if (event.key === 'Enter') { event.preventDefault(); if (flat[hotIndex]) pick(flat[hotIndex]); }
                  else if (event.key === 'Escape') { event.preventDefault(); setOpen(false); triggerRef.current?.focus(); }
                }}
                placeholder={t('counterpartySearch')}
                className="h-8 min-w-0 flex-1 text-sm outline-none"
              />
              {isLoading && <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-slate-400" />}
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {ROLE_FILTERS.map((entry) => (
                <button key={entry.key} type="button" onClick={() => { setRoleFilter(entry.key); setHotIndex(0); }} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${roleFilter === entry.key ? 'bg-[var(--primary)] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{t(entry.labelKey)}</button>
              ))}
            </div>
          </div>

          <div id="partner-picker-listbox" ref={listRef} role="listbox" className="max-h-[206px] overflow-y-auto">
            {flat.length === 0 ? <div className="p-3 text-sm text-slate-500">{t('noPartnerMatch', { query })}</div> : flat.map((partner, index) => {
              const partnerRole = roleLabel(partner);
              return (
                <button key={partner.id} type="button" role="option" aria-selected={partner.id === value} data-row-index={index} onClick={() => pick(partner)} className={`grid w-full grid-cols-[minmax(0,1fr)_auto_74px] items-center gap-2 px-3 py-1.5 text-left text-sm ${hotIndex === index ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                  <span className="truncate text-slate-700">{highlight(partner.name, query)}</span>
                  {partnerRole ? <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">{partnerRole}</span> : <span />}
                  <span className="truncate font-mono text-xs text-slate-500">{partner.reg_code ? highlight(partner.reg_code, query) : ''}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 border-t border-slate-100 p-2">
            <button type="button" onClick={() => { setOpen(false); onRequestCreate(query.trim()); }} className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"><Plus className="h-4 w-4" />{t('addNewPartner')}</button>
            <span className="text-[11px] text-slate-400">{t('addPartnerHint')}</span>
            <span className="ml-auto text-[11px] text-slate-400">↑ ↓ · ↵ · Esc</span>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
});
