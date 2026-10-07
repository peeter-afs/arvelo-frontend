'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { LogOut, ShieldAlert } from 'lucide-react';
import { tenantSecurityApi, type TwoFactorUserStatus } from '@/lib/api/tenantSecurity.api';
import { authApi } from '@/lib/api/auth.api';
import { tenantsApi, type TenantMembership } from '@/lib/api/tenants.api';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useSwitchTenant } from '@/lib/hooks/useSwitchTenant';

const SECURITY_PATH = '/settings/security';

type TwoFactorGateValue = {
  status: TwoFactorUserStatus | null;
  /** Re-read the status, e.g. right after the user set 2FA up. */
  refresh: () => Promise<void>;
};

const TwoFactorGateContext = createContext<TwoFactorGateValue>({
  status: null,
  refresh: async () => {},
});

export const useTwoFactorGate = () => useContext(TwoFactorGateContext);

/**
 * The requirement is per company: someone blocked here may still work in
 * another company that does not require 2FA (GET /api/tenants and the switch
 * stay open to blocked users). Hidden when there is only one company.
 */
function GateCompanySwitch({ currentId }: { currentId: string | null }) {
  const t = useTranslations('twoFactor');
  const [memberships, setMemberships] = useState<TenantMembership[]>([]);
  const { switchTenant, switchingId, error } = useSwitchTenant();

  useEffect(() => {
    tenantsApi.listUserTenants().then(setMemberships).catch(() => setMemberships([]));
  }, []);

  if (memberships.length < 2) return null;

  return (
    <label className="flex min-w-0 flex-col gap-1 text-[12px] text-[var(--a-text-3)]">
      {t('gateSwitchCompany')}
      <select
        value={switchingId ?? currentId ?? ''}
        disabled={switchingId !== null}
        onChange={(event) => {
          const target = memberships.find((m) => m.tenant.id === event.target.value);
          if (target) void switchTenant(target.tenant, target.role);
        }}
        className="h-10 max-w-[16rem] rounded-lg border border-[var(--a-border)] bg-[var(--a-surface)] px-2 text-[13px] text-[var(--a-text)]"
      >
        {memberships
          .slice()
          .sort((a, b) => a.tenant.name.localeCompare(b.tenant.name, 'et'))
          .map((m) => (
            <option key={m.tenant.id} value={m.tenant.id}>{m.tenant.name}</option>
          ))}
      </select>
      {error && <span className="text-[var(--a-neg)]">{error}</span>}
    </label>
  );
}

/**
 * A user blocked by the 2FA requirement can sign in, but all they get is the 2FA
 * setup page: no sidebar, no company data, every other route leads back to it.
 * The backend refuses everything else anyway (403 TWO_FACTOR_REQUIRED); this keeps
 * the app from mounting a shell full of failing requests.
 *
 * `page` is the routed page alone, `children` the normal app shell around it.
 */
export function TwoFactorGate({ page, children }: { page: React.ReactNode; children: React.ReactNode }) {
  const t = useTranslations('twoFactor');
  const router = useRouter();
  const pathname = usePathname();
  const { tenant, logout } = useAuthStore();
  const tenantId = tenant?.id ?? null;
  const [status, setStatus] = useState<TwoFactorUserStatus | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setStatus(tenantId ? await tenantSecurityApi.getMyStatus() : null);
    } catch {
      // A failed status check must never lock anyone out; the backend still enforces.
      setStatus(null);
    } finally {
      setLoaded(true);
    }
  }, [tenantId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const blocked = status?.blocked === true;
  const onSecurityPage = pathname === SECURITY_PATH;

  useEffect(() => {
    if (blocked && !onSecurityPage) router.replace(`${SECURITY_PATH}?two_factor_required=1`);
  }, [blocked, onSecurityPage, router]);

  const signOut = async () => {
    await authApi.logout();
    logout();
    window.location.href = '/login';
  };

  let content: React.ReactNode;
  if (!loaded) {
    content = null;
  } else if (!blocked) {
    content = children;
  } else {
    content = (
      <div className="min-h-dvh bg-[var(--a-bg)]">
        <div className="mx-auto w-full max-w-3xl px-4 pb-10 pt-4 sm:px-6">
          <header className="mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[12px] font-medium uppercase tracking-wide text-[var(--a-text-3)]">Arvelo</div>
              <div className="truncate text-[17px] font-semibold text-[var(--a-text)]">{tenant?.name ?? ''}</div>
            </div>
            <div className="flex items-end gap-2">
              <GateCompanySwitch currentId={tenantId} />
              <button
                type="button"
                onClick={signOut}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg px-3 text-[13px] text-[var(--a-text-2)] hover:bg-[var(--a-surface-2)]"
              >
                <LogOut className="h-4 w-4" /> {t('gateSignOut')}
              </button>
            </div>
          </header>

          <div
            className="mb-6 flex items-start gap-3 rounded-lg px-4 py-3 text-sm"
            style={{ backgroundColor: 'var(--a-warn-soft, #fef3c7)', color: 'var(--a-warn, #b45309)' }}
          >
            <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{status?.reason === 'invoices' ? t('gateInvoices') : t('noticeBlocked')}</span>
          </div>

          {onSecurityPage ? page : null}
        </div>
      </div>
    );
  }

  return (
    <TwoFactorGateContext.Provider value={{ status, refresh }}>
      {content}
    </TwoFactorGateContext.Provider>
  );
}
