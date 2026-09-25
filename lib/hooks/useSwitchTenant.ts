'use client';

import { useCallback, useState } from 'react';
import { authApi } from '@/lib/api/auth.api';
import { getErrorMessage } from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/auth.store';
import type { Tenant, UserRole } from '@/lib/types/auth.types';

/**
 * Switch the active company. Issues a new token pair for the tenant, then
 * reloads onto the dashboard: pages cache per-tenant data in component state
 * and stores, so a hard navigation is the only way to be sure nothing from
 * the previous company stays on screen.
 */
export function useSwitchTenant() {
  const { setTokens, setTenant } = useAuthStore();
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const switchTenant = useCallback(
    async (tenant: Tenant, role: UserRole | null, redirectTo = '/') => {
      setSwitchingId(tenant.id);
      setError(null);
      try {
        const tokens = await authApi.switchTenant(tenant.id);
        setTokens(tokens.access_token, tokens.refresh_token);
        setTenant(tenant, role);
        window.location.href = redirectTo;
      } catch (err) {
        setError(getErrorMessage(err));
        setSwitchingId(null);
      }
    },
    [setTokens, setTenant]
  );

  return { switchTenant, switchingId, error };
}
