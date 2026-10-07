'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { reportsApi } from '@/lib/api/reports.api';
import { accountingApi, type AccountOption } from '@/lib/api/accounting.api';
import { buildGeneralLedger, type LedgerRowData } from '@/lib/reports/build/ledger';
import { dmy, fmtAmount, fmtEur, fmtNum } from '@/lib/reports/format';
import { DrillHead, ReportPage, Strip, reportStyles as styles } from '@/components/reports/ReportPage';
import { Combobox } from '@/components/reports/ReportFilters';
import { entryHref } from '@/components/reports/AccountLedgerDrill';
import { useReport } from '@/components/reports/useReport';
import { useReportData } from '@/components/reports/useReportData';

export default function GeneralLedgerPage() {
  const report = useReport('general-ledger');
  const { period, ready, filters } = report;
  const accountId = filters.account_id || '';
  const [accounts, setAccounts] = useState<AccountOption[]>([]);

  useEffect(() => {
    let live = true;
    accountingApi.getAccounts().then((rows) => { if (live) setAccounts(rows.sort((a, b) => a.code.localeCompare(b.code))); }).catch(() => {});
    return () => { live = false; };
  }, []);

  const { data, loading, error } = useReportData(
    () => reportsApi.getGeneralLedger(accountId, period.from!, period.to!),
    [accountId, period.from, period.to],
    ready && !!accountId,
  );
  const built = useMemo(() => (data && accountId ? buildGeneralLedger(data) : null), [data, accountId]);
  const account = accounts.find((a) => a.id === accountId);
  const accountName = new Map(accounts.map((a) => [a.id, `${a.code} ${a.name}`]));

  return (
    <ReportPage<LedgerRowData>
      report={report}
      model={built?.model}
      loading={loading || !ready}
      error={error}
      empty={accountId ? 'Valitud perioodil kandeid ei ole' : 'Vali konto, et näha selle kandeid'}
      metrics={data && accountId ? [
        { label: 'Deebet', value: fmtEur(data.totalDebit) },
        { label: 'Kreedit', value: fmtEur(data.totalCredit) },
        { label: 'Lõppsaldo', value: fmtEur(data.closingBalance) },
      ] : []}
      filters={
        <Combobox
          items={accounts}
          value={accountId}
          onChange={(id) => report.set({ account_id: id })}
          label={(a) => `${a.code} ${a.name}`}
          placeholder="Vali konto"
        />
      }
      listhead={data && accountId && <>
        <b>{data.account.code} {data.account.name}</b>
        <span className={styles.mut}>· {period.text} · {data.transactions.length} kannet</span>
        <div className={styles.listheadR}><span>Summad eurodes</span></div>
      </>}
      print={{ title: account ? `Pearaamat · ${account.code} ${account.name}` : 'Pearaamat' }}
      drill={(row, close) => <EntryDrill row={row.data!} accountName={accountName} onClose={close} />}
    />
  );
}

function EntryDrill({ row, accountName, onClose }: { row: LedgerRowData; accountName: Map<string, string>; onClose: () => void }) {
  const { data, loading, error } = useReportData(() => accountingApi.getJournalEntry(row.entryId), [row.entryId]);
  const lines = data?.rows ?? [];
  return (
    <>
      <DrillHead
        title={row.reference || row.description || 'Kanne'}
        line={[dmy(row.date), data?.entry_number ? `Kanne ${data.entry_number}` : null, row.partner].filter(Boolean).join(' · ')}
        onClose={onClose}
      />
      <div className={styles.dbody}>
        <div className={styles.dsec}>
          <Strip cells={[{ k: 'Deebet', v: fmtAmount(row.debit) }, { k: 'Kreedit', v: fmtAmount(row.credit) }]} />
          {row.description && row.description !== row.reference && <div className={styles.dnote} style={{ color: 'var(--a-text-2)' }}>{row.description}</div>}
        </div>
        <div className={`${styles.dsec} ${styles.dsecLast}`}>
          <div className={styles.sech}>Kande read{lines.length ? ` · ${lines.length}` : ''}</div>
          {error ? <div className={styles.empty}>{error}</div> : !data ? <div className={styles.empty}>{loading ? 'Laadin…' : ''}</div> : (
            <div className={styles.lines} style={{ ['--lc' as string]: 'minmax(0,1fr) 80px 80px' }}>
              <div className={styles.lhead}><div>Konto</div><div className={styles.r}>Deebet</div><div className={styles.r}>Kreedit</div></div>
              {lines.map((l) => (
                <div key={l.id} className={styles.lrow}>
                  <div>{accountName.get(l.account_id) || l.account_id.slice(0, 8)}{l.description ? <span className={styles.lsub}>{l.description}</span> : null}</div>
                  <div className={`${styles.r} ${styles.mono}`}>{l.debit ? fmtNum(Number(l.debit)) : ''}</div>
                  <div className={`${styles.r} ${styles.mono}`}>{l.credit ? fmtNum(Number(l.credit)) : ''}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className={styles.dfoot}>
        <span className={styles.dhint}>↑↓ järgmine kanne · Esc sulgeb</span>
        <div className={styles.dfootR}><Link className={styles.btn} href={entryHref(row.entryId)}><ExternalLink size={13} /> Ava kanne</Link></div>
      </div>
    </>
  );
}
