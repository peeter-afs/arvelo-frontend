'use client';

/** Account drill (Bilanss, Kasumiaruanne, Proovibilanss, Käibeandmik): the account's ledger for the period. */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { reportsApi } from '@/lib/api/reports.api';
import { accountingApi } from '@/lib/api/accounting.api';
import { dm, fmtAmount, fmtNum } from '@/lib/reports/format';
import { DrillHead, Strip } from './ReportPage';
import { useReportData } from './useReportData';
import styles from './Reports.module.css';

export const ledgerHref = (accountId: string, from: string, to: string) =>
  `/reports/general-ledger?${new URLSearchParams({ account_id: accountId, per: 'custom', from, to }).toString()}`;

/** Where a ledger row's document opens: the journal entry. */
export const entryHref = (entryId: string) => `/accounting/journal/${entryId}`;

export function AccountLedgerDrill({
  accountId, code, name, from, to, line, onClose, hint = '↑↓ järgmine konto · Esc sulgeb',
}: {
  accountId: string | null | undefined;
  code?: string;
  name: string;
  from: string;
  to: string;
  /** "Pearaamat · 01.01.2026 – 07.10.2026 · Käibevara". */
  line: string;
  onClose: () => void;
  hint?: string;
}) {
  // Older report responses carry only the code: find the account by it.
  const [byCode, setByCode] = useState<string | null>(null);
  useEffect(() => {
    if (accountId || !code) return;
    let live = true;
    accountingApi.getAccounts().then((rows) => { if (live) setByCode(rows.find((a) => a.code === code)?.id ?? null); }).catch(() => {});
    return () => { live = false; };
  }, [accountId, code]);
  accountId = accountId || (code ? byCode : null);

  const { data, loading, error } = useReportData(
    () => reportsApi.getGeneralLedger(accountId!, from, to),
    [accountId, from, to],
    !!accountId,
  );

  const head = <DrillHead code={code} title={name} line={line} onClose={onClose} />;
  if (!accountId) {
    return (
      <>
        {head}
        <div className={styles.dbody}><div className={styles.empty}>{code ? 'Selle konto pearaamatut ei saa siit avada.' : 'Arvutuslik rida: see tuleneb kasumiaruandest, eraldi kontot sellel pole.'}</div></div>
        <div className={styles.dfoot}><span className={styles.dhint}>{hint}</span></div>
      </>
    );
  }

  const tx = data?.transactions ?? [];
  return (
    <>
      {head}
      <div className={styles.dbody}>
        {error ? <div className={styles.empty}>{error}</div> : !data ? <div className={styles.empty}>{loading ? 'Laadin…' : ''}</div> : (
          <>
            <div className={styles.dsec}>
              <Strip cells={[
                { k: 'Algsaldo', v: fmtAmount(data.openingBalance) },
                { k: 'Deebet', v: fmtAmount(data.totalDebit) },
                { k: 'Kreedit', v: fmtAmount(data.totalCredit) },
                { k: 'Lõppsaldo', v: fmtAmount(data.closingBalance) },
              ]} />
            </div>
            <div className={`${styles.dsec} ${styles.dsecLast}`}>
              <div className={styles.sech}>
                Kanded · {tx.length}
                <span className={styles.sechR}><Link href={ledgerHref(accountId, from, to)}>Ava pearaamatus <ExternalLink size={10} /></Link></span>
              </div>
              <div className={styles.lines} style={{ ['--lc' as string]: '40px minmax(0,1fr) 66px 66px 74px' }}>
                <div className={styles.lhead}><div>Kuupäev</div><div>Dokument</div><div className={styles.r}>Deebet</div><div className={styles.r}>Kreedit</div><div className={styles.r}>Saldo</div></div>
                <div className={`${styles.lrow} ${styles.lrowOb}`}><div /><div>Algsaldo</div><div /><div /><div className={`${styles.a} ${styles.mono}`}>{fmtAmount(data.openingBalance)}</div></div>
                {tx.map((t) => (
                  <div key={`${t.id}-${t.balance}`} className={styles.lrow}>
                    <div className={styles.mono}>{dm(t.date)}</div>
                    <div>
                      <Link href={entryHref(t.id)}>{t.reference || t.description || 'Kanne'}</Link>
                      <span className={styles.lsub}>{[t.description, t.partner].filter((x) => x && x !== t.reference).join(' · ')}</span>
                    </div>
                    <div className={`${styles.r} ${styles.mono}`}>{t.debit ? fmtNum(t.debit) : ''}</div>
                    <div className={`${styles.r} ${styles.mono}`}>{t.credit ? fmtNum(t.credit) : ''}</div>
                    <div className={`${styles.a} ${styles.mono}`}>{fmtAmount(t.balance)}</div>
                  </div>
                ))}
                <div className={`${styles.lrow} ${styles.lrowOb}`}><div /><div>Lõppsaldo</div><div className={`${styles.r} ${styles.mono}`}>{fmtNum(data.totalDebit)}</div><div className={`${styles.r} ${styles.mono}`}>{fmtNum(data.totalCredit)}</div><div className={`${styles.a} ${styles.mono}`}>{fmtAmount(data.closingBalance)}</div></div>
              </div>
            </div>
          </>
        )}
      </div>
      <div className={styles.dfoot}>
        <span className={styles.dhint}>{hint}</span>
        <div className={styles.dfootR}><Link className={styles.btn} href={ledgerHref(accountId, from, to)}><ExternalLink size={13} /> Ava pearaamatus</Link></div>
      </div>
    </>
  );
}
