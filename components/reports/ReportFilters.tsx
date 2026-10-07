'use client';

/** Period button and comparison menu of the report filter row (handoff §2.3). */

import { useState } from 'react';
import { CalendarDays, ChevronDown, Columns2 } from 'lucide-react';
import {
  AS_OF_PRESETS, BS_COMPARE, PL_COMPARE, RANGE_PRESETS, asOfDate, compareAsOf, compareRange, rangeDates, shortRange,
} from '@/lib/reports/periods';
import { dmy, norm, parseDmy, rangeText } from '@/lib/reports/format';
import { useReports } from './ReportsProvider';
import type { UseReport } from './useReport';
import styles from './Reports.module.css';

type PopProps = { report: UseReport; open: boolean; onOpen: (open: boolean) => void };

export function PeriodButton({ report, open, onOpen }: PopProps) {
  const { def, period } = report;
  const asof = def.mode === 'asof';
  return (
    <div className={styles.rel} data-menu-root>
      <button className={styles.perbtn} onClick={() => onOpen(!open)} title={asof ? period.text : rangeText(period.from!, period.to!)}>
        <CalendarDays size={13} />
        {asof ? 'Seisuga' : 'Periood'} <b className={styles.mono}>{period.buttonLabel}</b>
        <ChevronDown size={11} />
      </button>
      {open && <PeriodPopover report={report} onClose={() => onOpen(false)} />}
    </div>
  );
}

/** Mounted on open, so the custom inputs start from the current period. */
function PeriodPopover({ report, onClose }: { report: UseReport; onClose: () => void }) {
  const { def, filters, set, period } = report;
  const { fiscalYears } = useReports();
  const asof = def.mode === 'asof';
  const [a, setA] = useState(() => dmy(asof ? period.asOf : period.from));
  const [b, setB] = useState(() => (asof ? '' : dmy(period.to)));
  const [bad, setBad] = useState(false);

  const presets = asof ? AS_OF_PRESETS : RANGE_PRESETS;
  const presetTitle = (k: string) => (asof ? dmy(asOfDate(k, undefined, fiscalYears)) : rangeText(...rangeDates(k, undefined, undefined, fiscalYears)));

  const apply = () => {
    if (asof) {
      const at = parseDmy(a);
      if (!at) { setBad(true); return; }
      set({ per: 'custom', at });
    } else {
      const from = parseDmy(a), to = parseDmy(b);
      if (!from || !to || from > to) { setBad(true); return; }
      set({ per: 'custom', from, to });
    }
    onClose();
  };

  return (
    <div className={styles.pop}>
      <div className={styles.lbl}>{asof ? 'Seisuga' : 'Periood'}</div>
      <div className={styles.presets}>
        {presets.map(([k, label]) => (
          <button
            key={k}
            className={filters.per === k ? styles.presetOn : undefined}
            title={presetTitle(k)}
            onClick={() => { set({ per: k, at: null, from: null, to: null }); onClose(); }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className={styles.lbl} style={{ margin: '10px 0 6px' }}>Kohandatud</div>
      <div className={`${styles.dates} ${asof ? styles.datesOne : ''}`}>
        <input className={`${styles.inp} ${styles.mono} ${bad ? styles.inpBad : ''}`} placeholder="pp.kk.aaaa" value={a} onChange={(e) => setA(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && apply()} aria-label={asof ? 'Kuupäev' : 'Alates'} />
        {!asof && <input className={`${styles.inp} ${styles.mono} ${bad ? styles.inpBad : ''}`} placeholder="pp.kk.aaaa" value={b} onChange={(e) => setB(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && apply()} aria-label="Kuni" />}
      </div>
      <div className={styles.popfoot}>
        <span className={styles.hint}>{asof ? dmy(period.asOf) : rangeText(period.from!, period.to!)}</span>
        <button className={`${styles.btn} ${styles.sm} ${styles.primary}`} onClick={apply}>Rakenda</button>
      </div>
    </div>
  );
}

export function CompareButton({ report, open, onOpen }: PopProps) {
  const { filters, period } = report;
  const on = (filters.cmp || 'none') !== 'none' && !!period.compareLabel;
  return (
    <div className={styles.rel} data-menu-root>
      <button className={`${styles.perbtn} ${on ? styles.perbtnOn : ''}`} onClick={() => onOpen(!open)}>
        <Columns2 size={13} />
        {on ? <>vs <b className={styles.mono}>{period.compareLabel}</b></> : 'Võrdlus'}
        <ChevronDown size={11} />
      </button>
      {open && <CompareMenu report={report} onClose={() => onOpen(false)} />}
    </div>
  );
}

function CompareMenu({ report, onClose }: { report: UseReport; onClose: () => void }) {
  const { def, filters, set, period } = report;
  const { fiscalYears } = useReports();
  const bs = def.compare === 'bs';
  const options = bs ? BS_COMPARE : PL_COMPARE;
  const cmp = filters.cmp || 'none';
  const [custom, setCustom] = useState(cmp === 'custom');
  const [a, setA] = useState(() => (bs ? (filters.cat ? dmy(filters.cat) : '') : (filters.cfrom ? dmy(filters.cfrom) : '')));
  const [b, setB] = useState(() => (!bs && filters.cto ? dmy(filters.cto) : ''));
  const [bad, setBad] = useState(false);

  const optionDate = (k: string) => {
    if (k === 'none' || k === 'custom') return null;
    if (bs) { const d = compareAsOf(k, period.asOf!, undefined, fiscalYears); return d ? dmy(d) : null; }
    const r = compareRange(k, period.from!, period.to!);
    return r ? shortRange(r[0], r[1]) : null;
  };

  const applyCustom = () => {
    if (bs) {
      const at = parseDmy(a);
      if (!at) { setBad(true); return; }
      set({ cmp: 'custom', cat: at });
    } else {
      const from = parseDmy(a), to = parseDmy(b);
      if (!from || !to || from > to) { setBad(true); return; }
      set({ cmp: 'custom', cfrom: from, cto: to });
    }
    onClose();
  };

  return (
    <div className={styles.menu} style={{ left: 0, width: 250 }}>
      {options.map(([k, label]) => {
        const d = optionDate(k);
        return (
          <button
            key={k}
            className={`${styles.mitem} ${k === cmp ? styles.mitemOn : ''}`}
            onClick={() => {
              if (k === 'custom') { setCustom(true); return; }
              set({ cmp: k, cat: null, cfrom: null, cto: null });
              onClose();
            }}
          >
            <span>{label}{d && <span className={`${styles.mitemD} ${styles.mono}`}>{d}</span>}</span>
          </button>
        );
      })}
      {custom && (
        <div style={{ padding: '6px 7px 3px' }}>
          <div className={`${styles.dates} ${bs ? styles.datesOne : ''}`} style={{ marginTop: 0 }}>
            <input className={`${styles.inp} ${styles.mono} ${bad ? styles.inpBad : ''}`} placeholder="pp.kk.aaaa" value={a} onChange={(e) => setA(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applyCustom()} aria-label={bs ? 'Võrdluse kuupäev' : 'Võrdlus alates'} autoFocus />
            {!bs && <input className={`${styles.inp} ${styles.mono} ${bad ? styles.inpBad : ''}`} placeholder="pp.kk.aaaa" value={b} onChange={(e) => setB(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applyCustom()} aria-label="Võrdlus kuni" />}
          </div>
          <div className={styles.popfoot}>
            <span className={styles.hint} />
            <button className={`${styles.btn} ${styles.sm} ${styles.primary}`} onClick={applyCustom}>Rakenda</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Segment control (Ostjad | Tarnijad, Projektid | Kulukohad). */
export function Seg({ value, options, onChange }: { value: string; options: Array<[string, string]>; onChange: (v: string) => void }) {
  return (
    <div className={styles.seg} role="group">
      {options.map(([k, label]) => (
        <button key={k} className={value === k ? styles.segOn : undefined} aria-pressed={value === k} onClick={() => onChange(k)}>{label}</button>
      ))}
    </div>
  );
}

/** Checkbox toggle stored as "1" / absent. */
export function Toggle({ report, name, label }: { report: UseReport; name: string; label: string }) {
  return (
    <label className={styles.chk}>
      <input type="checkbox" checked={report.filters[name] === '1'} onChange={(e) => report.set({ [name]: e.target.checked ? '1' : null })} />
      {label}
    </label>
  );
}

/** Searchable picker for the filter row (Pearaamat: account, Partneri kontokaart: partner). */
export function Combobox<T extends { id: string }>({
  items, value, onChange, label, placeholder, search,
}: {
  items: T[];
  value: string;
  onChange: (id: string) => void;
  /** Text of an item in the input and the list. */
  label: (item: T) => string;
  placeholder: string;
  /** Extra searchable text (registry code). */
  search?: (item: T) => string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const current = items.find((i) => i.id === value);
  const q = norm(query.trim());
  const list = (q ? items.filter((i) => norm(`${label(i)} ${search?.(i) ?? ''}`).includes(q)) : items).slice(0, 80);

  const pick = (item: T | undefined) => {
    if (!item) return;
    onChange(item.id);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className={styles.combo} data-menu-root>
      <input
        value={open ? query : current ? label(current) : ''}
        placeholder={current ? label(current) : placeholder}
        onFocus={(e) => { setOpen(true); setCursor(0); e.currentTarget.select(); }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onChange={(e) => { setQuery(e.target.value); setCursor(0); setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (list.length) setCursor((c) => (c + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length);
          } else if (e.key === 'Enter') {
            pick(list[cursor]);
            e.currentTarget.blur();
          } else if (e.key === 'Escape') {
            setQuery('');
            setOpen(false);
            e.currentTarget.blur();
          }
        }}
        aria-label={placeholder}
      />
      {open && (
        <div className={styles.comboList}>
          {list.length === 0 && <div className={styles.rnone}>Ei leitud</div>}
          {list.map((item, i) => (
            <button
              key={item.id}
              className={`${styles.mitem} ${item.id === value ? styles.mitemOn : ''} ${i === cursor ? styles.riKb : ''}`}
              onMouseDown={(e) => { e.preventDefault(); pick(item); }}
            >
              {label(item)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
