'use client';

/** Report rail (handoff §2.1): search, the ten reports by group, saved views. */

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import { REPORTS, REPORT_GROUPS, reportBySlug, reportHref, type ReportDef } from '@/lib/reports/registry';
import { fiscalYearOf } from '@/lib/reports/periods';
import { norm } from '@/lib/reports/format';
import type { ReportView } from '@/lib/api/reportViews.api';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useReports } from './ReportsProvider';
import styles from './Reports.module.css';

type Item = { kind: 'report'; def: ReportDef } | { kind: 'view'; view: ReportView };

/** Wraps the first diacritic-insensitive match in <mark>. */
function highlight(text: string, q: string): ReactNode {
  if (!q) return text;
  const i = norm(text).indexOf(q);
  if (i < 0) return text;
  return <>{text.slice(0, i)}<mark>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>;
}

export function viewHref(view: ReportView) {
  const def = reportBySlug(view.report);
  const q = new URLSearchParams({ view: view.id });
  for (const [k, v] of Object.entries(view.filters || {})) if (def?.defaults[k] !== v && v !== '') q.set(k, v);
  return `${reportHref(view.report)}?${q.toString()}`;
}

export function ReportRail() {
  const pathname = usePathname() || '';
  const params = useSearchParams();
  const router = useRouter();
  const company = useAuthStore((s) => s.tenant?.name);
  const { views, fiscalYears, railCollapsed, setRailCollapsed } = useReports();
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const activeSlug = pathname.split('/')[2] || '';
  const activeView = params.get('view');
  const q = norm(query.trim());

  const { groups, viewItems, flat } = useMemo(() => {
    const groups = REPORT_GROUPS.map((g) => ({
      group: g,
      items: REPORTS.filter((r) => r.group === g && (!q || norm(`${r.name} ${g} ${r.keywords}`).includes(q))),
    })).filter((g) => g.items.length);
    const viewItems = views.filter((v) => !q || norm(`${v.name} ${reportBySlug(v.report)?.name || ''}`).includes(q));
    const flat: Item[] = [
      ...groups.flatMap((g) => g.items.map((def) => ({ kind: 'report' as const, def }))),
      ...viewItems.map((view) => ({ kind: 'view' as const, view })),
    ];
    return { groups, viewItems, flat };
  }, [q, views]);


  // "/" focuses the search when no field has focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as Element | null;
      if (t?.matches?.('input,select,textarea,[contenteditable="true"]')) return;
      if (document.querySelector('[data-report-print]')) return;
      e.preventDefault();
      // A folded rail opens first, then the search takes focus.
      setRailCollapsed(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setRailCollapsed]);

  useEffect(() => {
    listRef.current?.querySelector(`.${styles.riKb}`)?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);

  const open = (item: Item) => {
    router.push(item.kind === 'report' ? reportHref(item.def.slug) : viewHref(item.view));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (flat.length) setCursor((c) => (c + (e.key === 'ArrowDown' ? 1 : -1) + flat.length) % flat.length);
    } else if (e.key === 'Enter') {
      const item = flat[q ? cursor : 0];
      if (item) { open(item); setQuery(''); e.currentTarget.blur(); }
    } else if (e.key === 'Escape') {
      setQuery('');
      e.currentTarget.blur();
    }
  };

  const cursorItem = q ? flat[cursor] : undefined;
  const kb = (id: string) => (cursorItem && (cursorItem.kind === 'report' ? cursorItem.def.slug : cursorItem.view.id) === id ? styles.riKb : '');
  const year = fiscalYearOf(new Date(), fiscalYears).start.getFullYear();

  return (
    <aside className={`${styles.card} ${styles.rail}`} aria-label="Aruanded" hidden={railCollapsed}>
      <button className={styles.rh} onClick={() => setRailCollapsed(true)} title="Peida aruannete loend · aruanne täislaiuses" aria-expanded="true">
        Aruanded <ChevronUp size={14} className={styles.rhIcon} />
      </button>
      <div className={styles.rsearch}>
        <Search size={13} />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
          onKeyDown={onKeyDown}
          placeholder="Otsi aruannet"
          autoComplete="off"
          aria-label="Otsi aruannet"
        />
        <kbd className={styles.kbd}>/</kbd>
      </div>
      <div className={styles.rs} ref={listRef}>
        {groups.map(({ group, items }) => (
          <div key={group}>
            <div className={styles.rg}>{group}</div>
            {items.map((def) => (
              <Link
                key={def.slug}
                href={reportHref(def.slug)}
                className={`${styles.ri} ${activeSlug === def.slug && !activeView ? styles.riOn : ''} ${kb(def.slug)}`}
                onClick={() => setQuery('')}
              >
                <span className={styles.riT}>{highlight(def.name, q)}</span>
              </Link>
            ))}
          </div>
        ))}
        {viewItems.length > 0 && (
          <div>
            <div className={styles.rg}>Salvestatud vaated</div>
            {viewItems.map((view) => (
              <Link
                key={view.id}
                href={viewHref(view)}
                className={`${styles.ri} ${styles.rv} ${activeView === view.id ? styles.riOn : ''} ${kb(view.id)}`}
                onClick={() => setQuery('')}
              >
                <span className={styles.riT}>{highlight(view.name, q)}</span>
                <span className={styles.rvD}>{reportBySlug(view.report)?.name} · {view.shared ? 'kõigile' : 'ainult mina'}</span>
              </Link>
            ))}
          </div>
        )}
        {!groups.length && !viewItems.length && <div className={styles.rnone}>Aruannet „{query.trim()}“ ei leitud</div>}
      </div>
      <div className={styles.rf}>{company ? `${company} · ` : ''}aruandeaasta {year}</div>
    </aside>
  );
}

/** The folded rail: a pill as tall as the report title, in front of it. Click opens the list again. */
export function RailPill() {
  const { railCollapsed, setRailCollapsed } = useReports();
  if (!railCollapsed) return null;
  return (
    <button className={styles.railPill} onClick={() => setRailCollapsed(false)} title="Näita aruannete loendit (/)" aria-expanded="false">
      Aruanded <ChevronDown size={13} />
    </button>
  );
}
