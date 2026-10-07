'use client';

/** Report table (handoff §3): one row model, sticky head, auto-hiding comparison columns. */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CellTone, ReportCol, ReportModel, ReportRow } from '@/lib/reports/types';
import { fmtNum, fmtPct } from '@/lib/reports/format';
import styles from './Reports.module.css';

const TONE: Record<CellTone, string> = {
  pos: styles.cPos, neg: styles.cNeg, warn: styles.cWarn, mut: styles.cMut,
  b1: styles.cB1, b2: styles.cB2, b3: styles.cB3, b4: styles.cB4,
};
const ROW: Record<ReportRow['t'], string> = {
  sec: styles.sec, grp: styles.grp, ln: styles.ln, tot: styles.tot, gr: styles.gr, res: styles.res,
};
const TAG: Record<NonNullable<ReportRow['tag']>['kind'], string> = {
  ok: styles.tagOk, info: styles.tagInfo, draft: styles.tagDraft, bad: styles.tagBad, pend: styles.tagPend,
};

const FIRST_MIN = 240;
/** The name column gives way down to this before anything scrolls sideways. */
const FIRST_FLOOR = 160;
const SCROLLBAR = 14;
const colWidth = (c: ReportCol) => parseInt(c.width || '128px', 10);

/** Rows the screen shows: zero rows only with "Näita nullsaldoga kontosid". */
export const visibleRows = <D,>(model: ReportModel<D>, showZero: boolean) =>
  showZero ? model.rows : model.rows.filter((r) => !r.zero);

/** Selectable rows (↑/↓ order). */
export const lineRows = <D,>(model: ReportModel<D>, showZero: boolean) =>
  visibleRows(model, showZero).filter(isSelectable);

/** Lines with drill data; a subtotal can be one too (KMD lines 4 and 5). */
const isSelectable = <D,>(r: ReportRow<D>) => (r.t === 'ln' || r.t === 'tot') && r.data !== undefined;

export function Cell({ v, col, tone }: { v: number | null | undefined; col: ReportCol; tone?: CellTone }) {
  if (col.pct) {
    const t = v == null ? styles.zero : v > 0.05 ? styles.cPos : v < -0.05 ? styles.cNeg : styles.cMut;
    return <span className={t}>{fmtPct(v)}</span>;
  }
  const text = fmtNum(v);
  return <span className={text === '–' ? styles.zero : tone ? TONE[tone] : undefined}>{text}</span>;
}

export function ReportTable<D>({
  model, showZero, loading = false, selectedKey, onSelect, rowsRef,
}: {
  model: ReportModel<D>;
  showZero: boolean;
  /** Dims the previous result while the next one loads. */
  loading?: boolean;
  selectedKey: string | null;
  onSelect: (row: ReportRow<D>) => void;
  /** Lets the page scroll the selected row into view after ↑/↓. */
  rowsRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Drop the lowest `hide` columns first until the table fits, then narrow the
  // name column (never scroll sideways at a normal width).
  const { shown, firstMin } = useMemo(() => {
    const idx = model.cols.map((_, i) => i);
    if (!width) return { shown: idx, firstMin: FIRST_MIN };
    let cols = idx;
    const rest = () => cols.reduce((s, i) => s + (i === 0 ? 0 : colWidth(model.cols[i])), 0);
    const room = width - SCROLLBAR;
    const order = idx.filter((i) => model.cols[i].hide != null).sort((a, b) => model.cols[a].hide! - model.cols[b].hide!);
    for (const i of order) {
      if (FIRST_MIN + rest() <= room) break;
      cols = cols.filter((c) => c !== i);
    }
    return { shown: cols, firstMin: Math.max(FIRST_FLOOR, Math.min(FIRST_MIN, room - rest())) };
  }, [model.cols, width]);

  const template = shown.map((i) => (i === 0 ? `minmax(${firstMin}px,1fr)` : model.cols[i].width || '128px')).join(' ');
  const rows = visibleRows(model, showZero);

  return (
    <div className={`${styles.tscroll} ${loading ? styles.loading : ''}`} ref={scrollRef}>
      <div className={styles.rt} style={{ ['--rc' as string]: template }} ref={rowsRef}>
        <div className={styles.rhd}>
          {shown.map((i) => <div key={i} className={model.cols[i].numeric ? styles.n : undefined}>{model.cols[i].label}</div>)}
        </div>
        {rows.map((row) => {
          const selectable = isSelectable(row);
          const cls = [
            styles.rr, ROW[row.t],
            row.t === 'ln' && model.flatLines ? styles.lnFlat : '',
            row.t === 'ln' && !selectable ? styles.lnStatic : '',
            selectable && row.t !== 'ln' ? styles.ln : '',
            selectable && selectedKey === row.key ? styles.lnOn : '',
          ].join(' ');
          const first = (
            <div className={styles.acc}>
              {((row.t === 'ln' && (row.code !== undefined || !model.flatLines)) || (row.t !== 'ln' && row.code)) && (
                <span className={`${styles.code} ${styles.mono} ${model.wideCode ? styles.codeWide : ''}`} style={model.codeWidth ? { width: model.codeWidth } : undefined}>{row.code || ''}</span>
              )}
              <span className={`${styles.nm} ${model.flatLines && row.t === 'ln' ? styles.nmStrong : ''}`}>
                {row.name}
                {row.sub && <small>{row.sub}</small>}
                {row.tag && <span className={`${styles.tag} ${TAG[row.tag.kind]}`}>{row.tag.label}</span>}
              </span>
            </div>
          );
          if (row.t === 'sec' || row.t === 'grp') {
            return <div key={row.key} className={cls}>{first}{shown.slice(1).map((i) => <div key={i} />)}</div>;
          }
          return (
            <div
              key={row.key}
              className={cls}
              data-row-key={selectable ? row.key : undefined}
              onClick={selectable ? () => onSelect(row) : undefined}
            >
              {first}
              {shown.slice(1).map((i) => (
                <div key={i} className={`${styles.n} ${styles.mono}`}>
                  <Cell v={row.v?.[i - 1]} col={model.cols[i]} tone={row.tone?.[i - 1]} />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
