'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { reportsApi, type PartnerStatement } from '@/lib/api/reports.api';
import { accountingApi, type PartnerOption } from '@/lib/api/accounting.api';
import { buildPartnerStatement, entryKind, SIDE_NAME, type StatementRowData } from '@/lib/reports/build/partnerStatement';
import { dmy, fmtAmount, fmtEur } from '@/lib/reports/format';
import { DrillHead, ReportPage, Strip, reportStyles as styles } from '@/components/reports/ReportPage';
import { Combobox, Seg } from '@/components/reports/ReportFilters';
import { useReport } from '@/components/reports/useReport';
import { useReportData } from '@/components/reports/useReportData';

export default function PartnerStatementPage() {
  const report = useReport('partner-statement');
  const { period, ready, filters } = report;
  const partnerId = filters.partner_id || '';
  const confirmation = filters.doc === 'confirmation';
  const [partners, setPartners] = useState<PartnerOption[]>([]);

  useEffect(() => {
    let live = true;
    accountingApi.getPartners().then((rows) => { if (live) setPartners(rows.sort((a, b) => a.name.localeCompare(b.name, 'et'))); }).catch(() => {});
    return () => { live = false; };
  }, []);

  // A balance confirmation is "as of" the period end; the card covers the whole period.
  const { data, loading, error } = useReportData(
    () => reportsApi.getPartnerStatement({ partner_id: partnerId, date_from: confirmation ? undefined : period.from, date_to: period.to }),
    [partnerId, confirmation, period.from, period.to],
    ready && !!partnerId,
  );
  const built = useMemo(() => (data && partnerId && !confirmation ? buildPartnerStatement(data) : null), [data, partnerId, confirmation]);
  const sides = data?.sides ?? [];
  const balance = (side: 'receivable' | 'payable') => sides.find((s) => s.side === side)?.closing_balance ?? 0;
  const differences = sides.filter((s) => s.unexplained_difference !== null && Math.abs(s.unexplained_difference) > 0.005);

  return (
    <ReportPage<StatementRowData>
      report={report}
      model={confirmation ? null : built?.model}
      loading={loading || !ready}
      error={error}
      empty={partnerId ? 'Selles perioodis liikumisi ei ole' : 'Vali partner, et näha tema kontokaarti'}
      metrics={data && partnerId ? [
        { label: 'Nõuded', value: fmtEur(balance('receivable')) },
        { label: 'Võlad', value: fmtEur(balance('payable')) },
      ] : []}
      filters={<>
        <Combobox
          items={partners}
          value={partnerId}
          onChange={(id) => report.set({ partner_id: id })}
          label={(p) => p.name}
          search={(p) => p.reg_code || ''}
          placeholder="Vali partner"
        />
        <Seg value={confirmation ? 'confirmation' : 'card'} options={[['card', 'Kontokaart'], ['confirmation', 'Saldoteatis']]} onChange={(v) => report.set({ doc: v })} />
      </>}
      listhead={data && partnerId && <>
        <b>{data.partner.name}</b>
        <span className={styles.mut}>· {confirmation ? `saldoteatis seisuga ${dmy(data.date_to)}` : period.text}{data.partner.reg_code ? ` · ${data.partner.reg_code}` : ''}</span>
        <div className={styles.listheadR}><span>Summad: {data.currency}</span></div>
      </>}
      notes={differences.map((s) => (
        <div key={s.side} className={styles.note}>{SIDE_NAME[s.side]}: saldo erineb arvete tasumata jäägist {fmtEur(s.unexplained_difference)} võrra (ümardus või tasaarveldus väljaspool makseid).</div>
      ))}
      body={confirmation && partnerId ? (
        <>
          {data && <div className={styles.listhead}><b>{data.partner.name}</b><span className={styles.mut}>· saldoteatis seisuga {dmy(data.date_to)}</span></div>}
          <div className={styles.dbody} style={{ padding: '16px 20px' }}>
            {error ? <div className={styles.empty}>{error}</div> : !data ? <div className={styles.empty}>{loading ? 'Laadin…' : ''}</div> : <BalanceConfirmation data={data} />}
          </div>
        </>
      ) : undefined}
      print={{
        title: confirmation ? 'Saldoteatis' : 'Partneri kontokaart',
        periodLine: confirmation && data ? `Seisuga ${dmy(data.date_to)} · summad: ${data.currency}` : undefined,
        body: confirmation && data ? <BalanceConfirmation data={data} print /> : undefined,
      }}
      drill={(row, close) => <EntryDrill entry={row.data!} onClose={close} />}
    />
  );
}

function EntryDrill({ entry, onClose }: { entry: StatementRowData; onClose: () => void }) {
  return (
    <>
      <DrillHead title={`${entryKind(entry)} ${entry.document_number ?? ''}`.trim()} line={`${dmy(entry.date)} · ${entry.description}`} onClose={onClose} />
      <div className={styles.dbody}>
        <div className={`${styles.dsec} ${styles.dsecLast}`}>
          <Strip cells={[
            { k: 'Deebet', v: fmtAmount(entry.debit) },
            { k: 'Kreedit', v: fmtAmount(entry.credit) },
            { k: 'Saldo', v: fmtAmount(entry.balance) },
          ]} />
          {entry.due_date && <div className={styles.dnote} style={{ color: 'var(--a-text-2)' }}>Tähtaeg {dmy(entry.due_date)}</div>}
        </div>
      </div>
      <div className={styles.dfoot}>
        <span className={styles.dhint}>↑↓ järgmine · Esc sulgeb</span>
        <div className={styles.dfootR}><Link className={styles.btn} href={`/invoices/${entry.invoice_id}/edit`}><ExternalLink size={13} /> Ava arve</Link></div>
      </div>
    </>
  );
}

/** Balance confirmation letter (saldoteatis): screen and print. */
function BalanceConfirmation({ data, print = false }: { data: PartnerStatement; print?: boolean }) {
  const td: React.CSSProperties = { padding: '4px 6px', borderBottom: '1px solid #eee', textAlign: 'right', whiteSpace: 'nowrap' };
  const th: React.CSSProperties = { ...td, fontSize: print ? 8.5 : 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--a-text-3)', borderBottom: '1px solid currentColor' };
  const p: React.CSSProperties = { fontSize: print ? 11.5 : 13, lineHeight: 1.6, margin: '0 0 12px' };
  return (
    <div style={{ maxWidth: 760 }}>
      {!print && (
        <div style={{ ...p, color: 'var(--a-text-2)' }}>
          <b style={{ color: 'var(--a-text)' }}>{data.partner.name}</b>
          {data.partner.reg_code ? ` · registrikood ${data.partner.reg_code}` : ''}{data.partner.address ? ` · ${data.partner.address}` : ''}
        </div>
      )}
      {print && <p style={p}><b>{data.partner.name}</b>{data.partner.reg_code ? `, registrikood ${data.partner.reg_code}` : ''}{data.partner.address ? `, ${data.partner.address}` : ''}</p>}
      {data.sides.length === 0 && <p style={p}>Seisuga {dmy(data.date_to)} ei ole meil teiega lahtisi arveldusi.</p>}
      {data.sides.map((side) => {
        const total = side.open_documents.reduce((sum, doc) => sum + doc.open_amount, 0);
        return (
          <section key={side.side} style={{ marginBottom: 20, breakInside: 'avoid' }}>
            <p style={p}>
              {side.side === 'receivable'
                ? `Meie andmetel on seisuga ${dmy(data.date_to)} Teie võlgnevus meie ees ${fmtAmount(total)} ${data.currency}, mis koosneb järgmistest dokumentidest:`
                : `Meie andmetel on seisuga ${dmy(data.date_to)} meie võlgnevus Teie ees ${fmtAmount(total)} ${data.currency}, mis koosneb järgmistest dokumentidest:`}
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: print ? 11 : 12.5, fontVariantNumeric: 'tabular-nums' }}>
              <thead><tr><th style={{ ...th, textAlign: 'left' }}>Dokument</th><th style={th}>Kuupäev</th><th style={th}>Tähtaeg</th><th style={th}>Summa</th><th style={th}>Tasumata</th></tr></thead>
              <tbody>
                {side.open_documents.map((doc) => (
                  <tr key={doc.invoice_id}>
                    <td style={{ ...td, textAlign: 'left' }}>{doc.document_number ?? '—'}{doc.kind === 'credit_note' ? ' (kreeditarve)' : ''}</td>
                    <td style={td}>{dmy(doc.date)}</td>
                    <td style={td}>{dmy(doc.due_date)}</td>
                    <td style={td}>{fmtAmount(doc.amount)}</td>
                    <td style={td}>{fmtAmount(doc.open_amount)}</td>
                  </tr>
                ))}
                <tr style={{ fontWeight: 700 }}>
                  <td style={{ ...td, textAlign: 'left', borderTop: '1.5px solid currentColor' }} colSpan={4}>Kokku ({data.currency})</td>
                  <td style={{ ...td, borderTop: '1.5px solid currentColor' }}>{fmtAmount(total)}</td>
                </tr>
              </tbody>
            </table>
          </section>
        );
      })}
      <p style={{ ...p, color: 'var(--a-text-2)' }}>Palume saldo kinnitada või teatada erinevustest 10 päeva jooksul. Kui vastust ei tule, loeme saldo kinnitatuks.</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 36, fontSize: print ? 10 : 12, color: 'var(--a-text-2)', breakInside: 'avoid' }}>
        <div style={{ borderTop: '1px solid #999', paddingTop: 4 }}>{data.company?.name ?? ''} esindaja</div>
        <div>
          <div style={{ borderTop: '1px solid #999', paddingTop: 4 }}>{data.partner.name} esindaja</div>
          <div style={{ marginTop: 20 }}>☐ Nõustume saldoga&nbsp;&nbsp;&nbsp;&nbsp; ☐ Ei nõustu (erinevused lisatud)</div>
        </div>
      </div>
    </div>
  );
}
