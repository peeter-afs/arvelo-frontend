'use client';

import { useEffect, useState } from 'react';
import { accountingApi, type FiscalYearWithPeriods } from '@/lib/api/accounting.api';
import { invoicesApi } from '@/lib/api/invoices.api';
import { reportsApi } from '@/lib/api/reports.api';
import { getIsoToday } from '@/lib/utils/date';

const LIST_LIMIT = 1000;

type NavigationMetrics = {
  fiscalYearLabel: string;
  invoiceCount?: number;
  journalEntryCount?: number;
  isBalanced?: boolean;
  lastUpdatedAt?: Date;
  isLoading: boolean;
  hasError: boolean;
};

const currentYearLabel = () => String(new Date().getFullYear());

function fiscalYearLabel(fiscalYears: FiscalYearWithPeriods[], today: string) {
  const activeYear =
    fiscalYears.find((year) => year.date_start <= today && year.date_end >= today) ||
    fiscalYears.find((year) => !year.is_closed) ||
    fiscalYears[0];

  if (!activeYear) return currentYearLabel();

  const startYear = new Date(activeYear.date_start).getFullYear();
  const endYear = new Date(activeYear.date_end).getFullYear();
  return startYear === endYear ? String(startYear) : `${startYear}/${endYear}`;
}

async function fetchMetrics(): Promise<NavigationMetrics> {
  const today = getIsoToday();
  const [journalResult, invoiceResult, fiscalYearResult, trialBalanceResult] = await Promise.allSettled([
    accountingApi.listJournalEntries({ limit: LIST_LIMIT }),
    invoicesApi.listInvoices({ limit: LIST_LIMIT }),
    accountingApi.listFiscalYears(),
    reportsApi.getTrialBalance(today),
  ]);

  return {
    fiscalYearLabel:
      fiscalYearResult.status === 'fulfilled'
        ? fiscalYearLabel(fiscalYearResult.value, today)
        : currentYearLabel(),
    invoiceCount: invoiceResult.status === 'fulfilled' ? invoiceResult.value.length : undefined,
    journalEntryCount: journalResult.status === 'fulfilled' ? journalResult.value.length : undefined,
    isBalanced: trialBalanceResult.status === 'fulfilled' ? trialBalanceResult.value.isBalanced : undefined,
    lastUpdatedAt: new Date(),
    isLoading: false,
    hasError: [journalResult, invoiceResult, fiscalYearResult, trialBalanceResult].some((result) => result.status === 'rejected'),
  };
}

// The metrics badge is rendered by the sidebar, the status footer, and the
// mobile nav — all mounted together. Without sharing, each fired its own batch
// of four requests (two of them 1,000-row list downloads). Cache the result
// module-wide with a short TTL and de-duplicate concurrent callers so the whole
// shell costs one batch per navigation, not three.
const CACHE_TTL_MS = 30_000;
let cachedMetrics: { data: NavigationMetrics; at: number } | null = null;
let inflight: Promise<NavigationMetrics> | null = null;

function loadSharedMetrics(): Promise<NavigationMetrics> {
  if (cachedMetrics && Date.now() - cachedMetrics.at < CACHE_TTL_MS) {
    return Promise.resolve(cachedMetrics.data);
  }
  if (inflight) return inflight;

  inflight = fetchMetrics()
    .then((data) => {
      cachedMetrics = { data, at: Date.now() };
      return data;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export function useNavigationMetrics(): NavigationMetrics {
  const [metrics, setMetrics] = useState<NavigationMetrics>({
    fiscalYearLabel: currentYearLabel(),
    isLoading: true,
    hasError: false,
  });

  useEffect(() => {
    let isMounted = true;

    loadSharedMetrics()
      .then((data) => {
        if (isMounted) setMetrics(data);
      })
      .catch(() => {
        if (isMounted) setMetrics((prev) => ({ ...prev, isLoading: false, hasError: true }));
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return metrics;
}

export function formatMetricCount(count?: number) {
  if (typeof count !== 'number') return undefined;
  return count >= LIST_LIMIT ? `${LIST_LIMIT}+` : String(count);
}
