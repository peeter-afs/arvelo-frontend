'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LAST_REPORT_KEY, reportBySlug } from '@/lib/reports/registry';

/** /reports opens the last report the user had open, else the profit and loss. */
export default function ReportsIndexPage() {
  const router = useRouter();
  useEffect(() => {
    let last: string | null = null;
    try { last = localStorage.getItem(LAST_REPORT_KEY); } catch { /* ignore */ }
    router.replace(`/reports/${last && reportBySlug(last) ? last : 'profit-loss'}`);
  }, [router]);
  return null;
}
