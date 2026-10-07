'use client';

/**
 * Shared pieces of the Maksed / Maksepaketid workspaces (docs2/design_handoff_maksed):
 * formatting, tags, the module tabs, the resizable panel and column auto-hide.
 * Estonian copy is final and hardcoded, like the other dense list workspaces.
 */

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { bankingApi, type PaymentBatchListItem } from '@/lib/api/banking.api';
import { paymentsApi } from '@/lib/api/payments.api';
import styles from './Payments.module.css';

export const DAY = 86_400_000;

export function money(value: number | string | null | undefined) {
  return `${Number(value || 0).toLocaleString('et-EE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}
export function amount(value: number | string | null | undefined) {
  return Number(value || 0).toLocaleString('et-EE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function dateText(value?: string | Date | null) {
  if (!value) return '—';
  const d = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  return Number.isNaN(+d) ? '—' : new Intl.DateTimeFormat('et-EE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
}
export function timeText(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(+d) ? '' : new Intl.DateTimeFormat('et-EE', { hour: '2-digit', minute: '2-digit' }).format(d);
}
export function startOfDay(d: Date) { const v = new Date(d); v.setHours(0, 0, 0, 0); return v; }
export function daysBetween(a: Date | string, b: Date | string) { return Math.round((startOfDay(new Date(a)).getTime() - startOfDay(new Date(b)).getTime()) / DAY); }
export function isoDate(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
export const ibanFull = (s?: string | null) => (s ? s.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim() : '');
export const ibanShort = (s?: string | null) => { const v = (s || '').replace(/\s+/g, ''); return v ? `${v.slice(0, 4)} … ${v.slice(-4)}` : ''; };
export const parseAmount = (s: string) => Number(String(s).trim().replace(/\s/g, '').replace(',', '.')) || 0;
/** User display name from an e-mail when the member list has no name. */
export const personName = (email?: string | null, names?: Map<string, string>) => (email ? names?.get(email) || email.split('@')[0] : '—');

export function downloadText(name: string, content: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}
/** Semicolon CSV with a BOM, so Excel opens Estonian decimals and letters correctly. */
export function csv(rows: Array<Array<string | number | null | undefined>>) {
  const cell = (v: string | number | null | undefined) => { const s = typeof v === 'number' ? amount(v).replace(/\s/g, '') : String(v ?? ''); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return `﻿${rows.map((r) => r.map(cell).join(';')).join('\r\n')}`;
}

const PALETTE: Array<[string, string]> = [['#ffe7df', '#b8330f'], ['#e2efe9', '#0e7b5a'], ['#eaf0ff', '#2c5cf6'], ['#f5ecd6', '#7d5a13'], ['#efe9fb', '#6b3fc4'], ['#f0ede5', '#4a4946']];
export function Avatar({ name }: { name: string }) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 997;
  const [bg, fg] = PALETTE[h % PALETTE.length];
  const ini = name.replace(/\b(AS|OÜ|Ltd|Eesti|MTÜ|FIE)\b/g, '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
  return <span className={styles.av} style={{ background: bg, color: fg }}>{ini}</span>;
}

export type TagKind = 'draft' | 'pend' | 'info' | 'ok' | 'bad' | 'void';
const TAG_CLASS: Record<TagKind, string> = { draft: styles.tagDraft, pend: styles.tagPend, info: styles.tagInfo, ok: styles.tagOk, bad: styles.tagBad, void: styles.tagVoid };
export function Tag({ kind, children }: { kind: TagKind; children: string }) {
  return <span className={`${styles.tag} ${TAG_CLASS[kind]}`}>{children}</span>;
}

/* ── payment batch status (backend status + bank_status → what the user sees) ── */
export type BatchStKey = 'draft' | 'generated' | 'uploaded' | 'sent' | 'confirmed' | 'rejected' | 'voided';
export const BATCH_ST: Record<BatchStKey, [string, TagKind]> = {
  draft: ['Mustand', 'draft'], generated: ['Fail loodud', 'info'], uploaded: ['Panka üles laaditud', 'pend'], sent: ['Saadetud panka', 'pend'],
  confirmed: ['Täidetud', 'ok'], rejected: ['Pank keeldus', 'bad'], voided: ['Tühistatud', 'void'],
};
export function batchSt(b: PaymentBatchListItem): BatchStKey {
  if (b.status === 'voided') return 'voided';
  if (b.status === 'confirmed') return 'confirmed';
  if (b.status === 'failed' || b.bank_status === 'rejected') return 'rejected';
  if (b.status === 'uploaded' || b.status === 'submitted' || b.status === 'pending') return b.submitted_at ? 'sent' : 'uploaded';
  if (b.status === 'generated') return 'generated';
  return 'draft';
}
export const batchOrigin = (b: PaymentBatchListItem) => b.origin || ((b.invoice_count || 0) > 0 ? 'purchase_invoices' : 'manual');

/* ── module tabs (Maksed | Maksepaketid) with their badges ── */
export function useModuleCounts(own: 'pay' | 'batch', ownCount: number | null) {
  const [other, setOther] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    const load = own === 'pay'
      ? bankingApi.listPaymentBatches({ limit: 100 }).then((r) => r.items.filter((b) => b.status === 'draft' || batchSt(b) === 'rejected').length)
      : paymentsApi.listPayments({ status: 'draft', limit: 200 }).then((rows) => rows.length);
    load.then((n) => { if (live) setOther(n); }).catch(() => {});
    return () => { live = false; };
  }, [own]);
  return own === 'pay' ? { pay: ownCount, batch: other } : { pay: other, batch: ownCount };
}
export function ModuleTabs({ active, counts }: { active: 'pay' | 'batch'; counts: { pay: number | null; batch: number | null } }) {
  return (
    <div className={styles.modtabs}>
      <Link href="/accounting/payments" className={`${styles.modtab} ${active === 'pay' ? styles.modtabOn : ''}`}>Maksed{counts.pay ? <span className={styles.pill}>{counts.pay}</span> : null}</Link>
      <Link href="/accounting/payment-batches" className={`${styles.modtab} ${active === 'batch' ? styles.modtabOn : ''}`}>Maksepaketid{counts.batch ? <span className={styles.pill}>{counts.batch}</span> : null}</Link>
    </div>
  );
}

export function Metric({ label, value, tone }: { label: string; value: string; tone?: 'pos' | 'warn' }) {
  return <div className={`${styles.metric} ${tone === 'pos' ? styles.metricPos : tone === 'warn' ? styles.metricWarn : ''}`}><span className={styles.metricKey}>{label}</span><span className={`${styles.metricValue} ${styles.mono}`}>{value}</span></div>;
}

/* ── resizable detail panel (default 440, min 360, list ≥ 520) ── */
const MIN_PANEL = 360, MIN_LIST = 520, DEFAULT_PANEL = 440;
const defaultPanel = () => (document.documentElement.classList.contains('compact') ? Math.round(Math.min(520, Math.max(MIN_PANEL, window.innerWidth * 0.3))) : DEFAULT_PANEL);
export function usePanel(storageKey: string) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(DEFAULT_PANEL);
  const [bodyWidth, setBodyWidth] = useState(0);
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    const el = bodyRef.current; if (!el || typeof ResizeObserver === 'undefined') return;
    let first = true;
    const ro = new ResizeObserver(() => {
      setBodyWidth(el.clientWidth);
      // The stored width is read on the first measurement (client only, after hydration).
      if (first) { first = false; let stored = 0; try { stored = Number(localStorage.getItem(storageKey)); } catch { /* storage blocked */ } setWidth(stored || defaultPanel()); }
    });
    ro.observe(el); return () => ro.disconnect();
  }, [storageKey]);
  const onPointerDown = useCallback((e: ReactPointerEvent) => {
    e.preventDefault();
    const start = e.clientX, current = width, total = bodyRef.current?.clientWidth || 1180;
    setDragging(true);
    const move = (ev: PointerEvent) => setWidth(Math.max(MIN_PANEL, Math.min(total - 9 - MIN_LIST, current + start - ev.clientX)));
    const up = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); setDragging(false);
      setWidth((v) => { try { localStorage.setItem(storageKey, String(v)); } catch { /* ignore */ } return v; });
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  }, [width, storageKey]);
  const reset = useCallback(() => { setWidth(defaultPanel()); try { localStorage.removeItem(storageKey); } catch { /* ignore */ } }, [storageKey]);
  const px = bodyWidth ? Math.max(MIN_PANEL, Math.min(width, bodyWidth - 9 - MIN_LIST)) : width;
  return { bodyRef, px, dragging, onPointerDown, reset };
}
export function Gutter({ panel }: { panel: ReturnType<typeof usePanel> }) {
  return <div className={`${styles.gutter} ${panel.dragging ? styles.gutterOn : ''}`} title="Lohista paneeli laiust · topeltklikk lähtestab" onPointerDown={panel.onPointerDown} onDoubleClick={panel.reset} />;
}

/* ── column auto-hide: measure the scroll container, not the rows (they grow to content width) ── */
export type Col<K extends string> = { id: K; label: string; track: string; right?: boolean };
export function useColumns<K extends string>(cols: Array<Col<K>>, hideOrder: K[]) {
  const [scrollEl, setScrollEl] = useState<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!scrollEl || typeof ResizeObserver === 'undefined') return;
    let last = -1;
    const ro = new ResizeObserver(() => { if (scrollEl.clientWidth !== last) { last = scrollEl.clientWidth; setWidth(last); } });
    ro.observe(scrollEl); return () => ro.disconnect();
  }, [scrollEl]);
  const shown = useMemo(() => {
    if (!width) return cols;
    const min = (c: Col<K>) => Number(c.track.match(/\d+/)?.[0] || 0);
    let v = cols.slice();
    for (const id of hideOrder) { if (v.reduce((n, c) => n + min(c), 0) + 16 <= width) break; v = v.filter((c) => c.id !== id); }
    return v;
  }, [cols, hideOrder, width]);
  return { setScrollEl, shown, template: shown.map((c) => c.track).join(' ') };
}

/* ── period picker (payment date) ── */
export type PeriodKey = 'month' | 'prev' | 'quarter' | '90' | 'year' | 'all' | 'custom';
export const PERIODS: Array<[PeriodKey, string]> = [['month', 'Käesolev kuu'], ['prev', 'Eelmine kuu'], ['quarter', 'Käesolev kvartal'], ['90', 'Viimased 90 päeva'], ['year', 'Käesolev aasta'], ['all', 'Kõik ajad']];
export function periodRange(period: PeriodKey, from: string, to: string): [Date | null, Date | null] {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth();
  if (period === 'custom') return [from ? new Date(`${from}T00:00:00`) : null, to ? new Date(`${to}T23:59:59`) : null];
  if (period === 'month') return [new Date(y, m, 1), new Date(y, m + 1, 0, 23, 59, 59)];
  if (period === 'prev') return [new Date(y, m - 1, 1), new Date(y, m, 0, 23, 59, 59)];
  if (period === 'quarter') { const q = Math.floor(m / 3) * 3; return [new Date(y, q, 1), new Date(y, q + 3, 0, 23, 59, 59)]; }
  if (period === 'year') return [new Date(y, 0, 1), new Date(y, 11, 31, 23, 59, 59)];
  if (period === '90') return [new Date(startOfDay(now).getTime() - 90 * DAY), null];
  return [null, null];
}
export function PeriodPicker({ value, from, to, open, onOpen, onChange }: {
  value: PeriodKey; from: string; to: string; open: boolean; onOpen: (open: boolean) => void;
  onChange: (value: PeriodKey, from?: string, to?: string) => void;
}) {
  const label = value === 'custom' ? `${from ? dateText(from) : '…'} – ${to ? dateText(to) : '…'}` : PERIODS.find(([k]) => k === value)?.[1];
  return (
    <div className={styles.relative} data-menu-root>
      <button className={`${styles.perbtn} ${value !== '90' ? styles.perbtnOn : ''}`} onClick={() => onOpen(!open)}><CalendarDays size={13} />{label}<ChevronDown size={11} /></button>
      {open && (
        <div className={`${styles.menu} ${styles.menuDown}`} style={{ width: 250 }}>
          {PERIODS.map(([k, l]) => <button key={k} className={`${styles.mitem} ${k === value ? styles.mitemOn : ''}`} onClick={() => { onChange(k); onOpen(false); }}>{l}</button>)}
          <div className={styles.msep} />
          <div className={styles.customRange}>
            <input type="date" className={styles.inp} value={from} onChange={(e) => onChange('custom', e.target.value, to)} aria-label="Alates" />
            <input type="date" className={styles.inp} value={to} onChange={(e) => onChange('custom', from, e.target.value)} aria-label="Kuni" />
          </div>
        </div>
      )}
    </div>
  );
}

/** Closes popover menus on a click outside any element marked data-menu-root. */
export function useOutsideClose(close: () => void) {
  useEffect(() => {
    const onDown = (e: PointerEvent) => { if (!(e.target as Element).closest('[data-menu-root]')) close(); };
    window.addEventListener('pointerdown', onDown); return () => window.removeEventListener('pointerdown', onDown);
  }, [close]);
}

/** Member e-mail → display name, for "Koostas" / timeline lines. */
export function useMemberNames() {
  const [names, setNames] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    let live = true;
    Promise.all([import('@/lib/stores/auth.store'), import('@/lib/api/tenants.api')]).then(([{ useAuthStore }, { tenantsApi }]) => {
      const id = useAuthStore.getState().tenant?.id; if (!id) return;
      tenantsApi.getMembers(id).then((rows) => { if (live) setNames(new Map(rows.filter((m) => m.user.name).map((m) => [m.user.email, m.user.name as string]))); }).catch(() => {});
    });
    return () => { live = false; };
  }, []);
  return names;
}

/** True when the keyboard event comes from a form field (shortcuts are off there). */
export const inField = (e: KeyboardEvent) => (e.target as Element | null)?.matches?.('input,select,textarea,[contenteditable="true"]') ?? false;
