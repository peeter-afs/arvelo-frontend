'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { reportsApi, type DimensionReportData, type DimensionReportLine } from '@/lib/api/reports.api';
import { buildDimensions, type DimensionRowData } from '@/lib/reports/build/dimensions';
import { dm, dmy, fmtAmount, fmtEur, fmtNum } from '@/lib/reports/format';
import { DrillHead, ReportPage, Strip, reportStyles as styles } from '@/components/reports/ReportPage';
import { Seg, Toggle } from '@/components/reports/ReportFilters';
import { ledgerHref } from '@/components/reports/AccountLedgerDrill';
import { useReport, type ReportPeriod } from '@/components/reports/useReport';
import { useReportData } from '@/components/reports/useReportData';

export default function DimensionsPage() {
  const report = useReport('dimensions');
  const { period, ready, filters } = report;
  const kind = filters.kind === 'cost_centers' ? 'cost_centers' : 'projects';
  const status = kind === 'projects' && (filters.status === 'in_progress' || filters.status === 'completed') ? filters.status : undefined;
  const drafts = filters.drafts === '1';
  const { data, loading, error } = useReportData(
    () => reportsApi.getDimensionReport(period.from!, period.to!, drafts, status ? { project_status: status } : {}),
    [period.from, period.to, drafts, status],
    ready,
  );

  const built = useMemo(() => (data ? buildDimensions(data, { kind, drafts }) : null), [data, kind, drafts]);
  const draftRevenue = data?.totals.draft_revenue || 0;
  const draftCosts = data?.totals.draft_costs || 0;

  return (
    <ReportPage
      report={report}
      model={built?.model}
      loading={loading || !ready}
      error={error}
      empty={kind === 'projects' ? 'Valitud perioodil projektidel kandeid ei ole' : 'Valitud perioodil kulukohtadel kandeid ei ole'}
      metrics={built ? [
        { label: 'Tulud', value: fmtEur(built.totals.revenue) },
        { label: 'Kulud', value: fmtEur(-built.totals.costs) },
        { label: 'Tulem', value: fmtEur(built.totals.result), tone: built.totals.result >= 0 ? 'pos' : 'neg' },
      ] : []}
      filters={<>
        <Seg value={kind} options={[['projects', 'Projektid'], ['cost_centers', 'Kulukohad']]} onChange={(v) => report.set({ kind: v })} />
        {kind === 'projects' && <Seg value={filters.status || 'all'} options={[['all', 'Kõik'], ['in_progress', 'Pooleli'], ['completed', 'Lõpetatud']]} onChange={(v) => report.set({ status: v })} />}
        <Toggle report={report} name="drafts" label="Kaasa mustandarved" />
      </>}
      listhead={built && <>
        <b>{built.count} {kind === 'projects' ? 'projekti' : 'kulukohta'}</b>
        <span className={styles.mut}>· pearaamatu kannete dimensioonidest</span>
        <div className={styles.listheadR}>
          {drafts && (draftRevenue || draftCosts) ? <span className={styles.draftNote}>sh mustandid: tulud {fmtEur(draftRevenue)}, kulud {fmtEur(draftCosts)}</span> : null}
          <span>Summad eurodes</span>
        </div>
      </>}
      notes={data?.basis === 'invoices' && (
        <div className={styles.note}>Aruanne põhineb arveridadel, sest pearaamatu kanderidadel pole veel projekti ja kulukoha andmeid (andmebaasi migratsioon 103 on rakendamata).</div>
      )}
      print={{ title: `Kulukohad ja projektid · ${kind === 'projects' ? 'projektid' : 'kulukohad'}` }}
      drill={(row, close) => <DimensionDrill item={row.data!} kind={kind} data={data!} drafts={drafts} period={period} onClose={close} />}
    />
  );
}

function docLink(l: DimensionReportLine) {
  const label = l.kind === 'revenue' ? 'Müügiarve' : 'Ostuarve';
  if (l.invoice_id) return <Link href={`/invoices/${l.invoice_id}/edit`}>{label} {l.invoice_number || l.invoice_id.slice(0, 8)}</Link>;
  if (l.source_document_schema?.startsWith('accounting.project_wip_release')) {
    return <Link href={`/accounting/projects/wip${l.project_id ? `?project=${l.project_id}` : ''}`}>LT mahakandmine</Link>;
  }
  if (l.journal_entry_id) return <Link href={`/accounting/journal/${l.journal_entry_id}`}>Kanne {l.entry_number ? `#${l.entry_number}` : ''}</Link>;
  return <span>Kanne</span>;
}

function DimensionDrill({ item, kind, data, drafts, period, onClose }: {
  item: DimensionRowData; kind: 'projects' | 'cost_centers'; data: DimensionReportData; drafts: boolean; period: ReportPeriod; onClose: () => void;
}) {
  const d = item.row;
  const result = item.revenue - item.costs;
  // The backend keys lines without a dimension as "unassigned".
  const byAccount = data.by_account?.[kind]?.[d.id ?? 'unassigned'] ?? [];
  const revenueAcc = byAccount.filter((a) => a.kind === 'revenue');
  const costAcc = byAccount.filter((a) => a.kind === 'cost');
  const dimKey = kind === 'projects' ? 'project_id' : 'cost_center_id';
  const lines = data.lines
    .filter((l) => (l[dimKey] ?? null) === (d.id ?? null) && (drafts || l.source !== 'draft'))
    .sort((a, b) => b.invoice_date.localeCompare(a.invoice_date));
  // "Ava pearaamatus": the account with the largest amount on this dimension.
  const topAccount = [...byAccount].filter((a) => a.account_id).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))[0];
  const status = kind === 'projects' && d.id ? (d.status === 'completed' ? `lõpetatud ${dmy(d.completed_at)}` : 'pooleli') : '';

  return (
    <>
      <DrillHead code={d.code || undefined} title={d.name || 'Määramata'} line={[d.partner_name, period.text, status].filter(Boolean).join(' · ')} onClose={onClose} />
      <div className={styles.dbody}>
        <div className={styles.dsec}>
          <Strip cells={[
            { k: 'Tulud', v: fmtAmount(item.revenue) },
            { k: 'Kulud', v: fmtAmount(-item.costs) },
            { k: 'Tulem', v: fmtAmount(result), tone: result >= 0 ? 'pos' : 'neg' },
            ...(kind === 'projects' ? [{ k: 'Lõpet. tööd', v: fmtAmount(d.wip_balance || 0) }] : []),
          ]} />
          {drafts && (d.draft_revenue || d.draft_costs) ? <div className={styles.dnote}>sh mustandarved: tulud {fmtEur(d.draft_revenue || 0)}, kulud {fmtEur(d.draft_costs || 0)}</div> : null}
        </div>
        {byAccount.length > 0 && (
          <div className={styles.dsec}>
            <div className={styles.sech}>Kontode kaupa</div>
            <div className={styles.lines} style={{ ['--lc' as string]: 'minmax(0,1fr) 96px' }}>
              {revenueAcc.length > 0 && <div className={styles.lhead}><div>Tulud</div><div /></div>}
              {revenueAcc.map((a) => (
                <div key={`r${a.account_id}`} className={styles.lrow}><div><span className={`${styles.mono} ${styles.mut}`}>{a.code}</span> {a.name}</div><div className={`${styles.a} ${styles.mono}`}>{fmtNum(a.amount)}</div></div>
              ))}
              {costAcc.length > 0 && <div className={styles.lhead}><div>Kulud</div><div /></div>}
              {costAcc.map((a) => (
                <div key={`c${a.account_id}`} className={styles.lrow}><div><span className={`${styles.mono} ${styles.mut}`}>{a.code}</span> {a.name}</div><div className={`${styles.a} ${styles.mono}`}>{fmtNum(-a.amount)}</div></div>
              ))}
            </div>
          </div>
        )}
        <div className={`${styles.dsec} ${styles.dsecLast}`}>
          <div className={styles.sech}>Dokumendid · {lines.length}</div>
          {lines.length > 0 && (
            <div className={styles.lines} style={{ ['--lc' as string]: '56px minmax(0,1fr) 90px' }}>
              {lines.map((l, i) => (
                <div key={`${l.journal_entry_id || l.invoice_id || ''}-${i}`} className={styles.lrow}>
                  <div className={styles.mono}>{dm(l.invoice_date)}</div>
                  <div>{docLink(l)}{l.source === 'draft' ? <span className={`${styles.tag} ${styles.tagDraft}`}>Mustand</span> : null}<span className={styles.lsub}>{l.partner_name || l.description}</span></div>
                  <div className={`${styles.a} ${styles.mono}`} style={l.kind === 'revenue' ? { color: 'var(--a-pos)' } : undefined}>{l.kind === 'revenue' ? '+' : '−'}{fmtAmount(Math.abs(l.amount))}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className={styles.dfoot}>
        <span className={styles.dhint}>↑↓ järgmine · Esc sulgeb</span>
        {topAccount?.account_id && (
          <div className={styles.dfootR}>
            <Link className={styles.btn} href={ledgerHref(topAccount.account_id, period.from!, period.to!)}><ExternalLink size={13} /> Ava pearaamatus</Link>
          </div>
        )}
      </div>
    </>
  );
}
