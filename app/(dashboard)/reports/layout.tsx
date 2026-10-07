'use client';

import { Suspense, type ReactNode } from 'react';
import { ReportsProvider } from '@/components/reports/ReportsProvider';
import { ReportRail } from '@/components/reports/ReportRail';
import styles from '@/components/reports/Reports.module.css';

/** Report shell (docs2/design_handoff_aruanded): own rail + one main column for every report. */
export default function ReportsLayout({ children }: { children: ReactNode }) {
  return (
    <ReportsProvider>
      <div className={styles.shell}>
        <Suspense fallback={<div className={styles.card} />}>
          <ReportRail />
        </Suspense>
        <div className={styles.main}>
          <Suspense fallback={null}>{children}</Suspense>
        </div>
      </div>
    </ReportsProvider>
  );
}
