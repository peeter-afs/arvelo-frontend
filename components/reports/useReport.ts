'use client';

/**
 * Filter state of one report. The URL is the source of truth (back button,
 * shareable links, "Ava pearaamatus" deep links); only values that differ from
 * the report defaults are written. `?view=<id>` marks an opened saved view.
 */

import { useCallback, useEffect, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { reportBySlug, LAST_REPORT_KEY, type ReportDef, type ReportSlug } from '@/lib/reports/registry';
import {
  RANGE_PRESETS, asOfDate, compareAsOf, compareRange, rangeDates, shortRange,
  type ReportFilters,
} from '@/lib/reports/periods';
import { dmy, rangeText } from '@/lib/reports/format';
import { useReports } from './ReportsProvider';

const RESERVED = new Set(['view']);

/** Links from before the report shell (bureau dashboard, partner cards, old bookmarks). */
function fromLegacy(f: ReportFilters): ReportFilters {
  const out = { ...f };
  const take = (k: string) => { const v = out[k]; delete out[k]; return v; };
  const start = take('start_date') || take('date_from');
  const end = take('end_date') || take('date_to');
  const asOf = take('as_of_date');
  if (!out.per && start && end) Object.assign(out, { per: 'custom', from: start, to: end });
  else if (!out.per && end) Object.assign(out, { per: 'custom', at: end, to: end });
  if (!out.per && asOf) Object.assign(out, { per: 'custom', at: asOf });
  const mode = take('mode');
  if (mode === 'confirmation' && !out.doc) out.doc = 'confirmation';
  return out;
}

export function cleanFilters(def: ReportDef, f: ReportFilters): ReportFilters {
  const out: ReportFilters = {};
  for (const [k, v] of Object.entries({ ...def.defaults, ...f })) if (v !== '' && v != null) out[k] = String(v);
  return out;
}

export const sameFilters = (a: ReportFilters, b: ReportFilters) => {
  const ka = Object.keys(a).sort(), kb = Object.keys(b).sort();
  return ka.length === kb.length && ka.every((k, i) => k === kb[i] && a[k] === b[k]);
};

export type ReportPeriod = {
  /** asof reports */
  asOf?: string;
  /** range reports */
  from?: string;
  to?: string;
  /** "Täna" / "Aasta algusest" / dates — the bold part of the period button. */
  buttonLabel: string;
  /** "seisuga 07.10.2026" or "01.01.2026 – 07.10.2026". */
  text: string;
  compareAsOf?: string | null;
  compareRange?: [string, string] | null;
  /** Compare column head and button label ("31.12.2025", "01.01.–07.10.2025"). */
  compareLabel?: string | null;
};

export function useReport(slug: ReportSlug) {
  const def = reportBySlug(slug)!;
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { fiscalYears, yearsReady, views } = useReports();

  const viewId = params.get('view');
  const filters = useMemo(() => {
    const f: ReportFilters = {};
    params.forEach((v, k) => { if (!RESERVED.has(k)) f[k] = v; });
    return cleanFilters(def, fromLegacy(f));
  }, [params, def]);

  useEffect(() => { try { localStorage.setItem(LAST_REPORT_KEY, slug); } catch { /* ignore */ } }, [slug]);

  const write = useCallback((next: ReportFilters, nextView: string | null) => {
    const q = new URLSearchParams();
    if (nextView) q.set('view', nextView);
    for (const [k, v] of Object.entries(cleanFilters(def, next))) if (def.defaults[k] !== v) q.set(k, v);
    const s = q.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  }, [def, pathname, router]);

  const set = useCallback((patch: Record<string, string | null | undefined>) => {
    const next = { ...filters };
    for (const [k, v] of Object.entries(patch)) { if (v == null || v === '') delete next[k]; else next[k] = v; }
    write(next, viewId);
  }, [filters, viewId, write]);

  const view = viewId ? views.find((v) => v.id === viewId) ?? null : null;
  const dirty = !!view && !sameFilters(cleanFilters(def, view.filters), filters);
  const resetToView = useCallback(() => { if (view) write(view.filters, view.id); }, [view, write]);
  const openView = useCallback((id: string | null, f: ReportFilters) => write(f, id), [write]);

  const period = useMemo<ReportPeriod>(() => {
    if (def.mode === 'asof') {
      const asOf = asOfDate(filters.per, filters.at, fiscalYears);
      const cmpAsOf = def.compare === 'bs' ? compareAsOf(filters.cmp || 'none', asOf, filters.cat, fiscalYears) : null;
      return {
        asOf,
        buttonLabel: filters.per === 'today' ? 'Täna' : dmy(asOf),
        text: `seisuga ${dmy(asOf)}`,
        compareAsOf: cmpAsOf,
        compareLabel: cmpAsOf ? dmy(cmpAsOf) : null,
      };
    }
    if (def.mode === 'range') {
      const [from, to] = rangeDates(filters.per, filters.from, filters.to, fiscalYears);
      const cmp = def.compare === 'pl' ? compareRange(filters.cmp || 'none', from, to, filters.cfrom, filters.cto) : null;
      const preset = RANGE_PRESETS.find(([k]) => k === filters.per);
      return {
        from, to,
        buttonLabel: filters.per === 'ytd' && preset ? preset[1] : shortRange(from, to),
        text: rangeText(from, to),
        compareRange: cmp,
        compareLabel: cmp ? shortRange(cmp[0], cmp[1]) : null,
      };
    }
    return { buttonLabel: '', text: '' };
  }, [def, filters, fiscalYears]);

  return { def, filters, set, period, ready: yearsReady, view, viewId, dirty, resetToView, openView };
}

export type UseReport = ReturnType<typeof useReport>;
