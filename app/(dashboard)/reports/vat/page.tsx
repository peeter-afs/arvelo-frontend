'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { reportsApi } from '@/lib/api/reports.api';
import { buildKmd, type KmdRowData } from '@/lib/reports/build/kmd';
import { dm, fmtAmount, fmtEur, fmtNum } from '@/lib/reports/format';
import { DrillHead, ReportPage, Strip, reportStyles as styles } from '@/components/reports/ReportPage';
import { useReport } from '@/components/reports/useReport';
import { useReportData } from '@/components/reports/useReportData';
import { useReports } from '@/components/reports/ReportsProvider';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const NOT_MONTH = 'KMD esitatakse kalendrikuu kohta. XML-i eksportimiseks vali kuu esimene ja viimane päev.';

export default function VatPage() {
  const report = useReport('vat');
  const { period, ready } = report;
  const { toast } = useReports();
  const { data, loading, error } = useReportData(() => reportsApi.getVATReport(period.from!, period.to!), [period.from, period.to], ready);
  const built = useMemo(() => (data ? buildKmd(data) : null), [data]);
  const month = period.from?.slice(0, 7);

  const xml = (kind: 'kmd' | 'inf') => async () => {
    if (!data?.period) { toast(NOT_MONTH); return; }
    try {
      const blob = kind === 'kmd' ? await reportsApi.downloadKmdXml(period.from!, period.to!) : await reportsApi.downloadKmdInfXml(period.from!, period.to!);
      downloadBlob(blob, kind === 'kmd' ? `KMD_${month}.xml` : `KMD_INF_${month}.xml`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Eksport ebaõnnestus');
    }
  };

  return (
    <ReportPage<KmdRowData>
      report={report}
      model={built?.model}
      loading={loading || !ready}
      error={error}
      metrics={built ? [
        { label: 'Väljundkäibemaks', value: fmtEur(built.output) },
        { label: 'Sisendkäibemaks', value: fmtEur(built.input) },
        built.refund > 0
          ? { label: 'Enammakstud', value: fmtEur(built.refund), tone: 'pos' }
          : { label: 'Tasumisele', value: fmtEur(built.payable), tone: built.payable > 0 ? 'warn' : undefined },
      ] : []}
      extraExports={[
        { label: 'KMD XML', desc: 'e-MTA-sse laadimiseks', run: xml('kmd') },
        { label: 'KMD INF XML', desc: 'Lisa A- ja B-osa', run: xml('inf') },
      ]}
      listhead={data && <>
        <b>KMD</b>
        <span className={styles.mut}>· {period.text} · KMD INF: A-osas {data.sales_annex_count} rida, B-osas {data.purchases_annex_count} rida</span>
        <div className={styles.listheadR}><span className={styles.mut}>Klõps real avab arved</span><span>Summad eurodes</span></div>
      </>}
      notes={data && <>
        {!data.period && <div className={styles.note}>{NOT_MONTH}</div>}
        {data.warnings.length > 0 && (
          <div className={styles.note}>
            <AlertTriangle size={13} style={{ flex: 'none', marginTop: 2 }} />
            <div><b>Kontrolli enne esitamist:</b> {data.warnings.join(' · ')}</div>
          </div>
        )}
      </>}
      footer={data && <div className={styles.check}><span>Rida 4 arvutatakse nagu e-MTA-s: ridade 1–2² summad korrutatuna määraga. Hallid read: Arvelo ei erista neid arvetel, täida vajadusel e-MTA-s käsitsi.</span></div>}
      drill={(row, close) => <KmdDrill line={row.data!} onClose={close} />}
    />
  );
}

function KmdDrill({ line, onClose }: { line: KmdRowData; onClose: () => void }) {
  const amounts = line.invoices.map((i) => {
    const b = line.rate === null ? null : i.tax_rate_breakdown.find((x) => Math.abs(x.tax_rate - line.rate!) < 0.001);
    return { inv: i, taxable: b ? b.taxable_amount : i.subtotal, vat: b ? b.vat_amount : i.tax_amount };
  });
  const taxable = amounts.reduce((s, a) => s + a.taxable, 0);
  const vat = amounts.reduce((s, a) => s + a.vat, 0);
  return (
    <>
      <DrillHead code={line.num} title={line.side === 'sales' ? 'Müügiarved' : 'Ostuarved'} line={line.label} onClose={onClose} />
      <div className={styles.dbody}>
        <div className={styles.dsec}>
          <Strip cells={[{ k: 'Arveid', v: String(line.invoices.length) }, { k: 'Maksustatav', v: fmtAmount(taxable) }, { k: 'Käibemaks', v: fmtAmount(vat) }]} />
        </div>
        <div className={`${styles.dsec} ${styles.dsecLast}`}>
          <div className={styles.sech}>Arved · {line.invoices.length}{line.rate !== null ? ` · ${line.rate}%` : ''}</div>
          <div className={styles.lines} style={{ ['--lc' as string]: '44px minmax(0,1fr) 84px 72px' }}>
            <div className={styles.lhead}><div>Kp</div><div>Arve</div><div className={styles.r}>Maksustatav</div><div className={styles.r}>KM</div></div>
            {amounts.map(({ inv, taxable: t, vat: v }) => (
              <div key={inv.id} className={styles.lrow}>
                <div className={styles.mono}>{dm(inv.invoice_date)}</div>
                <div>
                  <Link href={`/invoices/${inv.id}/edit`}>{inv.invoice_number}</Link>
                  {inv.type.endsWith('credit_note') ? <span className={`${styles.tag} ${styles.tagDraft}`}>Kreeditarve</span> : null}
                  <span className={styles.lsub}>{inv.partner_name || '—'}</span>
                </div>
                <div className={`${styles.r} ${styles.mono}`}>{fmtNum(t)}</div>
                <div className={`${styles.a} ${styles.mono}`}>{fmtNum(v)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.dfoot}><span className={styles.dhint}>↑↓ järgmine rida · Esc sulgeb</span></div>
    </>
  );
}
