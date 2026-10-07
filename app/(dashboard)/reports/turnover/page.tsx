'use client';

import { useMemo } from 'react';
import { reportsApi } from '@/lib/api/reports.api';
import { buildTurnover } from '@/lib/reports/build/ledger';
import { fmtEur } from '@/lib/reports/format';
import { ReportPage, reportStyles as styles } from '@/components/reports/ReportPage';
import { AccountLedgerDrill } from '@/components/reports/AccountLedgerDrill';
import { useReport } from '@/components/reports/useReport';
import { useReportData } from '@/components/reports/useReportData';

export default function TurnoverPage() {
  const report = useReport('turnover');
  const { period, ready } = report;
  const { data, loading, error } = useReportData(() => reportsApi.getTurnoverReport(period.from!, period.to!), [period.from, period.to], ready);
  const built = useMemo(() => (data ? buildTurnover(data) : null), [data]);

  return (
    <ReportPage
      report={report}
      model={built?.model}
      loading={loading || !ready}
      error={error}
      empty="Valitud perioodil kandeid ei ole"
      metrics={built ? [
        { label: 'Käive deebet', value: fmtEur(built.totals.periodDebit) },
        { label: 'Käive kreedit', value: fmtEur(built.totals.periodCredit) },
      ] : []}
      listhead={data && <>
        <b>{data.accounts.length} kontot</b>
        <span className={styles.mut}>· {period.text}</span>
        <div className={styles.listheadR}><span className={styles.mut}>Klõps kontol avab pearaamatu</span><span>Summad eurodes</span></div>
      </>}
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
