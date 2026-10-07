'use client';

import { Suspense, type ReactNode } from 'react';
import { ReportsProvider, useReports } from '@/components/reports/ReportsProvider';
import { ReportRail } from '@/components/reports/ReportRail';
import styles from '@/components/reports/Reports.module.css';

/** Report shell (docs2/design_handoff_aruanded): own rail + one main column for every report. */
export default function ReportsLayout({ children }: { children: ReactNode }) {
  return (
    <ReportsProvider>
      <Shell>{children}</Shell>
    </ReportsProvider>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const { railCollapsed } = useReports();
  return (
    <div className={`${styles.shell} ${railCollapsed ? styles.shellCollapsed : ''}`}>
      <Suspense fallback={<div className={styles.card} />}>
        <ReportRail />
      </Suspense>
      <div className={styles.main}>
        <Suspense fallback={null}>{children}</Suspense>
      </div>
    </div>
  );
}
