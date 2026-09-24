'use client';

/**
 * Korduvad arved — template list + summary panel
 * (docs2/design_handoff_korduvad_arved, "Korduvad arved.html").
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';
import { recurringInvoicesApi, type RecurringTemplate, type TemplateRun } from '@/lib/api/recurringInvoices.api';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { showToast } from '@/components/ui/Toast';
import {
  STATE_LABEL,
  activeClients,
  deliveryLabel,
  eur,
  fixedTotals,
  frequencyLabel,
  hasVariable,
  initials,
  isoToEt,
  lastRunErrors,
  num,
  periodFor,
  shortRange,
  templateState,
  todayIso,
  upcomingRuns,
  vatLabel,
  type TemplateState,
} from './shared';
import s from './RecurringWorkspace.module.css';

type FilterKey = 'all' | 'active' | 'wait' | 'err' | 'paused';
type SortKey = 'name' | 'clients' | 'freq' | 'next' | 'sum' | 'run' | 'deliv' | 'st';

const ET_MONTHS_IN = ['Jaanuaris', 'Veebruaris', 'Märtsis', 'Aprillis', 'Mais', 'Juunis', 'Juulis', 'Augustis', 'Septembris', 'Oktoobris', 'Novembris', 'Detsembris'];

type Row = {
  t: RecurringTemplate;
  state: TemplateState;
  errors: number;
  net: number;
  runSum: number;
  active: number;
  total: number;
  variable: boolean;
};

const FILTERS: Array<[FilterKey, string, (r: Row) => boolean]> = [
  ['all', 'Kõik', () => true],
  ['active', 'Aktiivsed', (r) => r.state !== 'paused'],
  ['wait', 'Ootab kogust', (r) => r.state === 'wait' || r.state === 'late'],
  ['err', 'Vigadega', (r) => r.errors > 0 || r.state === 'late'],
  ['paused', 'Peatatud', (r) => r.state === 'paused'],
];

const COLS: Array<[SortKey | '', string, boolean?]> = [
  ['name', 'Mall'],
  ['clients', 'Kliendid'],
  ['freq', 'Sagedus'],
  ['next', 'Järgmine arve'],
  ['sum', 'Arve kohta', true],
  ['run', 'Jooksu summa', true],
  ['deliv', 'Edastamine'],
  ['st', 'Olek'],
  ['', ''],
];

function toRow(t: RecurringTemplate, today: string): Row {
  const lines = t.lines || [];
  const { net, gross } = fixedTotals(lines);
  const active = activeClients(t).length;
  return {
    t,
    state: templateState(t, today),
    errors: lastRunErrors(t),
    net,
    runSum: gross * active,
    active,
    total: (t.clients || []).length,
    variable: hasVariable(t),
  };
}

export default function RecurringWorkspace() {
  const router = useRouter();
  const [templates, setTemplates] = useState<RecurringTemplate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sort, setSort] = useState<SortKey>('next');
  const [dir, setDir] = useState(1);
  const [q, setQ] = useState('');
  const [chosenId, setChosenId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<RecurringTemplate | null>(null);
  const [sendHour, setSendHour] = useState<number | null>(null);
  const [hourMenu, setHourMenu] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const today = todayIso();

  const load = useCallback(async () => {
    try {
      setTemplates(await recurringInvoicesApi.list());
      setError(null);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }, []);

  useEffect(() => {
    recurringInvoicesApi.list().then(setTemplates).catch((e) => setError(getErrorMessage(e)));
    recurringInvoicesApi.getSettings().then((r) => setSendHour(r.send_hour)).catch(() => undefined);
  }, []);

  const all = useMemo(() => (templates || []).map((t) => toRow(t, today)), [templates, today]);

  const rows = useMemo(() => {
    const f = FILTERS.find((x) => x[0] === filter)![2];
    const needle = q.trim().toLowerCase();
    const list = all.filter(f).filter((r) =>
      !needle ||
      r.t.name.toLowerCase().includes(needle) ||
      (r.t.description || '').toLowerCase().includes(needle) ||
      (r.t.lines || []).some((l) => (l.code || '').toLowerCase().includes(needle)) ||
      (r.t.clients || []).some((c) => (c.partner?.name || '').toLowerCase().includes(needle) || (c.partner?.reg_code || '').includes(needle)),
    );
    const val = (r: Row): string | number => {
      switch (sort) {
        case 'name': return r.t.name.toLowerCase();
        case 'clients': return r.active;
        case 'freq': return frequencyLabel(r.t);
        case 'next': return r.state === 'paused' ? '9999' : r.t.next_invoice_date;
        case 'sum': return r.net;
        case 'run': return r.runSum;
        case 'deliv': return deliveryLabel(r.t);
        case 'st': return r.state;
      }
    };
    return [...list].sort((a, b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * dir);
  }, [all, filter, q, sort, dir]);

  // A filter that hides the chosen row falls back to the first visible one.
  const selId = rows.some((r) => r.t.id === chosenId) ? chosenId : rows[0]?.t.id ?? null;
  const selected = all.find((r) => r.t.id === selId) || null;

  const togglePause = useCallback(async (t: RecurringTemplate) => {
    try {
      const updated = await recurringInvoicesApi.update(t.id, { is_active: !t.is_active });
      setTemplates((list) => (list || []).map((x) => (x.id === t.id ? { ...x, ...updated } : x)));
      showToast.success(`${t.name} ${t.is_active ? 'peatatud' : 'aktiveeritud'}`);
    } catch (e) {
      showToast.error(getErrorMessage(e));
    }
  }, []);

  const copy = useCallback(async (t: RecurringTemplate) => {
    try {
      const created = await recurringInvoicesApi.copy(t.id, false);
      await load();
      setChosenId(created.id);
      showToast.success('Mall kopeeritud · lisa kliendid');
    } catch (e) {
      showToast.error(getErrorMessage(e));
    }
  }, [load]);

  const remove = async () => {
    const t = confirmDelete;
    if (!t) return;
    try {
      await recurringInvoicesApi.delete(t.id);
      setTemplates((list) => (list || []).filter((x) => x.id !== t.id));
      showToast.success('Mall kustutatud');
    } catch (e) {
      showToast.error(getErrorMessage(e));
    }
  };

  const saveHour = async (h: number) => {
    try {
      const r = await recurringInvoicesApi.updateSettings({ send_hour: h });
      setSendHour(r.send_hour);
      setHourMenu(false);
      showToast.success(`Arved saadetakse kell ${h}:00`);
    } catch (e) {
      showToast.error(getErrorMessage(e));
    }
  };

  const open = useCallback((id: string) => router.push(`/invoices/recurring/${id}`), [router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
        if (e.key === 'Escape') el.blur();
        return;
      }
      if (confirmDelete) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); return; }
      const i = rows.findIndex((r) => r.t.id === selId);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const n = rows[Math.max(0, Math.min(rows.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))];
        if (n) setChosenId(n.t.id);
      } else if ((e.key === 'Enter' || e.key.toLowerCase() === 'm') && selId) {
        open(selId);
      } else if (e.key.toLowerCase() === 'p' && selected) {
        togglePause(selected.t);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rows, selId, selected, open, togglePause, confirmDelete]);

  if (!templates && !error) {
    return <div className={s.loading}><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  const activeRows = all.filter((r) => r.state !== 'paused');
  const waitCount = activeRows.filter((r) => r.variable).reduce((n, r) => n + r.active, 0);
  const nextDates = activeRows.map((r) => r.t.next_invoice_date).filter((d) => d >= today.slice(0, 8) + '01').sort();
  const focusMonth = (nextDates[0] || today).slice(0, 7);
  let monthCount = 0;
  let monthFixed = 0;
  for (const r of activeRows) {
    const n = upcomingRuns(r.t, 13).filter((d) => d.startsWith(focusMonth)).length;
    monthCount += n * r.active;
    monthFixed += n * r.runSum;
  }

  return (
    <div className={s.wrap}>
      <div className={s.top}>
        <div className={s.tr}>
          <div className={s.crumb}><Link href="/invoices/sales">Müük</Link><span className={s.sep}>/</span></div>
          <h1>Korduvad arved</h1>
          <div className={s.acts}>
            <Link className={s.btn} href="/invoices/recurring/quantities">
              Sisesta kogused {waitCount > 0 && <span className={s.badge}>{waitCount}</span>}
            </Link>
            <Link className={`${s.btn} ${s.primary}`} href="/invoices/recurring/new">+ Uus mall</Link>
          </div>
        </div>
        <div className={s.tr}>
          <input ref={searchRef} className={s.search} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Otsi malli, klienti või koodi" />
          <div className={s.seg}>
            {FILTERS.map(([k, label, f]) => (
              <button key={k} className={k === filter ? s.on : ''} onClick={() => setFilter(k)}>
                {label} <span className={s.segN}>{all.filter(f).length}</span>
              </button>
            ))}
          </div>
          <div className={s.sum}>
            <span><b>{activeRows.length}</b> aktiivset malli</span>
            <span><b>{activeRows.reduce((n, r) => n + r.active, 0)}</b> arvet jooksu kohta</span>
            {sendHour != null && (
              <span className={s.sendHour}>
                <button className={s.sendBtn} onClick={() => setHourMenu((v) => !v)} title="Automaatse saatmise kellaaeg">
                  Saadetakse kell {sendHour}:00
                </button>
                {hourMenu && (
                  <div className={s.menu}>
                    <p className={s.menuHint}>Automaatsed arved luuakse ja saadetakse iga päev valitud tunnil (Eesti aeg).</p>
                    <div className={s.hours}>
                      {[10, 11, 12, 13, 14, 15, 16, 17, 18].map((h) => (
                        <button key={h} className={h === sendHour ? s.on : ''} onClick={() => saveHour(h)}>{h}:00</button>
                      ))}
                    </div>
                  </div>
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className={s.main}>
        <div className={s.card}>
          <div className={s.tw}>
            <table className={s.table}>
              <thead>
                <tr>
                  {COLS.map(([k, label, right], i) => (
                    <th
                      key={i}
                      className={`${right ? s.r : ''} ${k === sort ? s.sorted : ''}`}
                      onClick={() => {
                        if (!k) return;
                        if (sort === k) setDir(-dir);
                        else { setSort(k); setDir(1); }
                      }}
                    >
                      {label}{k === sort ? (dir > 0 ? ' ↑' : ' ↓') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {error && <tr><td colSpan={9} className={s.empty}>{error}</td></tr>}
                {!error && !rows.length && (
                  <tr><td colSpan={9} className={s.empty}>{all.length ? 'Ühtegi malli ei leitud' : 'Korduvaid malle veel pole'}</td></tr>
                )}
                {rows.map((r) => {
                  const [cls, label] = STATE_LABEL[r.state];
                  const clients = r.t.clients || [];
                  const paused = r.state === 'paused';
                  const period = periodFor(r.t, r.t.next_invoice_date);
                  return (
                    <tr
                      key={r.t.id}
                      className={`${paused ? s.paused : ''} ${r.t.id === selId ? s.sel : ''}`}
                      onClick={() => setChosenId(r.t.id)}
                      onDoubleClick={() => open(r.t.id)}
                    >
                      <td className={s.nm}><b>{r.t.name}</b><span>{r.t.description || ''}</span></td>
                      <td>
                        <div className={s.avs}>
                          {clients.slice(0, 3).map((c) => (
                            <span key={c.id} className={s.av} title={c.partner?.name}>{initials(c.partner?.name || '?')}</span>
                          ))}
                          {clients.length > 3 && <span className={`${s.av} ${s.avMore}`}>+{clients.length - 3}</span>}
                          <span className={s.avC}>{r.active}{r.active < r.total ? ` / ${r.total}` : ''}</span>
                        </div>
                      </td>
                      <td>{frequencyLabel(r.t)}</td>
                      <td className={s.mono}>
                        {paused ? '—' : isoToEt(r.t.next_invoice_date)}
                        {!paused && <span className={s.subline}>periood {shortRange(period.from, period.to)}</span>}
                      </td>
                      <td className={`${s.r} ${s.mono}`}>
                        {num(r.net)}{r.variable && <span className={s.muted}> +muutuv</span>}
                      </td>
                      <td className={`${s.r} ${s.mono}`} style={{ fontWeight: 600 }}>{paused ? '—' : num(r.runSum)}</td>
                      <td className={s.dl}>{deliveryLabel(r.t)}</td>
                      <td>
                        <span className={`${s.st} ${s[cls]}`}><i />{label}</span>
                        {r.errors > 0 && <> <span className={`${s.st} ${s.bad}`} title="Eelmine jooks ebaõnnestus">{r.errors} viga</span></>}
                      </td>
                      <td>
                        <div className={s.ra}>
                          {r.variable && !paused && (
                            <button className={s.ib} onClick={(e) => { e.stopPropagation(); router.push(`/invoices/recurring/quantities?mall=${r.t.id}`); }}>Kogused</button>
                          )}
                          <button className={s.ib} onClick={(e) => { e.stopPropagation(); copy(r.t); }}>Kopeeri</button>
                          <button className={s.ib} onClick={(e) => { e.stopPropagation(); togglePause(r.t); }}>{paused ? 'Aktiveeri' : 'Peata'}</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className={s.ft}>
            <span>Näidatud <b>{rows.length}</b> / {all.length}</span>
            <span className={s.ftR}>
              {ET_MONTHS_IN[Number(focusMonth.slice(5, 7)) - 1]} väljastatakse <b>{monthCount}</b> arvet · püsiosa{' '}
              <b className={s.mono}>{eur(monthFixed)}</b> km-ga
            </span>
          </div>
        </div>

        <aside className={s.side}>
          {selected ? (
            <SidePanel
              row={selected}
              onPause={() => togglePause(selected.t)}
              onEdit={() => open(selected.t.id)}
              onDelete={() => setConfirmDelete(selected.t)}
            />
          ) : (
            <div className={s.empty}>Vali mall</div>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(null)}
        title="Kustuta mall?"
        description={`Mall „${confirmDelete?.name || ''}" kustutatakse. Juba loodud arved jäävad alles.`}
        confirmLabel="Kustuta"
        variant="danger"
        onConfirm={remove}
      />
    </div>
  );
}

function runBadge(run: TemplateRun): [string, string] {
  if (run.status === 'failed' || run.delivery_status === 'failed') return ['bad', 'Ebaõnnestus'];
  if (run.status === 'pending') return ['w', 'Töös'];
  if (run.delivery_status === 'sent') return ['ok', 'Saadetud'];
  if (run.delivery_status === 'confirmed') return ['ok', 'Kinnitatud'];
  return ['off', 'Mustand'];
}

function SidePanel({
  row,
  onPause,
  onEdit,
  onDelete,
}: {
  row: Row;
  onPause: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = row;
  const [cls, label] = STATE_LABEL[row.state];
  const paused = row.state === 'paused';
  const lines = t.lines || [];
  const { net, gross } = fixedTotals(lines);
  const clients = t.clients || [];
  const runs = paused ? [] : upcomingRuns(t, 3);
  const generated = (t.recent_runs || []).slice(0, 6);
  const clientName = (partnerId: string | null) => clients.find((c) => c.partner_id === partnerId)?.partner?.name || '';
  const deliv = row.variable ? 'Mustand · ootab kogust' : t.delivery === 'auto' ? 'Automaatne' : 'Ülevaatusele';
  const delivColor = row.variable ? '#8a5a0c' : t.delivery === 'auto' ? 'var(--a-pos)' : 'var(--a-text)';

  return (
    <>
      <div className={s.sc}>
        <div className={s.sd}>
          <div className={s.sh}>
            <span className={s.av}>{initials(t.name)}</span>
            <div className={s.sht}><b>{t.name}</b><span>{t.description || ''}</span></div>
            <span className={`${s.st} ${s[cls]}`}><i />{label}</span>
          </div>
          <div className={`${s.big} ${s.mono}`}>{eur(gross)}<small> / arve</small></div>
          <div className={s.bsub}>{vatLabel(lines)} · neto {eur(net)}{row.variable ? ' + muutuv osa' : ''}</div>
        </div>

        <div className={`${s.sd} ${s.kvg}`}>
          <div><div className={s.k}>Sagedus</div><div className={s.v}>{frequencyLabel(t)}</div></div>
          <div><div className={s.k}>Edastamine</div><div className={s.v} style={{ color: delivColor }}>{deliv}</div></div>
          <div><div className={s.k}>Alustatud</div><div className={`${s.v} ${s.mono}`}>{isoToEt(t.created_at)}</div></div>
          <div><div className={s.k}>Lõpeb</div><div className={`${s.v} ${s.mono}`}>{paused ? 'Peatatud' : t.end_date ? isoToEt(t.end_date) : '—'}</div></div>
        </div>

        <div className={s.sd}>
          <div className={s.sl}>Kliendid<span className={s.slR}>{row.active} / {row.total} aktiivset</span></div>
          {clients.slice(0, 4).map((c) => (
            <div key={c.id} className={`${s.scl} ${c.is_active ? '' : s.sclOff}`}>
              <span className={s.av}>{initials(c.partner?.name || '?')}</span>{c.partner?.name || '—'}
            </div>
          ))}
          {clients.length > 4 && <div className={s.scl} style={{ color: 'var(--a-text-3)', fontSize: 11.5 }}>+{clients.length - 4} veel</div>}
          {!clients.length && <div className={s.none}>Kliente pole</div>}
        </div>

        <div className={s.sd}>
          <div className={s.sl}>Tulevased jooksud<span className={s.slR}>{row.active} arvet jooksu kohta</span></div>
          {runs.length ? runs.map((d, i) => (
            <div key={d} className={`${s.srun} ${i === 0 ? s.nx : ''}`}>
              <span className={s.bu} />
              <span className={`${s.d} ${s.mono}`}>{isoToEt(d)}</span>
              <span className={s.p}>
                {i === 0 ? (row.variable ? 'ootab kogust' : t.delivery === 'auto' ? 'järgmine · saadetakse' : 'järgmine · ülevaatusele') : 'planeeritud'}
              </span>
              <span className={s.mono}>{num(row.runSum)}</span>
            </div>
          )) : <div className={s.none}>Tulevasi jookse pole</div>}
        </div>

        <div className={s.sd}>
          <div className={s.sl}>Genereeritud<span className={s.slR}>{t.invoices_generated}</span></div>
          {generated.length ? generated.map((run) => {
            const [bc, bl] = runBadge(run);
            const body = (
              <>
                <span className={s.mono}>{shortRange(run.period_start, run.period_end)}.{run.period_end.slice(0, 4)}</span>
                <span className={s.sgenName}>{clientName(run.partner_id)}</span>
                <span className={`${s.st} ${s[bc]}`} title={run.error || run.delivery_error || undefined}><i />{bl}</span>
              </>
            );
            return run.invoice_id ? (
              <Link key={run.id} className={s.sgen} href={`/invoices/${run.invoice_id}/edit`}>{body}</Link>
            ) : (
              <div key={run.id} className={s.sgen}>{body}</div>
            );
          }) : <div className={s.none}>Arveid pole veel loodud</div>}
        </div>
      </div>
      <div className={s.sft}>
        <button className={s.btn} onClick={onPause}>{paused ? 'Aktiveeri' : 'Peata'} <kbd className={s.kbd}>P</kbd></button>
        <button className={s.btn} onClick={onEdit}>Muuda <kbd className={s.kbd}>M</kbd></button>
        <button className={`${s.btn} ${s.del}`} onClick={onDelete} title="Kustuta mall">✕</button>
      </div>
    </>
  );
}
