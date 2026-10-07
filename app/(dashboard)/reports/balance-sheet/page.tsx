'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { AlertTriangle, Check } from 'lucide-react';
import { reportsApi } from '@/lib/api/reports.api';
import { buildBalanceSheet } from '@/lib/reports/build/balanceSheet';
import { fiscalYearOf } from '@/lib/reports/periods';
import { fmtEur, fromIso, rangeText, toIso } from '@/lib/reports/format';
import { ReportPage, reportStyles as styles } from '@/components/reports/ReportPage';
import { Toggle } from '@/components/reports/ReportFilters';
import { AccountLedgerDrill } from '@/components/reports/AccountLedgerDrill';
import { useReport } from '@/components/reports/useReport';
import { useReportData } from '@/components/reports/useReportData';
import { useReports } from '@/components/reports/ReportsProvider';

export default function BalanceSheetPage() {
  const report = useReport('balance-sheet');
  const { period, ready } = report;
  const { fiscalYears } = useReports();
  const { data, loading, error } = useReportData(
    () => reportsApi.getBalanceSheet(period.asOf, period.compareAsOf || undefined),
    [period.asOf, period.compareAsOf],
    ready,
  );

  const built = useMemo(
    () => (data ? buildBalanceSheet(data, { periodLabel: period.text.replace('seisuga ', ''), compareLabel: period.compareLabel ?? null }) : null),
    [data, period.text, period.compareLabel],
  );
  // The account drill shows the fiscal year up to the as-of date.
  const drillFrom = period.asOf ? toIso(fiscalYearOf(fromIso(period.asOf), fiscalYears).start) : '';

  return (
    <ReportPage
      report={report}
      model={built?.model}
      loading={loading || !ready}
      error={error}
      metrics={built ? [
        { label: 'Varad', value: fmtEur(built.totals.assets) },
        { label: 'Kohustised', value: fmtEur(built.totals.liabilities) },
        { label: 'Omakapital', value: fmtEur(built.totals.equity) },
      ] : []}
      filters={<Toggle report={report} name="zero" label="Näita nullsaldoga kontosid" />}
      listhead={<>
        <b>Bilanss</b>
        <span className={styles.mut}>· {period.text}{period.compareLabel ? ` · võrdlus ${period.compareLabel}` : ''}</span>
        <div className={styles.listheadR}><span className={styles.mut}>Klõps kontol avab pearaamatu</span><span>Summad eurodes</span></div>
      </>}
      footer={built && (
        <div className={`${styles.check} ${built.check.ok ? styles.checkOk : styles.checkBad}`}>
          {built.check.ok ? <Check size={13} /> : <AlertTriangle size={13} />}
          <span>{built.check.ok ? 'Bilanss on tasakaalus: varad = kohustised + omakapital' : `Bilanss ei ole tasakaalus · vahe ${fmtEur(built.check.diff)}`}</span>
          <span className={styles.checkR}>Aruandeaasta kasum tuleb kasumiaruandest · <Link href="/reports/profit-loss">ava</Link></span>
        </div>
      )}
      print={{ signatures: true }}
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
