'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, ArrowRight, Building2, Loader2, Plus, Search } from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';
import { tenantsApi, type ManagedTenant } from '@/lib/api/tenants.api';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useSwitchTenant } from '@/lib/hooks/useSwitchTenant';
import { Button } from '@/components/ui/Button';
import { AddClientCompanyModal } from '@/components/tenants/AddClientCompanyModal';
import { HelpLink } from '@/components/guides/HelpLink';

const fieldInput =
  'h-9 w-full rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] px-3 text-[13px] text-[var(--a-text)] placeholder:text-[var(--a-text-3)] outline-none focus:border-[var(--a-accent)]';

export default function ClientsPage() {
  const t = useTranslations('clients');
  const { tenant, role } = useAuthStore();
  const { switchTenant, switchingId, error: switchError } = useSwitchTenant();
  const [clients, setClients] = useState<ManagedTenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const isClientCompany = Boolean(tenant?.managed_by_tenant_id);
  const canManage = (role === 'owner' || role === 'admin') && !isClientCompany;

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setClients(await tenantsApi.listManaged());
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canManage) void load();
    else setIsLoading(false);
  }, [canManage, load]);

  // The switcher's "Add client company" link lands here with ?add=1.
  useEffect(() => {
    if (!canManage) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('add') === '1') {
      setModalOpen(true);
      window.history.replaceState(null, '', '/clients');
    }
  }, [canManage]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      c.name.toLowerCase().includes(q) || (c.registry_code ?? '').includes(q)
    );
  }, [clients, search]);

  if (!canManage) {
    return (
      <div className="flex min-h-full flex-col gap-4">
        <h1 className="text-[28px] font-semibold leading-none text-[var(--a-text)]">{t('title')}</h1>
        <p className="text-[13px] text-[var(--a-text-2)]">{isClientCompany ? t('cannotManage') : t('noAccess')}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col gap-4">
      <div className="flex flex-col gap-3 border-b border-[var(--a-border)] pb-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="micro text-[var(--a-text-3)]">{tenant?.name}</div>
          <h1 className="mt-1 text-[28px] font-semibold leading-none text-[var(--a-text)]">{t('title')}</h1>
          <p className="mt-2 text-[13px] text-[var(--a-text-2)]">{t('subtitle', { count: clients.length })}</p>
        </div>
        <div className="flex items-center gap-2">
          <HelpLink slug="buroo-klientettevotted" />
          <Button variant="primary" onClick={() => setModalOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            {t('addCompany')}
          </Button>
        </div>
      </div>

      {(error || switchError) && (
        <div className="rounded-lg border border-[var(--a-neg-soft)] bg-[var(--a-neg-soft)] px-4 py-3 text-[13px] text-[var(--a-neg)]">
          <div className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /><span>{error || switchError}</span></div>
        </div>
      )}

      {clients.length > 8 && (
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--a-text-3)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className={`${fieldInput} pl-9`}
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-[10px] border border-[var(--a-border)]">
        <table className="min-w-full">
          <thead className="bg-[var(--a-surface-2)] text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--a-text-3)]">
            <tr>
              <th className="px-3.5 py-2.5 text-left">{t('name')}</th>
              <th className="px-3.5 py-2.5 text-left">{t('registryCode')}</th>
              <th className="px-3.5 py-2.5 text-left">{t('vatNumber')}</th>
              <th className="px-3.5 py-2.5 text-left">{t('myRole')}</th>
              <th className="px-3.5 py-2.5 text-left">{t('createdAt')}</th>
              <th className="px-3.5 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-3.5 py-8 text-center text-[13px] text-[var(--a-text-3)]"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></td></tr>
            ) : visible.length === 0 ? (
              <tr><td colSpan={6} className="px-3.5 py-10 text-center text-[13px] text-[var(--a-text-3)]">
                <Building2 className="mx-auto mb-2 h-5 w-5" />{search ? t('noMatches') : t('empty')}
              </td></tr>
            ) : (
              visible.map((client) => (
                <tr key={client.id} className="border-t border-[var(--a-border)] hover:bg-[var(--a-surface-2)]">
                  <td className="px-3.5 py-2.5 text-[13px] font-medium text-[var(--a-text)]">{client.name}</td>
                  <td className="px-3.5 py-2.5 font-mono text-[12.5px] text-[var(--a-text-2)]">{client.registry_code || '—'}</td>
                  <td className="px-3.5 py-2.5 font-mono text-[12.5px] text-[var(--a-text-2)]">{client.vat_number || '—'}</td>
                  <td className="px-3.5 py-2.5 text-[12.5px] text-[var(--a-text-2)]">
                    {client.my_role ? <span className="capitalize">{client.my_role}</span> : <span className="text-[var(--a-text-3)]">{t('notMember')}</span>}
                  </td>
                  <td className="px-3.5 py-2.5 text-[12.5px] text-[var(--a-text-2)]">{new Date(client.created_at).toLocaleDateString('et-EE')}</td>
                  <td className="px-3.5 py-2.5 text-right">
                    <Button
                      onClick={() => void switchTenant(client, client.my_role)}
                      disabled={!client.my_role || !!switchingId}
                      title={client.my_role ? undefined : t('notMemberHint')}
                    >
                      {switchingId === client.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                      {t('open')}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mounted only while open, so every opening starts from a clean form. */}
      {modalOpen && (
        <AddClientCompanyModal
          open
          onClose={() => setModalOpen(false)}
          onCreated={() => void load()}
        />
      )}
    </div>
  );
}
