'use client';

/**
 * One shell for every report (handoff §2): top bar with metrics and actions,
 * filter row, report card with listhead + table, and the drill panel. A report
 * page only supplies its row model, metrics, extra filters and drill renderer.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { ChevronDown, Download, Printer, Star, X } from 'lucide-react';
import type { ReportModel, ReportRow } from '@/lib/reports/types';
import { dmy, norm, rangeText } from '@/lib/reports/format';
import { exportCsv, exportXlsx, type ExportMeta } from '@/lib/reports/exportXlsx';
import { reportViewsApi } from '@/lib/api/reportViews.api';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useOutsideClose } from '@/components/payments/shared';
import { ReportTable, lineRows } from './ReportTable';
import { CompareButton, PeriodButton } from './ReportFilters';
import { SaveViewPopover } from './SaveViewPopover';
import { PrintSheet } from './PrintSheet';
import { useReports } from './ReportsProvider';
import type { UseReport } from './useReport';
import styles from './Reports.module.css';

export type MetricSpec = { label: string; value: string; tone?: 'pos' | 'neg' | 'warn' };
export type ExtraExport = { label: string; desc: string; run: () => void | Promise<void> };

type Pop = 'per' | 'cmp' | 'save' | 'exp' | null;

const inField = (e: KeyboardEvent) => (e.target as Element | null)?.matches?.('input,select,textarea,[contenteditable="true"]') ?? false;

/* ── drill panel width: default 400, min 340, report card ≥ 620 (handoff §4) ── */
const MIN_PANEL = 340, MIN_MAIN = 620, DEFAULT_PANEL = 400, PANEL_KEY = 'arvelo.reports.panel';
function useDrillPanel() {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_PANEL;
    try { return Number(localStorage.getItem(PANEL_KEY)) || DEFAULT_PANEL; } catch { return DEFAULT_PANEL; }
  });
  const [bodyWidth, setBodyWidth] = useState(0);
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    const el = bodyRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setBodyWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const onPointerDown = useCallback((e: ReactPointerEvent) => {
    e.preventDefault();
    const start = e.clientX, current = width, total = bodyRef.current?.clientWidth || 1200;
    setDragging(true);
    const move = (ev: PointerEvent) => setWidth(Math.max(MIN_PANEL, Math.min(total - 9 - MIN_MAIN, current + start - ev.clientX)));
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      setDragging(false);
      setWidth((v) => { try { localStorage.setItem(PANEL_KEY, String(v)); } catch { /* ignore */ } return v; });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }, [width]);
  const reset = useCallback(() => { setWidth(DEFAULT_PANEL); try { localStorage.removeItem(PANEL_KEY); } catch { /* ignore */ } }, []);
  const px = bodyWidth ? Math.max(MIN_PANEL, Math.min(width, bodyWidth - 9 - MIN_MAIN)) : width;
  return { bodyRef, px, dragging, onPointerDown, reset };
}

/** "bilanss_2026-10-07", "kasumiaruanne_2026-01-01_2026-10-07". */
export function exportFilename(report: UseReport) {
  const slug = norm(report.def.name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const p = report.period;
  return `${slug}_${p.asOf ?? (p.from && p.to ? `${p.from}_${p.to}` : 'aruanne')}`;
}

/** "Seisuga 07.10.2026 · võrdlus 31.12.2025 · summad eurodes". */
export function periodLine(report: UseReport) {
  const p = report.period;
  const base = p.asOf ? `Seisuga ${dmy(p.asOf)}` : p.from && p.to ? `Periood ${rangeText(p.from, p.to)}` : '';
  return [base, p.compareLabel ? `võrdlus ${p.compareLabel}` : '', 'summad eurodes'].filter(Boolean).join(' · ');
}

export function ReportPage<D>({
  report, metrics = [], filters, listhead, notes, model, loading, error, empty = 'Valitud perioodil andmed puuduvad',
  footer, drill, body, print, extraExports = [], hidePeriod = false,
}: {
  report: UseReport;
  metrics?: MetricSpec[];
  /** Report-specific controls after the period / compare buttons. */
  filters?: ReactNode;
  listhead?: ReactNode;
  /** Warnings between the listhead and the table. */
  notes?: ReactNode;
  model?: ReportModel<D> | null;
  loading: boolean;
  error?: string | null;
  empty?: string;
  /** Under the table (balance check). */
  footer?: ReactNode;
  drill?: (row: ReportRow<D>, close: () => void) => ReactNode;
  /** Replaces the report card content (annual report). */
  body?: ReactNode;
  print?: { title?: string; signatures?: boolean; body?: ReactNode; periodLine?: string } | false;
  extraExports?: ExtraExport[];
  hidePeriod?: boolean;
}) {
  const { def, view, dirty, resetToView, filters: f, period } = report;
  const { reloadViews, toast } = useReports();
  const tenant = useAuthStore((s) => s.tenant);
  const userId = useAuthStore((s) => s.user?.id);
  const [pop, setPop] = useState<Pop>(null);
  const [printing, setPrinting] = useState(false);
  const [selKey, setSelKey] = useState<string | null>(null);
  const rowsRef = useRef<HTMLDivElement | null>(null);
  const { bodyRef, px: panelPx, dragging, onPointerDown, reset: resetPanel } = useDrillPanel();
  const showZero = f.zero === '1';

  const closePop = useCallback(() => setPop(null), []);
  useOutsideClose(closePop);
  const toggle = (p: Pop) => setPop((cur) => (cur === p ? null : p));

  const lines = useMemo(() => (model ? lineRows(model, showZero) : []), [model, showZero]);
  const selected = drill ? lines.find((r) => r.key === selKey) ?? null : null;

  const canPrint = print !== false && (!!model || !!(print && print.body));
  const openPrint = () => { setPop(null); if (canPrint) setPrinting(true); };

  // Keyboard (handoff §9): Esc popover → drill; ↑/↓ moves the selected line; Ctrl/⌘+P print view.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (printing) return;
      if (e.key === 'p' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setPop(null); if (canPrint) setPrinting(true); return; }
      if (inField(e)) return;
      if (e.key === 'Escape') {
        if (pop) setPop(null);
        else if (selKey) setSelKey(null);
        return;
      }
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && selected) {
        e.preventDefault();
        const i = lines.findIndex((r) => r.key === selected.key);
        const next = lines[Math.max(0, Math.min(lines.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))];
        if (next) setSelKey(next.key);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [printing, pop, selKey, selected, lines, canPrint]);

  // Keep the selected line in view after ↑/↓ (below the sticky head).
  useEffect(() => {
    if (!selKey) return;
    const el = rowsRef.current?.querySelector<HTMLElement>(`[data-row-key="${CSS.escape(selKey)}"]`);
    const scroller = el?.closest(`.${styles.tscroll}`) as HTMLElement | null;
    if (!el || !scroller) return;
    const top = el.offsetTop, bottom = top + el.offsetHeight;
    if (top < scroller.scrollTop + 32 || bottom > scroller.scrollTop + scroller.clientHeight) {
      scroller.scrollTop = top - scroller.clientHeight / 2;
    }
  }, [selKey]);

  const meta = (): ExportMeta => ({
    title: print && print.title ? print.title : def.name,
    company: tenant?.name || '',
    periodLine: periodLine(report),
    filename: exportFilename(report),
    showZero,
  });

  const runExport = async (kind: 'xlsx' | 'csv' | 'pdf') => {
    setPop(null);
    if (kind === 'pdf') { openPrint(); return; }
    if (!model) return;
    try {
      if (kind === 'xlsx') await exportXlsx(model as ReportModel, meta());
      else exportCsv(model as ReportModel, meta());
    } catch {
      toast('Eksport ebaõnnestus');
    }
  };

  const saveDirty = async () => {
    if (!view) return;
    try {
      await reportViewsApi.update(view.id, { filters: f });
      await reloadViews();
      toast('Vaade uuendatud');
    } catch {
      toast(view.owner_user_id === userId ? 'Salvestamine ebaõnnestus' : 'Seda vaadet saab muuta ainult selle looja');
    }
  };

  const title = view ? view.name : def.name;
  const sub = view ? `${def.name}${period.text ? ` · ${period.text}` : ''}` : period.text;
  const content = body ?? (
    <>
      {listhead && <div className={styles.listhead}>{listhead}</div>}
      {notes}
      {error ? (
        <div className={styles.empty}>{error}</div>
      ) : !model ? (
        <div className={styles.empty}>{loading ? 'Laadin…' : empty}</div>
      ) : model.rows.length === 0 ? (
        <div className={styles.empty}>{empty}</div>
      ) : (
        <ReportTable
          model={model}
          showZero={showZero}
          loading={loading}
          selectedKey={selected?.key ?? null}
          onSelect={(row) => drill && setSelKey((k) => (k === row.key ? null : row.key))}
          rowsRef={rowsRef}
        />
      )}
      {footer}
    </>
  );

  return (
    <>
      <div className={styles.topbar}>
        <h1>{title}</h1>
        {sub && <span className={styles.sub}>{sub}</span>}
        {metrics.length > 0 && (
          <div className={styles.metrics}>
            {metrics.slice(0, 3).map((m) => (
              <div key={m.label} className={`${styles.metric} ${m.tone === 'pos' ? styles.metricPos : m.tone === 'neg' ? styles.metricNeg : m.tone === 'warn' ? styles.metricWarn : ''}`}>
                <span className={styles.metricKey}>{m.label}</span>
                <span className={`${styles.metricValue} ${styles.mono}`}>{m.value}</span>
              </div>
            ))}
          </div>
        )}
        <div className={`${styles.acts} ${metrics.length ? '' : styles.actsOnly}`} data-menu-root>
          <button className={styles.btn} onClick={() => toggle('save')}><Star size={13} /> {view ? 'Vaade' : 'Salvesta vaade'}</button>
          {print !== false && <button className={styles.btn} onClick={openPrint} disabled={!canPrint}><Printer size={13} /> Prindi</button>}
          {(model !== undefined || extraExports.length > 0) && <button className={styles.btn} onClick={() => toggle('exp')}><Download size={13} /> Ekspordi <ChevronDown size={11} /></button>}
          {pop === 'save' && <SaveViewPopover report={report} onClose={closePop} />}
          {pop === 'exp' && (
            <div className={styles.menu} style={{ right: 0, width: 240 }}>
              <button className={styles.mitem} onClick={() => runExport('xlsx')} disabled={!model}><span>Excel (.xlsx)<span className={styles.mitemD}>Valemid ja vahesummad säilivad</span></span></button>
              <button className={styles.mitem} onClick={() => runExport('csv')} disabled={!model}><span>CSV<span className={styles.mitemD}>Ainult read, ilma vormindamiseta</span></span></button>
              {print !== false && <button className={styles.mitem} onClick={() => runExport('pdf')}><span>PDF<span className={styles.mitemD}>Sama mis prindivaade</span></span></button>}
              {extraExports.map((x) => (
                <button key={x.label} className={styles.mitem} onClick={() => { setPop(null); void x.run(); }}><span>{x.label}<span className={styles.mitemD}>{x.desc}</span></span></button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.railrow}>
        {def.mode !== 'none' && !hidePeriod && <PeriodButton report={report} open={pop === 'per'} onOpen={(o) => setPop(o ? 'per' : null)} />}
        {def.compare && <CompareButton report={report} open={pop === 'cmp'} onOpen={(o) => setPop(o ? 'cmp' : null)} />}
        {filters}
        {dirty && (
          <>
            <span className={styles.sp} />
            <span className={styles.dirty}>Vaade muudetud · <button className={styles.link} onClick={saveDirty}>Salvesta</button> · <button className={styles.link} onClick={resetToView}>Taasta</button></span>
          </>
        )}
      </div>

      <div
        ref={bodyRef}
        className={`${styles.body} ${selected ? styles.bodyDrill : ''}`}
        style={{ ['--panel-width' as string]: `${panelPx}px` }}
      >
        <section className={styles.card}>{content}</section>
        {selected && drill && (
          <>
            <div className={`${styles.gutter} ${dragging ? styles.gutterOn : ''}`} title="Lohista paneeli laiust · topeltklikk lähtestab" onPointerDown={onPointerDown} onDoubleClick={resetPanel} />
            <aside className={styles.card} aria-label="Detailid">{drill(selected, () => setSelKey(null))}</aside>
          </>
        )}
      </div>

      {printing && (
        <PrintSheet
          model={(model as ReportModel) ?? null}
          options={{
            title: print && print.title ? print.title : def.name,
            periodLine: (print && print.periodLine) || periodLine(report).replace(/^./, (c) => c.toUpperCase()),
            showZero,
            signatures: print ? print.signatures : undefined,
            body: print ? print.body : undefined,
          }}
          onClose={() => setPrinting(false)}
        />
      )}
    </>
  );
}

/* ── drill panel building blocks (handoff §4) ── */

export function DrillHead({ code, title, line, onClose }: { code?: string; title: string; line: ReactNode; onClose: () => void }) {
  return (
    <div className={styles.dhead}>
      <div className={styles.drow}>
        <div className={styles.tt}>
          <h2>{code ? <span className={`${styles.mono} ${styles.dcode}`}>{code} </span> : null}{title}</h2>
          <div className={styles.line}>{line}</div>
        </div>
        <button className={`${styles.btn} ${styles.sm} ${styles.ghost}`} onClick={onClose} title="Sulge (Esc)" aria-label="Sulge"><X size={14} /></button>
      </div>
    </div>
  );
}

export function Strip({ cells }: { cells: Array<{ k: string; v: string; tone?: 'pos' | 'neg' | 'warn' }> }) {
  return (
    <div className={styles.strip} style={{ ['--n' as string]: cells.length }}>
      {cells.map((c) => (
        <div key={c.k}>
          <div className={styles.stripK}>{c.k}</div>
          <div className={`${styles.stripV} ${styles.mono} ${c.tone === 'pos' ? styles.cPos : c.tone === 'neg' ? styles.cNeg : c.tone === 'warn' ? styles.cWarn : ''}`}>{c.v}</div>
        </div>
      ))}
    </div>
  );
}

export { styles as reportStyles };
