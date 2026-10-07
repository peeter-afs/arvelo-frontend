'use client';

import { useMemo } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { reportsApi } from '@/lib/api/reports.api';
import { buildTrialBalance } from '@/lib/reports/build/ledger';
import { fiscalYearOf } from '@/lib/reports/periods';
import { fmtEur, fromIso, rangeText, toIso } from '@/lib/reports/format';
import { ReportPage, reportStyles as styles } from '@/components/reports/ReportPage';
import { AccountLedgerDrill } from '@/components/reports/AccountLedgerDrill';
import { useReport } from '@/components/reports/useReport';
import { useReportData } from '@/components/reports/useReportData';
import { useReports } from '@/components/reports/ReportsProvider';

export default function TrialBalancePage() {
  const report = useReport('trial-balance');
  const { period, ready } = report;
  const { fiscalYears } = useReports();
  const { data, loading, error } = useReportData(() => reportsApi.getTrialBalance(period.asOf), [period.asOf], ready);
  const built = useMemo(() => (data ? buildTrialBalance(data) : null), [data]);
  const drillFrom = period.asOf ? toIso(fiscalYearOf(fromIso(period.asOf), fiscalYears).start) : '';
  const balanced = !!data && Math.abs(built?.diff ?? 0) < 0.01;

  return (
    <ReportPage
      report={report}
      model={built?.model}
      loading={loading || !ready}
      error={error}
      empty="Kandeid ei ole"
      metrics={data ? [
        { label: 'Deebet', value: fmtEur(data.totalDebit) },
        { label: 'Kreedit', value: fmtEur(data.totalCredit) },
        { label: 'Vahe', value: fmtEur(built?.diff ?? 0), tone: balanced ? undefined : 'neg' },
      ] : []}
      listhead={data && <>
        <b>{data.accounts.length} kontot</b>
        <span className={styles.mut}>· {period.text} · kõik kanded algusest</span>
        <div className={styles.listheadR}><span className={styles.mut}>Klõps kontol avab pearaamatu</span><span>Summad eurodes</span></div>
      </>}
      footer={data && (
        <div className={`${styles.check} ${balanced ? styles.checkOk : styles.checkBad}`}>
          {balanced ? <Check size={13} /> : <AlertTriangle size={13} />}
          <span>{balanced ? 'Proovibilanss on tasakaalus: deebet = kreedit' : `Proovibilanss ei ole tasakaalus · vahe ${fmtEur(built?.diff ?? 0)}`}</span>
        </div>
      )}
      drill={(row, close) => (
        <AccountLedgerDrill
          accountId={row.data!.accountId}
          code={row.data!.code}
          name={row.data!.name}
          from={drillFrom}
          to={period.asOf!}
          line={`Pearaamat · ${rangeText(drillFrom, period.asOf!)} · ${row.data!.group}`}
          onClose={close}
        />
      )}
    />
  );
}
