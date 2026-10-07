'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail } from 'lucide-react';
import { reportsApi, type AgingPartnerLine } from '@/lib/api/reports.api';
import { invoiceRemindersApi } from '@/lib/api/invoiceReminders.api';
import { buildAging, BUCKET_LABELS } from '@/lib/reports/build/aging';
import { dmy, fmtEur, fmtNum } from '@/lib/reports/format';
import { DrillHead, ReportPage, Strip, reportStyles as styles } from '@/components/reports/ReportPage';
import { Seg, Toggle } from '@/components/reports/ReportFilters';
import { useReport } from '@/components/reports/useReport';
import { useReportData } from '@/components/reports/useReportData';
import { useReports } from '@/components/reports/ReportsProvider';

const BUCKET_VARS = ['--b0', '--b1', '--b2', '--b3', '--b4'];
const overdueColor = (days: number) => (days > 90 ? 'var(--b4)' : days > 60 ? 'var(--b3)' : days > 30 ? 'var(--b2)' : days > 0 ? 'var(--b1)' : 'var(--a-text-3)');

export default function AgingPage() {
  const report = useReport('aging');
  const { period, ready, filters } = report;
  const dir = filters.dir === 'payable' ? 'payable' : 'receivable';
  const { data, loading, error } = useReportData(() => reportsApi.getAgingReport(dir, period.asOf), [dir, period.asOf], ready);

  const built = useMemo(() => (data ? buildAging(data, { overdueOnly: filters.overdue === '1' }) : null), [data, filters.overdue]);
  const overdue = built ? built.total - built.buckets[0] : 0;

  return (
    <ReportPage
      report={report}
      model={built?.model}
      loading={loading || !ready}
      error={error}
      empty={filters.overdue === '1' ? 'Üle tähtaja arveid ei ole' : 'Avatud arveid ei ole'}
      metrics={built ? [
        { label: 'Avatud', value: fmtEur(built.total) },
        { label: 'Üle tähtaja', value: fmtEur(overdue), tone: overdue > 0.005 ? 'warn' : undefined },
        { label: 'Üle 90 p', value: fmtEur(built.buckets[4]), tone: built.buckets[4] > 0.005 ? 'neg' : undefined },
      ] : []}
      filters={<>
        <Seg value={dir} options={[['receivable', 'Ostjad'], ['payable', 'Tarnijad']]} onChange={(v) => report.set({ dir: v })} />
        <Toggle report={report} name="overdue" label="Ainult üle tähtaja" />
      </>}
      listhead={built && <>
        <b>{built.count} partnerit</b>
        <div className={styles.bucketbar}>
          {built.buckets.map((x, i) => <i key={i} style={{ width: `${built.total > 0 ? (Math.max(0, x) / built.total) * 100 : 0}%`, background: `var(${BUCKET_VARS[i]})` }} />)}
        </div>
        <div className={styles.legend}>
          {BUCKET_LABELS.map((l, i) => <span key={l}><span className={styles.dot} style={{ background: `var(${BUCKET_VARS[i]})` }} />{l}</span>)}
        </div>
        <div className={styles.listheadR}><span>Summad eurodes</span></div>
      </>}
      print={{ title: `Aegumisaruanne · ${dir === 'receivable' ? 'ostjad' : 'tarnijad'}` }}
      drill={(row, close) => <AgingDrill partner={row.data!} direction={dir} asOf={period.asOf!} onClose={close} />}
    />
  );
}

function AgingDrill({ partner, direction, asOf, onClose }: { partner: AgingPartnerLine; direction: 'receivable' | 'payable'; asOf: string; onClose: () => void }) {
  const router = useRouter();
  const { toast } = useReports();
  const [sending, setSending] = useState(false);
  const overdue = partner.total - partner.current;
  const late = partner.invoices.filter((i) => i.days_overdue > 0 && i.open_amount > 0.005);
  const oldest = Math.max(0, ...partner.invoices.map((i) => i.days_overdue));
  const receivable = direction === 'receivable';

  const remind = async () => {
    setSending(true);
    let sent = 0, failed = 0;
    for (const inv of late) {
      try { await invoiceRemindersApi.sendReminder(inv.id); sent += 1; } catch { failed += 1; }
    }
    setSending(false);
    toast(failed ? `Meeldetuletus saadetud ${sent} arvele, ${failed} ebaõnnestus` : `Meeldetuletus saadetud (${sent} arvet)`);
  };

  return (
    <>
      <DrillHead title={partner.partner_name} line={`${receivable ? 'Ostja' : 'Tarnija'} · seisuga ${dmy(asOf)} · ${partner.invoices.length} avatud arvet`} onClose={onClose} />
      <div className={styles.dbody}>
        <div className={styles.dsec}>
          <Strip cells={[
            { k: 'Avatud', v: fmtEur(partner.total) },
            { k: 'Üle tähtaja', v: fmtEur(overdue), tone: overdue > 0.005 ? 'warn' : undefined },
            { k: 'Vanim', v: oldest > 0 ? `${oldest} p` : '–', tone: oldest > 90 ? 'neg' : undefined },
          ]} />
        </div>
        <div className={`${styles.dsec} ${styles.dsecLast}`}>
          <div className={styles.sech}>Avatud arved</div>
          <div className={styles.lines} style={{ ['--lc' as string]: 'minmax(0,1fr) 78px 62px 90px' }}>
            <div className={styles.lhead}><div>Arve</div><div>Tähtaeg</div><div className={styles.r}>Üle</div><div className={styles.r}>Avatud</div></div>
            {[...partner.invoices].sort((a, b) => b.days_overdue - a.days_overdue).map((i) => (
              <div key={i.id} className={styles.lrow}>
                <div>
                  <Link href={`/invoices/${i.id}/edit`}>{receivable ? 'Müügiarve' : 'Ostuarve'} {i.invoice_number}</Link>
                  <span className={`${styles.lsub} ${styles.mono}`}>{dmy(i.invoice_date)}</span>
                </div>
                <div className={styles.mono}>{dmy(i.due_date)}</div>
                <div className={`${styles.r} ${styles.mono}`} style={{ color: overdueColor(i.days_overdue), fontWeight: 600 }}>{i.days_overdue > 0 ? `${i.days_overdue} p` : '–'}</div>
                <div className={`${styles.a} ${styles.mono}`}>{fmtNum(i.open_amount)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.dfoot}>
        <Link className={styles.btn} href={`/reports/partner-statement?partner_id=${partner.partner_id}`}>Partneri kontokaart</Link>
        <div className={styles.dfootR}>
          {receivable && late.length > 0 && (
            <button className={`${styles.btn} ${styles.primary}`} onClick={remind} disabled={sending}><Mail size={13} /> Saada meeldetuletus</button>
          )}
          {!receivable && late.length > 0 && (
            <button className={`${styles.btn} ${styles.primary}`} onClick={() => router.push(`/accounting/payment-batches?new=1&invoices=${late.map((i) => i.id).join(',')}`)}>Lisa maksepaketti</button>
          )}
        </div>
      </div>
    </>
  );
}
