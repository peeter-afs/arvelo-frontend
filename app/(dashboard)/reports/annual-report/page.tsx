'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, FileText, Loader2, Plus, RefreshCw, Upload } from 'lucide-react';
import { annualReportApi, type AnnualReportSubmission } from '@/lib/api/annualReport.api';
import { accountingApi, type FiscalYearWithPeriods } from '@/lib/api/accounting.api';
import { getErrorMessage } from '@/lib/api/client';
import { dmy, rangeText } from '@/lib/reports/format';
import { ReportPage, reportStyles as styles } from '@/components/reports/ReportPage';
import { Combobox } from '@/components/reports/ReportFilters';
import { useReport } from '@/components/reports/useReport';

const STATUS: Record<AnnualReportSubmission['status'], [string, 'ok' | 'info' | 'draft' | 'bad' | 'pend']> = {
  draft: ['Mustand', 'draft'],
  generating: ['Genereerimine…', 'info'],
  generated: ['Genereeritud', 'info'],
  submitting: ['Esitamine…', 'pend'],
  submitted: ['Esitatud', 'pend'],
  accepted: ['Vastu võetud', 'ok'],
  rejected: ['Tagasi lükatud', 'bad'],
  error: ['Viga', 'bad'],
};
const TAG_CLASS = { ok: styles.tagOk, info: styles.tagInfo, draft: styles.tagDraft, bad: styles.tagBad, pend: styles.tagPend };

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const yearLabel = (fy: { date_start: string; date_end: string; is_closed?: boolean }) =>
  `${rangeText(fy.date_start, fy.date_end)}${fy.is_closed ? ' · suletud' : ''}`;

export default function AnnualReportPage() {
  const report = useReport('annual-report');
  const [submissions, setSubmissions] = useState<AnnualReportSubmission[] | null>(null);
  const [years, setYears] = useState<FiscalYearWithPeriods[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fyId = report.filters.fy || years[0]?.id || '';

  const load = useCallback(async () => {
    try {
      const [subs, fys] = await Promise.all([annualReportApi.listSubmissions(), accountingApi.listFiscalYears()]);
      setSubmissions(subs);
      setYears(fys);
      setError(null);
    } catch (e) {
      setError(getErrorMessage(e));
      setSubmissions((s) => s ?? []);
    }
  }, []);

  useEffect(() => {
    let live = true;
    Promise.all([annualReportApi.listSubmissions(), accountingApi.listFiscalYears()])
      .then(([subs, fys]) => { if (live) { setSubmissions(subs); setYears(fys); } })
      .catch((e) => { if (live) { setError(getErrorMessage(e)); setSubmissions([]); } });
    return () => { live = false; };
  }, []);

  const act = (key: string, fn: () => Promise<unknown>) => async () => {
    setBusy(key);
    try { await fn(); await load(); } catch (e) { setError(getErrorMessage(e)); } finally { setBusy(null); }
  };

  const shown = (submissions ?? []).filter((s) => !report.filters.fy || s.fiscal_year_id === report.filters.fy);
  const accepted = (submissions ?? []).filter((s) => s.status === 'accepted').length;

  return (
    <ReportPage
      report={report}
      loading={submissions === null}
      print={false}
      metrics={submissions ? [
        { label: 'Esitamisi', value: String(submissions.length) },
        { label: 'Vastu võetud', value: String(accepted), tone: accepted ? 'pos' : undefined },
      ] : []}
      filters={<>
        <Combobox
          items={years}
          value={fyId}
          onChange={(id) => report.set({ fy: id })}
          label={yearLabel}
          placeholder="Vali majandusaasta"
        />
        <button className={`${styles.btn} ${styles.primary}`} disabled={!fyId || busy === 'create'} onClick={act('create', () => annualReportApi.createSubmission(fyId))}>
          {busy === 'create' ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Loo esitamine
        </button>
      </>}
      body={
        <>
          <div className={styles.listhead}>
            <b>{shown.length} esitamist</b>
            <span className={styles.mut}>· XBRL Äriregistrile</span>
            <div className={styles.listheadR}><span className={styles.mut}>Bilanss ja kasumiaruanne tulevad pearaamatust</span></div>
          </div>
          {error && <div className={`${styles.note} ${styles.noteBad}`}>{error}</div>}
          {submissions === null ? (
            <div className={styles.empty}>Laadin…</div>
          ) : shown.length === 0 ? (
            <div className={styles.empty}>Esitamisi ei ole. Vali majandusaasta ja loo uus esitamine.</div>
          ) : (
            <div className={styles.tscroll}>
              <div className={styles.rt} style={{ ['--rc' as string]: 'minmax(240px,1fr) 130px 110px 110px minmax(220px,auto)' }}>
                <div className={styles.rhd}><div>Majandusaasta</div><div>Olek</div><div>Loodud</div><div>Esitatud</div><div className={styles.n}>Tegevused</div></div>
                {shown.map((s) => {
                  const [label, kind] = STATUS[s.status] ?? STATUS.draft;
                  const working = busy === s.id;
                  return (
                    <div key={s.id} className={`${styles.rr} ${styles.ln} ${styles.lnStatic} ${styles.lnFlat}`} style={{ alignItems: 'center' }}>
                      <div className={styles.acc} style={{ flexDirection: 'column', gap: 1 }}>
                        <span className={styles.nmStrong}>{s.fiscal_year ? yearLabel(s.fiscal_year) : '—'}</span>
                        {s.error_message && <small className={styles.cNeg} style={{ whiteSpace: 'normal' }}>{s.error_message}</small>}
                        {s.rik_document_id && <small className={styles.mut}>RIK ID {s.rik_document_id}</small>}
                      </div>
                      <div><span className={`${styles.tag} ${TAG_CLASS[kind]}`} style={{ marginLeft: 0 }}>{label}</span></div>
                      <div className={styles.mono}>{dmy(s.created_at.slice(0, 10))}</div>
                      <div className={styles.mono}>{s.submitted_at ? dmy(s.submitted_at.slice(0, 10)) : '–'}</div>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        {(s.status === 'draft' || s.status === 'error') && (
                          <button className={`${styles.btn} ${styles.sm} ${styles.primary}`} disabled={working} onClick={act(s.id, () => annualReportApi.generateXbrl(s.id))}>
                            {working ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />} Genereeri XBRL
                          </button>
                        )}
                        {(s.status === 'generated' || s.status === 'submitted' || s.status === 'accepted') && (
                          <button className={`${styles.btn} ${styles.sm}`} onClick={act(`dl-${s.id}`, async () => downloadBlob(await annualReportApi.downloadXbrl(s.id), `annual_report_${s.id}.xbrl`))}>
                            <Download size={12} /> XBRL
                          </button>
                        )}
                        {s.status === 'generated' && (
                          <button className={`${styles.btn} ${styles.sm} ${styles.primary}`} disabled={working} onClick={act(s.id, () => annualReportApi.submitToRik(s.id))}>
                            {working ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} Esita Äriregistrile
                          </button>
                        )}
                        {s.status === 'submitted' && (
                          <button className={`${styles.btn} ${styles.sm}`} disabled={working} onClick={act(s.id, () => annualReportApi.checkStatus(s.id))}>
                            {working ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Kontrolli olekut
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      }
    />
  );
}
