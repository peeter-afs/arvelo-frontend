'use client';

/**
 * Shared state of the report shell, mounted once in app/(dashboard)/reports/layout.tsx
 * so the rail and the saved views survive navigation between reports.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { accountingApi } from '@/lib/api/accounting.api';
import { reportViewsApi, type ReportView } from '@/lib/api/reportViews.api';
import { useAuthStore } from '@/lib/stores/auth.store';
import type { FiscalYearSpan } from '@/lib/reports/periods';
import styles from './Reports.module.css';

type ReportsContextValue = {
  fiscalYears: FiscalYearSpan[];
  /** False until the fiscal years are known: period presets depend on them. */
  yearsReady: boolean;
  views: ReportView[];
  reloadViews: () => Promise<ReportView[]>;
  toast: (message: string) => void;
  /** The report rail is folded up into a pill in the top bar: the report gets the full width. */
  railCollapsed: boolean;
  setRailCollapsed: (collapsed: boolean) => void;
};

const RAIL_KEY = 'arvelo.reports.rail';

const ReportsContext = createContext<ReportsContextValue | null>(null);

export function useReports() {
  const value = useContext(ReportsContext);
  if (!value) throw new Error('useReports must be used inside ReportsProvider');
  return value;
}

export function ReportsProvider({ children }: { children: ReactNode }) {
  const tenantId = useAuthStore((s) => s.tenant?.id);
  const [fiscalYears, setFiscalYears] = useState<FiscalYearSpan[]>([]);
  // Which company the fiscal years were loaded for: presets wait until they are known.
  const [yearsFor, setYearsFor] = useState<string | null>(null);
  const yearsReady = yearsFor === (tenantId ?? '');
  const [views, setViews] = useState<ReportView[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [railCollapsed, setRailState] = useState(() => {
    if (typeof window === 'undefined') return false;
    try { return localStorage.getItem(RAIL_KEY) === 'collapsed'; } catch { return false; }
  });
  const setRailCollapsed = useCallback((collapsed: boolean) => {
    setRailState(collapsed);
    try { localStorage.setItem(RAIL_KEY, collapsed ? 'collapsed' : 'open'); } catch { /* ignore */ }
  }, []);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let live = true;
    accountingApi
      .listFiscalYears()
      .then((rows) => { if (live) setFiscalYears((rows || []).map((y) => ({ date_start: y.date_start, date_end: y.date_end }))); })
      .catch(() => { if (live) setFiscalYears([]); /* calendar-year presets */ })
      .finally(() => { if (live) setYearsFor(tenantId ?? ''); });
    return () => { live = false; };
  }, [tenantId]);

  // Older backend without /api/report-views: no saved views.
  const fetchViews = useCallback(() => reportViewsApi.list().catch(() => [] as ReportView[]), []);
  const reloadViews = useCallback(async () => {
    const rows = await fetchViews();
    setViews(rows);
    return rows;
  }, [fetchViews]);

  useEffect(() => {
    let live = true;
    fetchViews().then((rows) => { if (live) setViews(rows); });
    return () => { live = false; };
  }, [fetchViews, tenantId]);

  const toast = useCallback((text: string) => {
    setMessage(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setMessage(null), 2400);
  }, []);

  const value = useMemo(
    () => ({ fiscalYears, yearsReady, views, reloadViews, toast, railCollapsed, setRailCollapsed }),
    [fiscalYears, yearsReady, views, reloadViews, toast, railCollapsed, setRailCollapsed],
  );

  return (
    <ReportsContext.Provider value={value}>
      {children}
      {message && <div className={styles.toast} role="status">{message}</div>}
    </ReportsContext.Provider>
  );
}
