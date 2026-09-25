'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Building2, Check, ChevronDown, Loader2, Plus, Search } from 'lucide-react';
import { tenantsApi, type TenantMembership } from '@/lib/api/tenants.api';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useSwitchTenant } from '@/lib/hooks/useSwitchTenant';

function initials(value?: string | null) {
  if (!value) return 'A';
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

type Group = { key: string; label: string | null; items: TenantMembership[] };

/**
 * Companies the user belongs to, with a bureau's clients grouped under it.
 */
function groupMemberships(memberships: TenantMembership[], clientsOf: (name: string) => string, otherClients: string): Group[] {
  const byId = new Map(memberships.map((m) => [m.tenant.id, m]));
  const own: TenantMembership[] = [];
  const clients = new Map<string, TenantMembership[]>();

  for (const m of memberships) {
    const bureauId = m.tenant.managed_by_tenant_id;
    if (!bureauId) {
      own.push(m);
      continue;
    }
    const list = clients.get(bureauId) ?? [];
    list.push(m);
    clients.set(bureauId, list);
  }

  const byName = (a: TenantMembership, b: TenantMembership) => a.tenant.name.localeCompare(b.tenant.name, 'et');
  const groups: Group[] = [{ key: 'own', label: null, items: own.sort(byName) }];
  for (const [bureauId, items] of clients) {
    const bureau = byId.get(bureauId);
    groups.push({
      key: bureauId,
      label: bureau ? clientsOf(bureau.tenant.name) : otherClients,
      items: items.sort(byName),
    });
  }
  return groups.filter((g) => g.items.length > 0);
}

export function TenantSwitcher({
  collapsed,
  fiscalYearLabel,
  onNavigate,
}: {
  collapsed: boolean;
  fiscalYearLabel: string;
  onNavigate?: () => void;
}) {
  const t = useTranslations('clients');
  const tCommon = useTranslations('common');
  const { tenant, role, setTenant } = useAuthStore();
  const { switchTenant, switchingId, error } = useSwitchTenant();
  const [memberships, setMemberships] = useState<TenantMembership[] | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Loaded once per mount; also refreshes the persisted tenant so fields added
  // since login (e.g. managed_by_tenant_id) are current.
  useEffect(() => {
    if (!tenant) return;
    let cancelled = false;
    tenantsApi
      .listUserTenants()
      .then((list) => {
        if (cancelled) return;
        setMemberships(list);
        const fresh = list.find((m) => m.tenant.id === tenant.id);
        if (fresh && fresh.tenant.managed_by_tenant_id !== tenant.managed_by_tenant_id) {
          setTenant(fresh.tenant, role);
        }
      })
      .catch(() => {
        if (!cancelled) setMemberships([]);
      });
    return () => {
      cancelled = true;
    };
    // Only on mount / company change; the role is carried along as-is.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.id]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = () => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) setAnchor({ top: rect.bottom + 6, left: collapsed ? rect.right + 8 : rect.left });
    setQuery('');
    setOpen((value) => !value);
  };

  const canManageClients = (role === 'owner' || role === 'admin') && !tenant?.managed_by_tenant_id;

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = (memberships ?? []).filter(
      (m) => !q || m.tenant.name.toLowerCase().includes(q) || (m.tenant.registry_code ?? '').includes(q)
    );
    return groupMemberships(filtered, (name) => t('clientsOf', { bureau: name }), t('otherClients'));
  }, [memberships, query, t]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`mt-3.5 flex w-full items-center rounded-lg bg-white/[0.04] py-2 text-left transition-colors hover:bg-white/[0.08] ${collapsed ? 'justify-center px-0' : 'gap-2 px-2.5'}`}
        title={collapsed ? tenant?.name : undefined}
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/[0.06] text-[11px] font-semibold text-white">
          {initials(tenant?.name)}
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium text-white">{tenant?.name || tCommon('companyWorkspace')}</span>
              <span className="mt-0.5 inline-flex rounded border border-white/10 px-1.5 py-0.5 font-mono text-[10px] text-[var(--a-side-muted)]">
                {fiscalYearLabel}
              </span>
            </span>
            <ChevronDown className={`h-3.5 w-3.5 text-[var(--a-side-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      {open && anchor && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          role="menu"
          className="fixed z-50 w-[272px] overflow-hidden rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] text-[var(--a-text)] shadow-xl"
          style={{ top: anchor.top, left: anchor.left }}
        >
          {(memberships?.length ?? 0) >= 8 && (
            <div className="border-b border-[var(--a-border)] p-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--a-text-3)]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('searchPlaceholder')}
                  className="h-8 w-full rounded-md border border-[var(--a-border)] bg-[var(--a-surface)] pl-8 pr-2 text-[12.5px] outline-none focus:border-[var(--a-accent)]"
                  autoFocus
                />
              </div>
            </div>
          )}

          <div className="max-h-[360px] overflow-y-auto py-1">
            {memberships === null ? (
              <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-[var(--a-text-3)]" /></div>
            ) : groups.length === 0 ? (
              <div className="px-3 py-3 text-[12.5px] text-[var(--a-text-3)]">{t('noMatches')}</div>
            ) : (
              groups.map((group) => (
                <div key={group.key}>
                  {group.label && (
                    <div className="px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--a-text-3)]">
                      {group.label}
                    </div>
                  )}
                  {group.items.map((m) => {
                    const current = m.tenant.id === tenant?.id;
                    return (
                      <button
                        key={m.tenant.id}
                        type="button"
                        role="menuitem"
                        disabled={current || !!switchingId}
                        onClick={() => void switchTenant(m.tenant, m.role)}
                        className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] ${current ? 'font-medium' : 'hover:bg-[var(--a-surface-2)]'} disabled:cursor-default`}
                      >
                        <span className="min-w-0 flex-1 truncate">{m.tenant.name}</span>
                        {switchingId === m.tenant.id ? (
                          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-[var(--a-text-3)]" />
                        ) : current ? (
                          <Check className="h-3.5 w-3.5 shrink-0 text-[var(--a-accent)]" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
            {error && <div className="px-3 py-2 text-[12px] text-[var(--a-neg)]">{error}</div>}
          </div>

          {canManageClients && (
            <div className="border-t border-[var(--a-border)] py-1">
              <Link
                href="/clients"
                onClick={() => { setOpen(false); onNavigate?.(); }}
                className="flex items-center gap-2 px-3 py-1.5 text-[13px] hover:bg-[var(--a-surface-2)]"
              >
                <Building2 className="h-3.5 w-3.5 text-[var(--a-text-3)]" />
                {t('manageClients')}
              </Link>
              <Link
                href="/clients?add=1"
                onClick={() => { setOpen(false); onNavigate?.(); }}
                className="flex items-center gap-2 px-3 py-1.5 text-[13px] hover:bg-[var(--a-surface-2)]"
              >
                <Plus className="h-3.5 w-3.5 text-[var(--a-text-3)]" />
                {t('addClient')}
              </Link>
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
