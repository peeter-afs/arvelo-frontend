'use client';

import { useMemo } from 'react';
import { reportsApi } from '@/lib/api/reports.api';
import { buildProfitLoss } from '@/lib/reports/build/profitLoss';
import { fmtEur } from '@/lib/reports/format';
import { ReportPage, reportStyles as styles } from '@/components/reports/ReportPage';
import { Toggle } from '@/components/reports/ReportFilters';
import { AccountLedgerDrill } from '@/components/reports/AccountLedgerDrill';
import { useReport } from '@/components/reports/useReport';
import { useReportData } from '@/components/reports/useReportData';

export default function ProfitLossPage() {
  const report = useReport('profit-loss');
  const { period, ready } = report;
  const cmp = period.compareRange;
  const { data, loading, error } = useReportData(
    () => reportsApi.getProfitLoss(period.from!, period.to!, cmp ? { startDate: cmp[0], endDate: cmp[1] } : undefined),
    [period.from, period.to, cmp?.[0], cmp?.[1]],
    ready,
  );

  const built = useMemo(
    () => (data ? buildProfitLoss(data, { periodLabel: 'Periood', compareLabel: period.compareLabel ?? null }) : null),
    [data, period.compareLabel],
  );

  return (
    <ReportPage
      report={report}
      model={built?.model}
      loading={loading || !ready}
      error={error}
      metrics={built ? [
        { label: 'Tulud', value: fmtEur(built.totals.income) },
        { label: 'Kulud', value: fmtEur(built.totals.expenses) },
        { label: 'Kasum', value: fmtEur(built.totals.net), tone: built.totals.net >= 0 ? 'pos' : 'neg' },
      ] : []}
      filters={<Toggle report={report} name="zero" label="Näita nullsaldoga kontosid" />}
      listhead={<>
        <b>Kasumiaruanne</b>
        <span className={styles.mut}>· {period.text}{period.compareLabel ? ` · võrdlus ${period.compareLabel}` : ''}</span>
        <div className={styles.listheadR}><span className={styles.mut}>Klõps kontol avab pearaamatu</span><span>Summad eurodes</span></div>
      </>}
      print={{ signatures: true }}
      drill={(row, close) => (
        <AccountLedgerDrill
          accountId={row.data!.accountId}
          code={row.data!.code}
          name={row.data!.name}
          from={period.from!}
          to={period.to!}
          line={`Pearaamat · ${period.text} · ${row.data!.group}`}
          onClose={close}
        />
      )}
    />
  );
}
