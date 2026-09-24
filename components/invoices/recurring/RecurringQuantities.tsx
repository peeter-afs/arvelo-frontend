'use client';

/**
 * Kogused — enter variable quantities for every template in one period and
 * confirm the invoices (docs2/design_handoff_korduvad_arved, "Kogused.html").
 */

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';
import { recurringInvoicesApi, type PendingRow, type QuantitiesData, type RecurringTemplate } from '@/lib/api/recurringInvoices.api';
import { showToast } from '@/components/ui/Toast';
import {
  eur,
  fixedTotals,
  fmtQty,
  frequencyLabel,
  initials,
  isoToEt,
  lineNet,
  lineVat,
  num,
  parseQty,
  r2,
  stripPlaceholders,
  todayIso,
} from './shared';
import s from './RecurringQuantities.module.css';

const MONTHS = ['Jaanuar', 'Veebruar', 'Märts', 'Aprill', 'Mai', 'Juuni', 'Juuli', 'August', 'September', 'Oktoober', 'November', 'Detsember'];

type Filter = 'all' | 'wait' | 'ready';
type RowState = 'wait' | 'ready' | 'skip' | 'done';
type Local = { q: Record<string, string>; skipped: boolean };

const shiftMonth = (p: string, by: number) => {
  const [y, m] = p.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};

export default function RecurringQuantities() {
  const params = useSearchParams();
  const highlight = params.get('mall');
  const [period, setPeriod] = useState(() => todayIso().slice(0, 7));
  const [data, setData] = useState<QuantitiesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [local, setLocal] = useState<Record<string, Local>>({});
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const dirty = useRef(new Set<string>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const mainRef = useRef<HTMLDivElement>(null);
  const scrolled = useRef(false);
  const today = todayIso();

  const load = useCallback(async (p: string) => {
    setLoading(true);
    try {
      const d = await recurringInvoicesApi.getQuantities(p);
      setData(d);
      const next: Record<string, Local> = {};
      for (const b of d.templates) {
        for (const r of b.rows) {
          const qs: Record<string, string> = {};
          for (const [k, v] of Object.entries(r.quantities || {})) qs[k] = fmtQty(v);
          next[r.id] = { q: qs, skipped: r.status === 'skipped' };
        }
      }
      setLocal(next);
      dirty.current.clear();
    } catch (e) {
      showToast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // First visit: open the month of the template's next open run (?mall=), or
  // the next month when the current one has nothing to enter.
  const initial = useRef(true);
  useEffect(() => {
    if (!initial.current) { load(period); return; }
    initial.current = false;
    (async () => {
      let p = period;
      if (highlight) {
        try {
          const t = await recurringInvoicesApi.get(highlight);
          const open = (t.open_pending || []).find((x) => x.status === 'awaiting_quantity' || x.status === 'ready');
          // Late runs are listed under the current month, so never go back in time.
          const target = (open?.run_date || t.next_invoice_date).slice(0, 7);
          if (target > p) p = target;
        } catch { /* fall back to the current month */ }
      } else {
        const now = await recurringInvoicesApi.getQuantities(p).catch(() => null);
        if (now && !now.templates.length) p = shiftMonth(p, 1);
      }
      if (p !== period) setPeriod(p);
      else load(p);
    })();
  }, [period, load]); // eslint-disable-line react-hooks/exhaustive-deps

  const varLines = (t: RecurringTemplate) => (t.lines || []).filter((l) => l.variable_quantity);

  const stateOf = useCallback((t: RecurringTemplate, r: PendingRow): RowState => {
    if (r.status === 'confirmed' || r.status === 'generated') return 'done';
    const lo = local[r.id];
    if (lo?.skipped) return 'skip';
    const filled = varLines(t).every((l) => parseQty(lo?.q[l.id] ?? '') != null);
    return filled ? 'ready' : 'wait';
  }, [local]);

  const grossOf = useCallback((t: RecurringTemplate, r: PendingRow) => {
    const fixed = fixedTotals(t.lines || []);
    const lo = local[r.id];
    const vary = varLines(t).reduce((acc, l) => {
      const qty = parseQty(lo?.q[l.id] ?? '') ?? 0;
      return acc + lineNet(l, qty) + lineVat(l, qty);
    }, 0);
    return r2(fixed.gross + vary);
  }, [local]);

  /* ── persistence ── */
  const saveRow = useCallback(async (id: string, patch?: { skipped?: boolean }) => {
    const t = timers.current.get(id);
    if (t) { clearTimeout(t); timers.current.delete(id); }
    const lo = local[id];
    if (!lo) return;
    const quantities: Record<string, number | null> = {};
    for (const [k, v] of Object.entries(lo.q)) quantities[k] = parseQty(v);
    dirty.current.delete(id);
    await recurringInvoicesApi.updatePending(id, patch ? { ...patch, quantities } : { quantities });
  }, [local]);

  // Debounced autosave of the latest local state.
  const localRef = useRef(local);
  localRef.current = local;
  const scheduleSave = (id: string) => {
    dirty.current.add(id);
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    timers.current.set(id, setTimeout(() => {
      timers.current.delete(id);
      const lo = localRef.current[id];
      if (!lo || !dirty.current.has(id)) return;
      const quantities: Record<string, number | null> = {};
      for (const [k, v] of Object.entries(lo.q)) quantities[k] = parseQty(v);
      dirty.current.delete(id);
      recurringInvoicesApi.updatePending(id, { quantities }).catch((e) => showToast.error(getErrorMessage(e)));
    }, 700));
  };

  const flush = async () => {
    const ids = [...dirty.current];
    for (const id of ids) await saveRow(id);
  };
  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  const setQty = (rowId: string, lineId: string, value: string) => {
    setLocal((m) => ({ ...m, [rowId]: { ...m[rowId], q: { ...m[rowId].q, [lineId]: value } } }));
    scheduleSave(rowId);
  };

  const toggleSkip = async (rowId: string) => {
    const skipped = !local[rowId]?.skipped;
    setLocal((m) => ({ ...m, [rowId]: { ...m[rowId], skipped } }));
    try {
      await recurringInvoicesApi.updatePending(rowId, { skipped });
      dirty.current.delete(rowId);
    } catch (e) {
      showToast.error(getErrorMessage(e));
    }
  };

  const copyPrevious = async (t: RecurringTemplate) => {
    try {
      await flush();
      const r = await recurringInvoicesApi.copyPreviousQuantities(t.id, period);
      await load(period);
      showToast.success(r.updated ? `${t.name}: eelmise perioodi kogused kopeeritud` : `${t.name}: eelmise perioodi koguseid pole`);
    } catch (e) {
      showToast.error(getErrorMessage(e));
    }
  };

  const confirmRows = async (rows: Array<{ t: RecurringTemplate; r: PendingRow }>, label?: string) => {
    const ready = rows.filter(({ t, r }) => stateOf(t, r) === 'ready');
    if (!ready.length) return;
    setBusy(true);
    try {
      await flush();
      const res = await recurringInvoicesApi.confirmPending(ready.map(({ r }) => r.id));
      const autoSend = ready.every(({ t }) => t.delivery === 'auto');
      const detail = res.generated ? (autoSend ? ' ja saadetud' : ' · arved loodud') : ' · arved luuakse arve kuupäeval';
      if (res.failed) showToast.error(`${res.confirmed} kinnitatud, ${res.failed} arve loomine ebaõnnestus`);
      else showToast.success(`${label ? `${label}: ` : ''}${res.confirmed} arvet kinnitatud${detail}`);
      await load(period);
    } catch (e) {
      showToast.error(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  /* ── view model ── */
  const blocks = useMemo(() => data?.templates || [], [data]);
  const needle = q.trim().toLowerCase();
  const visible = useMemo(() => blocks
    .map((b) => ({
      ...b,
      shown: b.rows.filter((r) => {
        const name = r.client?.partner?.name || '';
        const match = !needle || name.toLowerCase().includes(needle) || b.template.name.toLowerCase().includes(needle) || (r.client?.partner?.reg_code || '').includes(needle);
        if (!match) return false;
        const st = stateOf(b.template, r);
        return filter === 'all' || (filter === 'wait' ? st === 'wait' : st === 'ready');
      }),
    }))
    .filter((b) => b.shown.length), [blocks, needle, filter, stateOf]);

  const stats = useMemo(() => {
    let all = 0, wait = 0, ready = 0, conf = 0, tot = 0;
    for (const b of blocks) for (const r of b.rows) {
      const st = stateOf(b.template, r);
      if (st === 'done') { conf++; continue; }
      if (st === 'skip') continue;
      all++;
      if (st === 'ready') { ready++; tot += grossOf(b.template, r); } else wait++;
    }
    return { all, wait, ready, conf, tot: r2(tot) };
  }, [blocks, stateOf, grossOf]);

  // ?mall=<id>: scroll to that card and focus its first empty cell (once).
  useEffect(() => {
    if (loading || scrolled.current || !highlight) return;
    const card = mainRef.current?.querySelector<HTMLElement>(`[data-t="${highlight}"]`);
    if (!card) return;
    scrolled.current = true;
    card.scrollIntoView({ block: 'start' });
    const empty = card.querySelector<HTMLInputElement>('input[data-empty="1"]:not(:disabled)');
    empty?.focus({ preventScroll: true });
  }, [loading, highlight, visible]);

  const onQtyKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const el = e.currentTarget;
    const card = el.closest('[data-t]');
    const col = el.dataset.col;
    const inCol = [...(card?.querySelectorAll<HTMLInputElement>(`input[data-col="${col}"]:not(:disabled)`) || [])];
    let next: HTMLInputElement | null | undefined = inCol[inCol.indexOf(el) + (e.shiftKey ? -1 : 1)];
    if (!next && !e.shiftKey) {
      const cards = [...(mainRef.current?.querySelectorAll('[data-t]') || [])];
      next = cards[cards.indexOf(card as Element) + 1]?.querySelector<HTMLInputElement>('input[data-col]:not(:disabled)');
    }
    if (next) { next.focus(); next.select(); }
  };

  const [py, pm] = period.split('-').map(Number);
  const allRowsFlat = blocks.flatMap((b) => b.rows.map((r) => ({ t: b.template, r })));

  return (
    <div className={s.shell}>
      <div className={s.top}>
        <div className={s.tr}>
          <div className={s.crumb}>
            <Link href="/invoices/sales">Müük</Link><span className={s.sep}>/</span>
            <Link href="/invoices/recurring">Korduvad arved</Link><span className={s.sep}>/</span>
          </div>
          <h1>Kogused</h1>
          <div className={s.per}>
            <button className={s.iconbtn} title="Eelmine kuu" onClick={async () => { await flush(); setPeriod((p) => shiftMonth(p, -1)); }}>‹</button>
            <span className={s.perLbl}>{MONTHS[pm - 1]} {py}</span>
            <button className={s.iconbtn} title="Järgmine kuu" onClick={async () => { await flush(); setPeriod((p) => shiftMonth(p, 1)); }}>›</button>
          </div>
        </div>
        <div className={s.tr}>
          <input className={s.search} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Otsi klienti või malli" />
          <div className={s.seg}>
            {([['all', 'Kõik', stats.all], ['wait', 'Ootab', stats.wait], ['ready', 'Valmis', stats.ready]] as Array<[Filter, string, number]>).map(([k, l, n]) => (
              <button key={k} className={filter === k ? s.on : ''} onClick={() => setFilter(k)}>{l} <span className={s.n}>{n}</span></button>
            ))}
          </div>
          <div className={s.sum}>
            <span><b>{blocks.length}</b> malli</span>
            <span><b>{stats.all + stats.conf}</b> arvet</span>
            {stats.conf > 0 && <span><b>{stats.conf}</b> kinnitatud</span>}
          </div>
        </div>
      </div>

      <div className={s.main} ref={mainRef}>
        {loading && <div className={s.loading}><Loader2 className="h-5 w-5 animate-spin" /></div>}
        {!loading && !visible.length && <div className={s.emptyS}>Sellel perioodil pole koguseid sisestada</div>}
        {!loading && visible.map(({ template: t, rows, shown }) => {
          const vls = varLines(t);
          const open = rows.filter((r) => { const st = stateOf(t, r); return st === 'wait' || st === 'ready'; });
          const readyRows = open.filter((r) => stateOf(t, r) === 'ready');
          const fixedNet = fixedTotals(t.lines || []).net;
          const first = rows[0];
          const late = rows.some((r) => r.run_date < today && (stateOf(t, r) === 'wait' || stateOf(t, r) === 'ready'));
          return (
            <section key={t.id} data-t={t.id} className={`${s.grp} ${highlight === t.id ? s.hl : ''}`}>
              <div className={s.gh}>
                <div className={s.gnm}>
                  <Link href={`/invoices/recurring/${t.id}`}>{t.name}</Link>
                  <span className={s.meta}>
                    {frequencyLabel(t)} · arve {isoToEt(first.run_date)} · periood {isoToEt(first.period_start).slice(0, 5)}–{isoToEt(first.period_end)} · {t.delivery === 'auto' ? 'saadetakse automaatselt' : 'ülevaatusele'}
                  </span>
                </div>
                {late && <span className={s.late}>Hilinenud</span>}
                <div className={s.gacts}>
                  <span className={s.prog}><b>{readyRows.length}</b> / {open.length} valmis</span>
                  <button className={`${s.btn} ${s.sm} ${s.ghost}`} onClick={() => copyPrevious(t)}>Kopeeri eelmise perioodi kogused</button>
                  <button className={`${s.btn} ${s.sm}`} disabled={!readyRows.length || busy} onClick={() => confirmRows(readyRows.map((r) => ({ t, r })), t.name)}>Kinnita ({readyRows.length})</button>
                </div>
              </div>
              <div className={s.tw}>
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th style={{ width: '26%' }}><div className={s.thK}>Klient</div></th>
                      {vls.map((l) => (
                        <th key={l.id}>
                          <div className={s.thK}>Kogus</div>
                          <div className={s.thD}>{stripPlaceholders(l.description) || l.code || '—'}</div>
                          <div className={s.thP}>{num(l.unit_price)} € / {l.unit || 'tk'}</div>
                        </th>
                      ))}
                      <th className={s.r}><div className={s.thK}>Püsiread</div></th>
                      <th className={s.r}><div className={s.thK}>Arve kokku</div><div className={s.thP}>km-ga</div></th>
                      <th><div className={s.thK}>Olek</div></th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((r) => {
                      const st = stateOf(t, r);
                      const lo = local[r.id];
                      const name = r.client?.partner?.name || '—';
                      const locked = st === 'skip' || st === 'done';
                      return (
                        <tr key={r.id} className={st === 'skip' ? s.skip : ''}>
                          <td>
                            <div className={s.cn}>
                              <span className={s.av}>{initials(name)}</span>
                              <div><b>{name}</b><span className={`${s.rg} ${s.mono}`}>{r.client?.partner?.reg_code || ''}{r.run_date !== first.run_date ? ` · arve ${isoToEt(r.run_date)}` : ''}</span></div>
                            </div>
                          </td>
                          {vls.map((l) => {
                            const v = lo?.q[l.id] ?? '';
                            const prev = r.previous_quantities?.[l.id];
                            return (
                              <td key={l.id}>
                                <div className={s.qc}>
                                  <input
                                    className={`${s.qi} ${v.trim() ? '' : s.qiEmpty}`}
                                    data-col={l.id}
                                    data-empty={v.trim() ? '0' : '1'}
                                    inputMode="decimal"
                                    value={v}
                                    placeholder="0"
                                    disabled={locked}
                                    onChange={(e) => setQty(r.id, l.id, e.target.value.replace(/[^\d.,\s]/g, ''))}
                                    onKeyDown={onQtyKey}
                                  />
                                  <span className={s.u}>{l.unit || ''}</span>
                                  {prev != null && <span className={`${s.pv} ${s.mono}`}>eelm. {fmtQty(prev)}</span>}
                                </div>
                              </td>
                            );
                          })}
                          <td className={`${s.r} ${s.mono}`} style={{ color: 'var(--a-text-2)' }}>{num(fixedNet)}</td>
                          <td className={`${s.r} ${s.mono}`} style={{ fontWeight: 600 }}>{st === 'skip' ? '—' : num(grossOf(t, r))}</td>
                          <td>
                            {st === 'done' ? <span className={`${s.st} ${s.stDone}`}>Kinnitatud</span>
                              : st === 'skip' ? <span className={`${s.st} ${s.stS}`}>Vahele</span>
                                : st === 'ready' ? <span className={`${s.st} ${s.stOk}`}>Valmis</span>
                                  : <span className={`${s.st} ${s.stW}`}>Ootab</span>}
                          </td>
                          <td className={s.r}>
                            {st !== 'done' && <button className={s.lk} onClick={() => toggleSkip(r.id)}>{st === 'skip' ? 'Taasta' : 'Jäta vahele'}</button>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>

      <div className={s.foot}>
        <div className={s.fs}><b>{stats.ready}</b> / {stats.all} valmis{stats.wait ? <> · <b>{stats.wait}</b> ootab kogust</> : null}</div>
        <div className={`${s.ftot} ${s.mono}`}><small>Kinnitatav summa</small>{eur(stats.tot)}</div>
        <div className={s.fhint}><span><kbd className={s.kbd}>Enter</kbd> järgmine klient</span><span><kbd className={s.kbd}>Tab</kbd> järgmine väli</span></div>
        <div className={s.fr}>
          <button className={s.btn} onClick={async () => { try { await flush(); showToast.success('Kogused salvestatud · arved jäävad mustandiks'); } catch (e) { showToast.error(getErrorMessage(e)); } }}>Salvesta mustandina</button>
          <button className={`${s.btn} ${s.primary}`} disabled={!stats.ready || busy} onClick={() => confirmRows(allRowsFlat)}>
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {stats.ready && stats.ready === stats.all ? `Kinnita kõik ${stats.ready} arvet` : `Kinnita valmis arved (${stats.ready})`}
          </button>
        </div>
      </div>
    </div>
  );
}
