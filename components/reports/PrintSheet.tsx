'use client';

/**
 * Print view (handoff §6): a full-screen A4 preview of the same row model.
 * The table is a real <table> so the browser repeats <thead> on every page;
 * page numbers come from @page margin boxes (globals.css, [data-report-print]).
 */

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Printer } from 'lucide-react';
import type { ReportModel } from '@/lib/reports/types';
import { fmtNum, fmtPct, dmy, toIso } from '@/lib/reports/format';
import { useAuthStore } from '@/lib/stores/auth.store';
import styles from './PrintSheet.module.css';

export type PrintOptions = {
  /** Report title on the sheet ("Aegumisaruanne · ostjad"). */
  title: string;
  /** "Seisuga 07.10.2026 · võrdlus 31.12.2025 · summad eurodes". */
  periodLine: string;
  showZero: boolean;
  /** Bilanss / Kasumiaruanne: signature lines on by default. */
  signatures?: boolean;
  /** Replaces the table (e.g. the balance confirmation letter). */
  body?: ReactNode;
};

export function PrintSheet({ model, options, onClose }: { model: ReportModel | null; options: PrintOptions; onClose: () => void }) {
  const tenant = useAuthStore((s) => s.tenant);
  const user = useAuthStore((s) => s.user);
  const [codes, setCodes] = useState(true);
  const [sign, setSign] = useState(!!options.signatures);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(); }
      if (e.key === 'p' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); e.stopPropagation(); window.print(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  // Opened by a click, so this only ever renders in the browser.
  if (typeof document === 'undefined') return null;
  const company = tenant?.name || '';
  const footer = `Arvelo · ${company}`.replace(/["\\]/g, '');
  const rows = model ? (options.showZero ? model.rows : model.rows.filter((r) => !r.zero)) : [];
  const cols = model?.cols ?? [];

  return createPortal(
    <div className={styles.pv} data-report-print>
      <style>{`@page{size:A4;margin:14mm 14mm 16mm;@bottom-left{content:"${footer}";font:9px sans-serif;color:#888}@bottom-right{content:"lk " counter(page) " / " counter(pages);font:9px sans-serif;color:#888}}`}</style>
      <div className={styles.bar}>
        <b>Prindivaade</b>
        <span className={styles.barSub}>{options.title} · A4</span>
        {model && <label className={styles.chk}><input type="checkbox" checked={codes} onChange={(e) => setCodes(e.target.checked)} /> Kontokoodid</label>}
        {options.signatures !== undefined && <label className={styles.chk}><input type="checkbox" checked={sign} onChange={(e) => setSign(e.target.checked)} /> Allkirjaväljad</label>}
        <div className={styles.barR}>
          <button className={styles.btn} onClick={onClose}>Sulge <kbd className={styles.kbd}>Esc</kbd></button>
          <button className={`${styles.btn} ${styles.primary}`} onClick={() => window.print()}><Printer size={13} /> Prindi / salvesta PDF</button>
        </div>
      </div>
      <div className={styles.scroll}>
        <div className={styles.sheet}>
          <div className={styles.co}>
            <div>
              <b>{company}</b>
              {[tenant?.registry_code && `Registrikood ${tenant.registry_code}`, tenant?.vat_number && `KMKR ${tenant.vat_number}`].filter(Boolean).join(' · ')}
              {tenant?.address && <><br />{tenant.address}</>}
            </div>
            <div className={styles.coR}>Koostatud {dmy(toIso(new Date()))}{user?.name || user?.email ? <><br />{user?.name || user?.email}</> : null}</div>
          </div>
          <h2>{options.title}</h2>
          <div className={styles.per}>{options.periodLine}</div>
          {options.body ?? (
            <table>
              <thead>
                <tr>{cols.map((c, i) => <th key={i}>{c.label}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  if (r.t === 'sec' || r.t === 'grp') return <tr key={r.key} className={styles[r.t]}><td colSpan={cols.length}>{r.name}</td></tr>;
                  return (
                    <tr key={r.key} className={styles[r.t]}>
                      <td>
                        {r.t === 'ln' && codes && r.code ? <span className={styles.code}>{r.code}</span> : null}
                        {r.name}
                        {r.sub ? <span className={styles.subt}> · {r.sub}</span> : null}
                      </td>
                      {cols.slice(1).map((c, i) => <td key={i}>{c.pct ? fmtPct(r.v?.[i]) : fmtNum(r.v?.[i])}</td>)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {sign && <div className={styles.sign}><div>Juhatuse liige</div><div>Raamatupidaja</div></div>}
          <div className={styles.foot}><span>{footer}</span></div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
