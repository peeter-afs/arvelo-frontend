'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, AlertTriangle, ArrowRight, Building2, CalendarClock, Loader2, Plus, Search } from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';
import { tenantsApi, type ClientOverview, type ManagedTenant } from '@/lib/api/tenants.api';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useSwitchTenant } from '@/lib/hooks/useSwitchTenant';
import { Button } from '@/components/ui/Button';
import { AddClientCompanyModal } from '@/components/tenants/AddClientCompanyModal';
import { HelpLink } from '@/components/guides/HelpLink';

const money = (value: number) =>
  new Intl.NumberFormat('et-EE', { style: 'currency', currency: 'EUR' }).format(value);

/** Whole days from today to an ISO date (negative when past). */
function daysUntil(isoDate: string): number {
  const today = new Date();
  const start = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const [y, m, d] = isoDate.split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - start) / 86400000);
}

/** First/last day of a "YYYY-MM" period, for the VAT report link. */
function periodRange(period: string): { start: string; end: string } {
  const [y, m] = period.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { start: `${period}-01`, end: `${period}-${String(last).padStart(2, '0')}` };
}

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
  // Loaded separately: last month's VAT return is computed per client, which is slower than the list.
  const [overview, setOverview] = useState<Map<string, ClientOverview> | null>(null);
  const [overviewError, setOverviewError] = useState(false);

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
    setOverviewError(false);
    try {
      const rows = await tenantsApi.managedOverview();
      setOverview(new Map(rows.map((row) => [row.tenant_id, row])));
    } catch {
      setOverviewError(true);
      setOverview(new Map());
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

  const totals = useMemo(() => {
    const rows = overview ? [...overview.values()].filter((r) => r.accessible) : [];
    const kmd = rows.find((r) => r.kmd)?.kmd ?? null;
    return {
      purchases: rows.reduce((sum, r) => sum + r.purchases_to_process, 0),
      bank: rows.reduce((sum, r) => sum + r.bank_unmatched, 0),
      overdue: rows.reduce((sum, r) => sum + r.sales_overdue, 0),
      kmdPeriod: kmd?.period ?? null,
      kmdDue: kmd?.due_date ?? null,
      hidden: overview ? [...overview.values()].some((r) => !r.accessible) : false,
    };
  }, [overview]);

  const openClient = (client: ManagedTenant, path = '/') => {
    if (!client.my_role) return;
    void switchTenant(client, client.my_role, path);
  };

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

      {overview && overview.size > 0 && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[10px] border border-[var(--a-border)] bg-[var(--a-surface)] px-4 py-3 text-[13px] text-[var(--a-text-2)]">
          {totals.kmdPeriod && totals.kmdDue && (
            <span className="flex items-center gap-2 font-medium text-[var(--a-text)]">
              <CalendarClock className="h-4 w-4 text-[var(--a-accent)]" />
              {t('kmdDeadline', { period: totals.kmdPeriod.split('-').reverse().join('.'), date: totals.kmdDue.split('-').reverse().join('.') })}
              <span className={daysUntil(totals.kmdDue) < 0 ? 'text-[var(--a-neg)]' : daysUntil(totals.kmdDue) <= 5 ? 'text-[var(--a-accent)]' : 'text-[var(--a-text-3)]'}>
                ({daysUntil(totals.kmdDue) < 0 ? t('kmdDeadlinePassed') : t('kmdDueIn', { days: daysUntil(totals.kmdDue) })})
              </span>
            </span>
          )}
          <span>{t('attentionTotals', { purchases: totals.purchases, bank: totals.bank, overdue: totals.overdue })}</span>
          {totals.hidden && <span className="text-[var(--a-text-3)]">{t('figuresMembersOnly')}</span>}
        </div>
      )}

      {overviewError && (
        <div className="text-[12.5px] text-[var(--a-neg)]">{t('overviewFailed')}</div>
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
              <th className="px-3.5 py-2.5 text-left">{t('colCompany')}</th>
              <th className="px-3.5 py-2.5 text-right">{t('colPurchases')}</th>
              <th className="px-3.5 py-2.5 text-right">{t('colBank')}</th>
              <th className="px-3.5 py-2.5 text-right">{t('colOverdue')}</th>
              <th className="px-3.5 py-2.5 text-right">{t('colKmd', { period: totals.kmdPeriod ? totals.kmdPeriod.split('-').reverse().join('.') : '' })}</th>
              <th className="px-3.5 py-2.5 text-left">{t('myRole')}</th>
              <th className="px-3.5 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-3.5 py-8 text-center text-[13px] text-[var(--a-text-3)]"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></td></tr>
            ) : visible.length === 0 ? (
              <tr><td colSpan={7} className="px-3.5 py-10 text-center text-[13px] text-[var(--a-text-3)]">
                <Building2 className="mx-auto mb-2 h-5 w-5" />{search ? t('noMatches') : t('empty')}
              </td></tr>
            ) : (
              visible.map((client) => {
                const row = overview?.get(client.id);
                const loadingFigures = overview === null;
                const hidden = row ? !row.accessible : !client.my_role;
                const cell = (value: number, path: string, hint: string, extra?: string) => {
                  if (loadingFigures) return <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-[var(--a-text-3)]" />;
                  if (hidden || !row) return <span className="text-[var(--a-text-3)]">—</span>;
                  if (value === 0) return <span className="text-[var(--a-text-3)]">0</span>;
                  return (
                    <button
                      type="button"
                      onClick={() => openClient(client, path)}
                      title={hint}
                      className="font-medium text-[var(--a-text)] underline-offset-2 hover:text-[var(--a-accent)] hover:underline"
                    >
                      {value}{extra ? <span className="ml-1 font-normal text-[var(--a-text-3)]">{extra}</span> : null}
                    </button>
                  );
                };
                return (
                  <tr key={client.id} className="border-t border-[var(--a-border)] hover:bg-[var(--a-surface-2)]">
                    <td className="px-3.5 py-2.5">
                      <div className="text-[13px] font-medium text-[var(--a-text)]">{client.name}</div>
                      <div className="font-mono text-[11.5px] text-[var(--a-text-3)]">{client.registry_code || '—'}</div>
                    </td>
                    <td className="px-3.5 py-2.5 text-right text-[13px] tabular-nums">
                      {cell(row?.purchases_to_process ?? 0, '/invoices/purchase', t('openPurchases'))}
                    </td>
                    <td className="px-3.5 py-2.5 text-right text-[13px] tabular-nums">
                      {cell(row?.bank_unmatched ?? 0, '/accounting/bank?tab=review', t('openBank'))}
                    </td>
                    <td className="px-3.5 py-2.5 text-right text-[13px] tabular-nums">
                      {cell(row?.sales_overdue ?? 0, '/invoices/reminders', t('openReminders'), row?.sales_overdue ? money(row.sales_overdue_amount) : undefined)}
                    </td>
                    <td className="px-3.5 py-2.5 text-right text-[13px] tabular-nums">
                      <KmdCell client={client} row={row} loading={loadingFigures} onOpen={openClient} />
                    </td>
                    <td className="px-3.5 py-2.5 text-[12.5px] text-[var(--a-text-2)]">
                      {client.my_role ? <span className="capitalize">{client.my_role}</span> : <span className="text-[var(--a-text-3)]">{t('notMember')}</span>}
                    </td>
                    <td className="px-3.5 py-2.5 text-right">
                      <Button
                        onClick={() => openClient(client)}
                        disabled={!client.my_role || !!switchingId}
                        title={client.my_role ? undefined : t('notMemberHint')}
                      >
                        {switchingId === client.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                        {t('open')}
                      </Button>
                    </td>
                  </tr>
                );
              })
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

function KmdCell({
  client,
  row,
  loading,
  onOpen,
}: {
  client: ManagedTenant;
  row: ClientOverview | undefined;
  loading: boolean;
  onOpen: (client: ManagedTenant, path?: string) => void;
}) {
  const t = useTranslations('clients');
  if (loading) return <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-[var(--a-text-3)]" />;
  if (!row || !row.accessible) return <span className="text-[var(--a-text-3)]">—</span>;
  if (row.error) return <span className="text-[12px] text-[var(--a-neg)]">{t('kmdFailed')}</span>;
  if (!row.kmd) return <span className="text-[12px] text-[var(--a-text-3)]">{t('notVatRegistered')}</span>;

  const { start, end } = periodRange(row.kmd.period);
  const label = row.kmd.payable > 0
    ? t('kmdPayable', { amount: money(row.kmd.payable) })
    : row.kmd.overpaid > 0
      ? t('kmdRefund', { amount: money(row.kmd.overpaid) })
      : t('kmdZero');
  return (
    <button
      type="button"
      onClick={() => onOpen(client, `/reports/vat?start_date=${start}&end_date=${end}`)}
      title={row.kmd.warnings > 0 ? t('kmdWarningsHint', { count: row.kmd.warnings }) : t('openKmd')}
      className="inline-flex items-center gap-1.5 font-medium text-[var(--a-text)] underline-offset-2 hover:text-[var(--a-accent)] hover:underline"
    >
      {row.kmd.warnings > 0 && <AlertTriangle className="h-3.5 w-3.5 text-[var(--a-accent)]" />}
      {label}
    </button>
  );
}
