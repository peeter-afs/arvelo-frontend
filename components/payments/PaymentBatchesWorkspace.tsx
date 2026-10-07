'use client';

/**
 * Maksepaketid — dense list + resizable detail panel (docs2/design_handoff_maksed, section 2).
 * Batches come from Ostuarved, payroll runs or are made here; only the actions the
 * current status allows are rendered.
 */

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { AlertTriangle, Check, ChevronDown, ChevronLeft, ChevronRight, Download, ExternalLink, FileText, Info, Loader2, MoreHorizontal, Plus, Search, Send, User, X } from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';
import { accountingApi, type AccountOption } from '@/lib/api/accounting.api';
import { bankingApi, type BankAccountRecord, type PaymentBatchLine, type PaymentBatchListItem } from '@/lib/api/banking.api';
import { invoicesApi, type InvoiceListItem } from '@/lib/api/invoices.api';
import { showToast } from '@/components/ui/Toast';
import styles from './Payments.module.css';
import { NewPaymentBatchModal, type BatchSeed } from './NewPaymentBatchModal';
import {
  BATCH_ST, DAY, Gutter, Metric, ModuleTabs, Tag, amount, batchOrigin, batchSt, csv, dateText, downloadText, ibanFull, ibanShort, inField, money,
  personName, timeText, useColumns, useMemberNames, useModuleCounts, useOutsideClose, usePanel, type BatchStKey, type Col,
} from './shared';

type TabKey = 'active' | 'done' | 'voided' | 'all';
type OriginKey = 'all' | 'purchase_invoices' | 'payroll' | 'manual';
type ColId = 'n' | 'o' | 'bk' | 'ex' | 'ln' | 'a' | 's';
type Detail = { batch: PaymentBatchListItem; lines: PaymentBatchLine[] };
type OpenLine = { batch: PaymentBatchListItem; line: PaymentBatchLine };
type Modal = { kind: 'new'; seed?: BatchSeed; preselect?: string[] } | { kind: 'void'; batch: PaymentBatchListItem; lines: number } | { kind: 'file'; batch: PaymentBatchListItem; lines: number } | null;

const TABS: Array<[TabKey, string]> = [['active', 'Pooleli'], ['done', 'Täidetud'], ['voided', 'Tühistatud'], ['all', 'Kõik']];
const TAB_ST: Record<TabKey, BatchStKey[]> = { active: ['draft', 'generated', 'uploaded', 'sent', 'rejected'], done: ['confirmed'], voided: ['voided'], all: Object.keys(BATCH_ST) as BatchStKey[] };
const ORIGINS: Array<[OriginKey, string]> = [['all', 'Kõik allikad'], ['purchase_invoices', 'Ostuarved'], ['payroll', 'Palk'], ['manual', 'Käsitsi']];
const ORIGIN_SUB: Record<Exclude<OriginKey, 'all'>, string> = { purchase_invoices: 'Ostuarvetest', payroll: 'Palgast', manual: 'Käsitsi' };
const COLS: Array<Col<ColId>> = [
  { id: 'n', label: 'Pakett', track: 'minmax(200px,1.6fr)' }, { id: 'o', label: 'Allikas', track: '96px' }, { id: 'bk', label: 'Pangakonto', track: 'minmax(130px,1fr)' },
  { id: 'ex', label: 'Täitmine', track: '90px' }, { id: 'ln', label: 'Ridu', track: '52px', right: true }, { id: 'a', label: 'Summa', track: '112px', right: true }, { id: 's', label: 'Staatus', track: '150px' },
];
const HIDE_ORDER: ColId[] = ['bk', 'ln', 'o'];
const STEP_AT: Record<BatchStKey, number> = { draft: 0, generated: 1, uploaded: 2, sent: 2, rejected: 2, confirmed: 4, voided: -1 };
const PAYABLE = ['approved', 'payable', 'partially_paid'];
const openOf = (inv: InvoiceListItem) => Number(inv.open_amount ?? Number(inv.total || 0) - Number(inv.paid_amount || 0));
const connection = (via?: string | null) => (!via ? null : /lhv/i.test(via) ? 'LHV Connect' : /swed/i.test(via) ? 'Swedbank Gateway' : via);
const fileName = (b: PaymentBatchListItem, ext: string) => `${(b.batch_name || 'maksepakett').replace(/[\\/:*?"<>|]+/g, '-')}.${ext}`;

function OriginTag({ origin }: { origin: Exclude<OriginKey, 'all'> }) {
  const [icon, cls, label] = origin === 'payroll' ? [<User key="i" size={11} />, styles.otagPayroll, 'Palk'] : origin === 'purchase_invoices' ? [<FileText key="i" size={11} />, styles.otagPinv, 'Ostuarved'] : [<Plus key="i" size={11} />, '', 'Käsitsi'];
  return <span className={`${styles.otag} ${cls}`}>{icon}{label}</span>;
}

export default function PaymentBatchesWorkspace() {
  const params = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const [batches, setBatches] = useState<PaymentBatchListItem[]>([]);
  const [details, setDetails] = useState<Record<string, Detail>>({});
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [openLines, setOpenLines] = useState<OpenLine[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRecord[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(params.get('batch'));
  const [tab, setTab] = useState<TabKey>(params.get('batch') ? 'all' : 'active');
  const [origin, setOrigin] = useState<OriginKey>('all');
  const [bankFilter, setBankFilter] = useState('');
  const [query, setQuery] = useState('');
  const [menu, setMenu] = useState<'bank' | 'more' | 'dl' | null>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(Boolean(params.get('batch')));
  const names = useMemberNames();
  const panel = usePanel('arvelo.batch.pw');
  const columns = useColumns(COLS, HIDE_ORDER);
  useOutsideClose(useCallback(() => setMenu(null), []));

  // ?new=1&invoices=a,b (from Aegumisaruanne): open a new batch with those invoices ticked, once loaded.
  const preselectParam = params.get('new') === '1' ? params.get('invoices') : null;
  const preselectOpened = useRef(false);
  useEffect(() => {
    if (loading || !preselectParam || preselectOpened.current) return;
    preselectOpened.current = true;
    setModal({ kind: 'new', preselect: preselectParam.split(',').filter(Boolean) });
  }, [loading, preselectParam]);

  const load = useCallback(async (preferred?: string | null) => {
    setError(null);
    try {
      const res = await bankingApi.listPaymentBatches({ limit: 100 });
      setBatches(res.items);
      const keep = preferred ? res.items.find((x) => x.id === preferred) : null;
      if (keep) {
        // An action moved the batch to another status: follow it to its tab instead of losing the selection.
        const st = batchSt(keep);
        setTab((t) => (TAB_ST[t].includes(st) ? t : st === 'confirmed' ? 'done' : st === 'voided' ? 'voided' : 'active'));
        setSelectedId(preferred!);
      }
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);
  const loadPayables = useCallback(() => {
    invoicesApi.listInvoices({ type: 'purchase_invoice', limit: 300 }).then((rows) => setInvoices(rows.filter((r) => PAYABLE.includes(r.status) && r.journal_entry_id && openOf(r) > 0.004))).catch(() => {});
    bankingApi.listOpenPaymentBatchLines().then(setOpenLines).catch(() => {});
  }, []);
  useEffect(() => { void load(); loadPayables(); }, [load, loadPayables]);
  useEffect(() => {
    bankingApi.listBankAccounts().then((rows) => setBankAccounts(rows.filter((b) => b.is_active))).catch(() => {});
    accountingApi.getAccounts().then(setAccounts).catch(() => {});
  }, []);
  const loadDetail = useCallback(async (id: string) => {
    try {
      const d = await bankingApi.getPaymentBatch(id);
      setDetails((old) => ({ ...old, [id]: { batch: d.batch, lines: d.lines } }));
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }, []);
  useEffect(() => { if (selectedId && !details[selectedId]) void loadDetail(selectedId); }, [selectedId, details, loadDetail]);
  /** After an action: refresh the list, the selected batch and what Ostuarved shows as "in a batch". */
  const refresh = useCallback(async (id: string) => {
    setDetails((old) => { const next = { ...old }; delete next[id]; return next; });
    await load(id); loadPayables();
  }, [load, loadPayables]);

  /* ── filtering ── */
  const base = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('et');
    return batches.filter((b) => (origin === 'all' || batchOrigin(b) === origin) && (!bankFilter || b.bank_account_id === bankFilter)
      && (!q || `${b.batch_name || ''} ${b.bank_account_name || ''} ${(b.payee_names || []).join(' ')}`.toLocaleLowerCase('et').includes(q)));
  }, [batches, origin, bankFilter, query]);
  const count = (k: TabKey) => base.filter((b) => TAB_ST[k].includes(batchSt(b))).length;
  const visible = useMemo(() => base.filter((b) => TAB_ST[tab].includes(batchSt(b))), [base, tab]);
  useEffect(() => { if (!loading && !visible.some((b) => b.id === selectedId)) setSelectedId(visible[0]?.id || null); }, [visible, selectedId, loading]);
  const selected = batches.find((b) => b.id === selectedId) || null;
  const detail = selectedId ? details[selectedId] || null : null;
  const index = selected ? visible.findIndex((b) => b.id === selected.id) : -1;
  const move = useCallback((delta: number) => {
    const next = visible[Math.max(0, Math.min(visible.length - 1, index + delta))];
    if (!next) return;
    setSelectedId(next.id); setMenu(null);
    rowRefs.current.get(next.id)?.scrollIntoView({ block: 'nearest' });
  }, [visible, index]);
  const open = (id: string) => { const b = batches.find((x) => x.id === id); if (b && !TAB_ST[tab].includes(batchSt(b))) setTab('active'); setSelectedId(id); setDetailOpen(true); };

  const rejected = batches.filter((b) => batchSt(b) === 'rejected');
  const counts = useModuleCounts('batch', loading ? null : batches.filter((b) => batchSt(b) === 'draft' || batchSt(b) === 'rejected').length);
  const total = (rows: PaymentBatchListItem[]) => rows.reduce((n, b) => n + Number(b.total_amount || 0), 0);
  const metrics = useMemo(() => ({
    topay: invoices.reduce((n, r) => n + openOf(r), 0),
    bank: total(batches.filter((b) => ['generated', 'uploaded', 'sent'].includes(batchSt(b)))),
    done: total(batches.filter((b) => batchSt(b) === 'confirmed' && Date.now() - new Date(b.confirmed_at || b.updated_at).getTime() <= 30 * DAY)),
  }), [batches, invoices]);

  /* ── actions ── */
  const run = useCallback(async (key: string, fn: () => Promise<void>) => {
    setBusy(key); setMenu(null);
    try { await fn(); } catch (e) { showToast.error(getErrorMessage(e)); } finally { setBusy(null); }
  }, []);
  const act = useMemo(() => ({
    send: (b: PaymentBatchListItem) => run('send', async () => { const r = await bankingApi.submitPaymentBatchToBank(b.id); await refresh(b.id); showToast.success(`Saadetud panka · ${connection(r.provider)}`); }),
    pain: (b: PaymentBatchListItem) => run('dl', async () => {
      let content = b.exported_file_format === 'pain.001.001.09' ? b.exported_file_content : null;
      if (!content) { const r = await bankingApi.generatePaymentBatchPain001(b.id); content = r.batch.exported_file_content || null; await refresh(b.id); }
      if (!content) throw new Error('Faili ei õnnestunud luua');
      downloadText(fileName(b, 'xml'), content, 'application/xml'); showToast.success(`Laaditud alla: ${fileName(b, 'xml')}`);
    }),
    csv: (b: PaymentBatchListItem, lines: PaymentBatchLine[]) => {
      downloadText(fileName(b, 'csv'), csv([['Nr', 'Saaja', 'IBAN', 'Arve', 'Viitenumber', 'Selgitus', 'Summa', 'Valuuta'], ...lines.map((l) => [l.line_no, l.payee_name, l.payee_iban, l.invoice_number, l.reference, l.description, Number(l.amount), l.currency])]), 'text/csv;charset=utf-8');
      setMenu(null); showToast.success(`Laaditud alla: ${fileName(b, 'csv')}`);
    },
    uploaded: (b: PaymentBatchListItem) => run('uploaded', async () => { await bankingApi.confirmPaymentBatchUploaded(b.id); await refresh(b.id); showToast.success('Märgitud üles laadituks'); }),
    exec: (b: PaymentBatchListItem, lines: number) => run('exec', async () => { const r = await bankingApi.confirmPaymentBatchExecuted(b.id); await refresh(b.id); showToast.success(`${r.payments_created ?? lines} makset loodud ja seotud arvetega`); }),
  }), [run, refresh]);
  const voidBatch = (b: PaymentBatchListItem, reason: string) => run('void', async () => {
    const r = await bankingApi.voidPaymentBatch(b.id, { reason: reason.trim() || 'Põhjus märkimata' });
    setModal(null); await refresh(b.id);
    showToast.success('Pakett tühistatud');
    if (r.released_payroll_run_label) showToast.success(`${r.released_payroll_run_label} vabanes uue paketi jaoks`);
  });

  /* ── keyboard ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (modal) return;
      if (inField(e)) { if (e.key === 'Escape') (e.target as HTMLElement).blur(); return; }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); move(-1); }
      else if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      else if (e.key === 'n' || e.key === 'N') { e.preventDefault(); setModal({ kind: 'new' }); }
      else if (e.key === 'Escape') setMenu(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move, modal]);

  const bankLabel = bankAccounts.find((b) => b.id === bankFilter)?.name;
  const style = { '--panel-width': `${panel.px}px` } as CSSProperties;

  return (
    <div className={styles.workspace} style={style}>
      <div className={styles.hdr}>
        <div className={styles.topbar}>
          <h1>Maksepaketid</h1>
          <ModuleTabs active="batch" counts={counts} />
          <div className={styles.metrics}>
            <Metric label="Maksmisele" value={money(metrics.topay)} />
            <Metric label="Pangas ootel" value={money(metrics.bank)} tone="warn" />
            <Metric label="Täidetud 30 p" value={money(metrics.done)} tone="pos" />
          </div>
          <div className={styles.acts}>
            <button className={`${styles.btn} ${styles.primary}`} onClick={() => setModal({ kind: 'new' })}><Plus size={13} />Uus maksepakett <span className={styles.kbd}>N</span></button>
          </div>
        </div>
        <div className={styles.railrow}>
          <div className={styles.search}><Search size={13} /><input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Otsi paketti või saajat  /" /></div>
          <div className={styles.tabs}>
            {TABS.map(([k, l]) => <button key={k} className={`${styles.tab} ${tab === k ? styles.tabOn : ''}`} onClick={() => setTab(k)}>{l}<span className={styles.pill}>{count(k)}</span></button>)}
          </div>
          <div className={styles.seg}>
            {ORIGINS.map(([k, l]) => <button key={k} className={origin === k ? styles.segOn : ''} onClick={() => setOrigin(k)}>{l}</button>)}
          </div>
          <div className={styles.relative} data-menu-root>
            <button className={`${styles.perbtn} ${bankFilter ? styles.perbtnOn : ''}`} onClick={() => setMenu(menu === 'bank' ? null : 'bank')}>Konto: {bankLabel || 'kõik'}<ChevronDown size={11} /></button>
            {menu === 'bank' && (
              <div className={`${styles.menu} ${styles.menuDown}`}>
                <button className={`${styles.mitem} ${!bankFilter ? styles.mitemOn : ''}`} onClick={() => { setBankFilter(''); setMenu(null); }}>Kõik kontod</button>
                {bankAccounts.map((b) => <button key={b.id} className={`${styles.mitem} ${bankFilter === b.id ? styles.mitemOn : ''}`} onClick={() => { setBankFilter(b.id); setMenu(null); }}><span>{b.name}<span className={styles.mdesc}>{ibanShort(b.iban)}</span></span></button>)}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.body} ref={panel.bodyRef}>
        <div className={styles.card}>
          <div className={styles.listhead}>
            <b>{visible.length} paketti</b>
            <div className={styles.listMetrics}>
              <Metric label="Maksmisele" value={money(metrics.topay)} />
              <Metric label="Pangas ootel" value={money(metrics.bank)} tone="warn" />
            </div>
            <div className={styles.listheadR}><span>Kokku <b className={styles.mono}>{money(total(visible))}</b></span></div>
          </div>
          {rejected.length > 0 && (
            <div className={styles.warnstrip}>
              <AlertTriangle size={13} />
              <span>Pank lükkas tagasi paketi „{rejected[0].batch_name || 'Maksepakett'}“{rejected[0].bank_status_reason ? ` · ${rejected[0].bank_status_reason}` : ''}{rejected.length > 1 ? ` (+${rejected.length - 1})` : ''}</span>
              <button className={`${styles.btn} ${styles.sm} ${styles.primary}`} onClick={() => open(rejected[0].id)}>Ava pakett</button>
            </div>
          )}
          <div className={styles.tscroll} ref={columns.setScrollEl} style={{ '--cols': columns.template } as CSSProperties}>
            <div className={styles.thead}>{columns.shown.map((c) => <div key={c.id} className={c.right ? styles.r : ''}>{c.label}</div>)}</div>
            {loading ? <div className={styles.empty}><Loader2 size={18} className="animate-spin" /></div>
              : error && batches.length === 0 ? <div className={styles.empty}>{error}</div>
              : visible.length === 0 ? <div className={styles.empty}>Siin pakette pole</div>
              : visible.map((b) => {
                const st = batchSt(b); const o = batchOrigin(b);
                const cell: Record<ColId, ReactNode> = {
                  n: <div key="n" data-main><span className={styles.cust}><span className={styles.nm}><span className={styles.n1}>{b.batch_name || 'Maksepakett'}</span><span className={styles.n2}>{ORIGIN_SUB[o]} · {personName(b.created_by_email, names)} · loodud {dateText(b.created_at)}</span></span></span></div>,
                  o: <div key="o" data-col><OriginTag origin={o} /></div>,
                  bk: <div key="bk" data-col className={styles.dt}>{b.bank_account_name || '—'}</div>,
                  ex: <div key="ex" data-col className={`${styles.dt} ${styles.mono}`}>{dateText(b.execution_date)}</div>,
                  ln: <div key="ln" data-col className={`${styles.dt} ${styles.mono} ${styles.r}`}>{b.line_count ?? 0}</div>,
                  a: <div key="a" data-amount className={`${styles.num} ${styles.mono} ${st === 'voided' ? styles.numMut : ''}`}>{money(b.total_amount)}</div>,
                  s: <div key="s" data-col><Tag kind={BATCH_ST[st][1]}>{BATCH_ST[st][0]}</Tag></div>,
                };
                return (
                  <div key={b.id} ref={(el) => { if (el) rowRefs.current.set(b.id, el); else rowRefs.current.delete(b.id); }} className={`${styles.trow} ${b.id === selected?.id ? styles.trowOn : ''}`} onClick={() => { setSelectedId(b.id); setDetailOpen(true); setMenu(null); }}>
                    {columns.shown.map((c) => cell[c.id])}
                  </div>
                );
              })}
          </div>
          <div className={styles.tfoot}>
            <span>↑↓ liigu · N uus pakett</span>
            <div className={styles.tfootR}><span>{invoices.length} ostuarvet ootab maksmist · <button className={styles.link} onClick={() => setModal({ kind: 'new' })}>koosta pakett</button></span></div>
          </div>
        </div>
        <Gutter panel={panel} />
        <div className={`${styles.card} ${styles.detailCard} ${detailOpen ? styles.detailCardOpen : ''}`}>
          <div className={styles.mobileBar}><button className={`${styles.btn} ${styles.ghost}`} onClick={() => setDetailOpen(false)}><ChevronLeft size={16} />Maksepaketid</button></div>
          {selected ? (
            <BatchDetail
              b={{ ...selected, ...(detail?.batch || {}), origin: batchOrigin(selected), payroll_run_id: selected.payroll_run_id ?? detail?.batch.payroll_run_id, payroll_run_label: selected.payroll_run_label ?? detail?.batch.payroll_run_label }}
              lines={detail?.lines || null} accounts={accounts} names={names} index={index} total={visible.length} onMove={move}
              busy={busy} menu={menu} setMenu={setMenu} act={act}
              onVoid={(b, n) => setModal({ kind: 'void', batch: b, lines: n })} onFile={(b, n) => setModal({ kind: 'file', batch: b, lines: n })}
              onRebuild={(b, lines, mode) => setModal({ kind: 'new', seed: { batch: b, lines, mode } })}
            />
          ) : <div className={styles.empty}>{loading ? '' : 'Vali maksepakett'}</div>}
        </div>
      </div>

      {modal?.kind === 'new' && (
        <NewPaymentBatchModal invoices={invoices} openLines={openLines} bankAccounts={bankAccounts} accounts={accounts} seed={modal.seed} preselect={modal.preselect}
          onClose={() => setModal(null)}
          onCreated={async (id) => { const old = modal.seed?.batch.id; setModal(null); setTab('active'); if (old) setDetails((d) => { const n = { ...d }; delete n[old]; return n; }); await refresh(id); }} />
      )}
      {modal?.kind === 'void' && <VoidModal batch={modal.batch} lines={modal.lines} busy={busy === 'void'} onClose={() => setModal(null)} onVoid={(reason) => voidBatch(modal.batch, reason)} />}
      {modal?.kind === 'file' && <FileModal batch={modal.batch} lines={modal.lines} onClose={() => setModal(null)} />}
    </div>
  );
}

type Act = {
  send: (b: PaymentBatchListItem) => Promise<void>; pain: (b: PaymentBatchListItem) => Promise<void>; csv: (b: PaymentBatchListItem, lines: PaymentBatchLine[]) => void;
  uploaded: (b: PaymentBatchListItem) => Promise<void>; exec: (b: PaymentBatchListItem, lines: number) => Promise<void>;
};

function BatchDetail({ b, lines, accounts, names, index, total, onMove, busy, menu, setMenu, act, onVoid, onFile, onRebuild }: {
  b: PaymentBatchListItem; lines: PaymentBatchLine[] | null; accounts: AccountOption[]; names: Map<string, string>;
  index: number; total: number; onMove: (d: number) => void; busy: string | null;
  menu: 'bank' | 'more' | 'dl' | null; setMenu: (m: 'bank' | 'more' | 'dl' | null) => void; act: Act;
  onVoid: (b: PaymentBatchListItem, lines: number) => void; onFile: (b: PaymentBatchListItem, lines: number) => void;
  onRebuild: (b: PaymentBatchListItem, lines: PaymentBatchLine[], mode: 'edit' | 'redo') => void;
}) {
  const st = batchSt(b); const o = batchOrigin(b); const payroll = o === 'payroll';
  const n = lines?.length ?? b.line_count ?? 0;
  const warnLine = (l: PaymentBatchLine) => (l.invoice_id && !l.reference ? 'Viitenumber puudub, kasutatakse selgitust' : '');
  const warns = (lines || []).filter((l) => warnLine(l) || l.status === 'failed').length;
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const at = STEP_AT[st];
  const hasFile = !!b.exported_file_content;
  const runLink = b.payroll_run_id ? `/payroll/runs/${b.payroll_run_id}` : '/payroll';

  let note: ReactNode = null;
  if (st === 'sent') note = b.bank_status && b.bank_status !== 'sent'
    ? <div className={`${styles.note} ${styles.noteOk}`}><Check size={12} /><span>Pank võttis vastu {dateText(b.bank_status_at)} {timeText(b.bank_status_at)} · {connection(b.submitted_via)}. Täidetuks märgitakse automaatselt, kui väljavõttel on read olemas.</span></div>
    : <div className={`${styles.note} ${styles.noteMut}`}><Info size={12} /><span>Saadetud panka {dateText(b.submitted_at)} {timeText(b.submitted_at)} · {connection(b.submitted_via)}. Ootab panga vastust.</span></div>;
  else if (st === 'uploaded') note = <div className={`${styles.note} ${styles.noteWarn}`}><Info size={12} /><span>Fail laaditi internetipanka käsitsi üles. Kinnita täidetuks, kui pank on maksed teinud – siis luuakse {n} makset.</span></div>;
  else if (st === 'rejected') note = <div className={`${styles.note} ${styles.noteBad}`}><AlertTriangle size={12} /><span><b>Pank keeldus {dateText(b.bank_status_at)}.</b> {b.bank_status_reason || ''}</span></div>;
  else if (st === 'confirmed') note = <div className={`${styles.note} ${styles.noteOk}`}><Check size={12} /><span>Täidetud {dateText(b.confirmed_at)} · {n} makset loodi{payroll ? '' : ' ja seoti arvetega'}. <Link href="/accounting/payments">Vaata maksetes</Link></span></div>;
  else if (st === 'voided') note = <div className={`${styles.note} ${styles.noteMut}`}><X size={12} /><span>Tühistatud{b.void_reason ? ` · ${b.void_reason}` : ''}</span></div>;
  else if (st === 'draft' && warns) note = <div className={`${styles.note} ${styles.noteWarn}`}><AlertTriangle size={12} /><span>{warns} real on hoiatus. Kontrolli enne panka saatmist.</span></div>;
  else if (st === 'draft' && payroll) note = <div className={`${styles.note} ${styles.noteMut}`}><Info size={12} /><span>Read tulevad palgaarvestusest. Summa muutmiseks paranda palgaarvestust ja koosta pakett uuesti.</span></div>;

  const B = (key: string, label: ReactNode, onClick: () => void, cls = '') => <button className={`${styles.btn} ${cls}`} disabled={!!busy} onClick={onClick}>{busy === key ? <Loader2 size={13} className="animate-spin" /> : null}{label}</button>;
  let right: ReactNode = null;
  type MenuItem = { key: string; label: string; onClick?: () => void; href?: string; danger?: boolean } | '-';
  const more: MenuItem[] = [];
  const fileItem = () => { if (hasFile) more.push({ key: 'file', label: 'Vaata faili', onClick: () => onFile(b, n) }); };
  const voidItem = () => { if (more.length) more.push('-'); more.push({ key: 'void', label: 'Tühista pakett', onClick: () => onVoid(b, n), danger: true }); };
  if (st === 'draft') {
    right = <>
      <div className={styles.relative} data-menu-root>
        <button className={styles.btn} disabled={!!busy || !lines} onClick={() => setMenu(menu === 'dl' ? null : 'dl')}>{busy === 'dl' ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}Lae alla<ChevronDown size={11} /></button>
        {menu === 'dl' && lines && (
          <div className={`${styles.menu} ${styles.menuUp}`} style={{ right: 0, width: 230 }}>
            <button className={styles.mitem} onClick={() => void act.pain(b)}><span>pain.001 XML<span className={styles.mdesc}>Laadi internetipanka üles</span></span></button>
            <button className={styles.mitem} onClick={() => act.csv(b, lines)}><span>CSV<span className={styles.mdesc}>Tabelina ülevaatamiseks</span></span></button>
          </div>
        )}
      </div>
      {B('send', <><Send size={13} />Saada panka</>, () => void act.send(b), styles.primary)}
    </>;
    if (payroll) more.push({ key: 'run', label: 'Ava palgaarvestus', href: runLink });
    else if (lines) more.push({ key: 'edit', label: 'Muuda ridu', onClick: () => onRebuild(b, lines, 'edit') });
    fileItem(); voidItem();
  } else if (st === 'generated') {
    right = <>{B('uploaded', 'Märgi üles laaditud', () => void act.uploaded(b))}{B('send', <><Send size={13} />Saada panka</>, () => void act.send(b), styles.primary)}</>;
    fileItem(); if (hasFile) more.push({ key: 'dlx', label: 'Lae alla uuesti', onClick: () => void act.pain(b) }); voidItem();
  } else if (st === 'uploaded' || st === 'sent') {
    right = B('exec', <><Check size={13} />Kinnita täidetuks</>, () => void act.exec(b, n), styles.primary);
    fileItem(); voidItem();
  } else if (st === 'rejected') {
    right = payroll
      ? <Link className={`${styles.btn} ${styles.primary}`} href={runLink}>Paranda palgaarvestuses</Link>
      : B('redo', 'Paranda ja koosta uuesti', () => lines && onRebuild(b, lines, 'redo'), styles.primary);
    fileItem(); voidItem();
  } else if (st === 'confirmed') {
    fileItem();
  }

  const srcKv = payroll
    ? <Link href={runLink}>{b.payroll_run_label || 'Palgaarvestus'} <ExternalLink size={10} style={{ display: 'inline' }} /></Link>
    : o === 'purchase_invoices' ? <Link href="/invoices/purchase">Ostuarved · {b.invoice_count ?? (lines || []).filter((l) => l.invoice_id).length} arvet <ExternalLink size={10} style={{ display: 'inline' }} /></Link>
    : 'Koostatud siin';
  const lineKind = (l: PaymentBatchLine): ReactNode => {
    if (l.invoice_id) return <Link href={`/invoices/${l.invoice_id}/preview`}>{l.invoice_number || 'Arve'}</Link>;
    if (payroll) return /maks/i.test(l.description || '') ? 'Tööjõumaksud' : 'Töötasu';
    const acc = l.counterpart_account_id ? accountMap.get(l.counterpart_account_id) : null;
    return <span className={styles.mut}>Käsirida{acc ? ` · ${acc.code} ${acc.name}` : ''}</span>;
  };

  return (
    <>
      <div className={styles.dhead}>
        <div className={styles.drow}>
          <div className={styles.tt}>
            <h2>{b.batch_name || 'Maksepakett'}</h2>
            <div className={styles.line}>{b.bank_account_name || '—'}{b.bank_account_iban ? <> · <span className={styles.mono}>{ibanShort(b.bank_account_iban)}</span></> : null} · täitmine <span className={styles.mono}>{dateText(b.execution_date)}</span></div>
          </div>
          <div className={styles.amt}><b className={styles.mono}>{money(b.total_amount)}</b></div>
        </div>
        <div className={styles.nav}>
          <Tag kind={BATCH_ST[st][1]}>{BATCH_ST[st][0]}</Tag>
          <button className={`${styles.btn} ${styles.sm}`} disabled={index <= 0} title="Eelmine (↑)" onClick={() => onMove(-1)}><ChevronLeft size={13} /></button>
          <button className={`${styles.btn} ${styles.sm}`} disabled={index < 0 || index >= total - 1} title="Järgmine (↓)" onClick={() => onMove(1)}><ChevronRight size={13} /></button>
        </div>
      </div>
      <div className={styles.dbody}>
        <div className={styles.sec}>
          <div className={styles.steps}>
            {['Mustand', 'Fail loodud', 'Pangas', 'Täidetud'].map((label, i) => {
              const cls = st === 'voided' ? '' : i < at ? styles.stepDone : i === at ? (st === 'rejected' ? styles.stepBad : styles.stepCur) : '';
              return <div key={label} className={`${styles.step} ${cls}`}><i /><span>{i === 2 && st === 'rejected' ? 'Tagasi lükatud' : label}</span></div>;
            })}
          </div>
          {note}
        </div>
        <div className={styles.sec}>
          <div className={styles.sech}>Andmed</div>
          <div className={`${styles.kv} ${styles.kvFirst}`}><span>Allikas</span><b>{srcKv}</b></div>
          <div className={styles.kv}><span>Pangakonto</span><b className={styles.mono}>{ibanFull(b.bank_account_iban) || b.bank_account_name || '—'}</b></div>
          <div className={styles.kv}><span>Ühendus</span><b>{connection(b.submitted_via) || <span className={styles.light}>internetipank (fail)</span>}</b></div>
          <div className={styles.kv}><span>Faili vorming</span><b>{b.exported_file_format || <span className={styles.light}>luuakse saatmisel</span>}</b></div>
          <div className={styles.kv}><span>Koostas</span><b>{personName(b.created_by_email, names)} · {dateText(b.created_at)}</b></div>
        </div>
        <div className={`${styles.sec} ${styles.secLast}`}>
          <div className={styles.sech}>Read · {n}{st === 'draft' && !payroll && lines && <span className={styles.sechR}><button className={styles.link} onClick={() => onRebuild(b, lines, 'edit')}>Muuda</button></span>}</div>
          {!lines ? <div className={styles.empty} style={{ minHeight: 60 }}><Loader2 size={16} className="animate-spin" /></div> : (
            <div className={styles.lines} style={{ '--lc': 'minmax(0,1.3fr) minmax(0,1fr) 92px' } as CSSProperties}>
              <div className={styles.lhead}><div>Saaja</div><div>Arve · viide</div><div className={styles.r}>Summa</div></div>
              {lines.map((l) => {
                const w = warnLine(l);
                return (
                  <div key={l.id} className={`${styles.lrow} ${w || l.status === 'failed' ? styles.lrowWarn : ''}`}>
                    <div title={l.payee_name}>{l.payee_name}<span className={`${styles.s} ${styles.mono}`}>{ibanShort(l.payee_iban)}</span></div>
                    <div>{lineKind(l)}<span className={styles.s}>{l.reference ? <span className={styles.mono}>{l.reference}</span> : w ? <span className={styles.warnText}>{w}</span> : l.description}</span></div>
                    <div className={`${styles.a} ${styles.mono}`}>{amount(l.amount)}{l.status === 'confirmed' ? <span className={styles.s}><Tag kind="ok">Makstud</Tag></span> : l.status === 'failed' ? <span className={styles.s}><Tag kind="bad">Tagasi</Tag></span> : null}</div>
                  </div>
                );
              })}
              <div className={styles.ltot}><span>{n} rida</span><span>Kokku <b className={styles.mono}>{money(b.total_amount)}</b></span></div>
            </div>
          )}
        </div>
      </div>
      {(right || more.length > 0) && (
        <div className={styles.dfoot}>
          {more.length > 0 && (
            <div className={styles.relative} data-menu-root>
              <button className={`${styles.btn} ${styles.ghost}`} title="Veel" onClick={() => setMenu(menu === 'more' ? null : 'more')}><MoreHorizontal size={14} /></button>
              {menu === 'more' && (
                <div className={`${styles.menu} ${styles.menuUp}`} style={{ left: 0 }}>
                  {more.map((m, i) => m === '-' ? <div key={i} className={styles.msep} />
                    : m.href ? <Link key={m.key} href={m.href} className={styles.mitem}>{m.label}</Link>
                    : <button key={m.key} className={`${styles.mitem} ${m.danger ? styles.mitemDanger : ''}`} onClick={() => { setMenu(null); m.onClick?.(); }}>{m.label}</button>)}
                </div>
              )}
            </div>
          )}
          <div className={styles.dfootR}>{right}</div>
        </div>
      )}
    </>
  );
}

function VoidModal({ batch, lines, busy, onClose, onVoid }: { batch: PaymentBatchListItem; lines: number; busy: boolean; onClose: () => void; onVoid: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  const st = batchSt(batch);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose, busy]);
  return (
    <div className={styles.modal} onPointerDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}>
      <div className={`${styles.mbox} ${styles.mboxNarrow}`}>
        <div className={styles.mhead}><div><h3>Tühista „{batch.batch_name || 'Maksepakett'}“?</h3><div className={styles.line}>{lines} rida · {money(batch.total_amount)}. {batchOrigin(batch) === 'payroll' ? 'Palgaarvestuse saab seejärel uuesti panka saata.' : 'Arved vabanevad uuesti maksmiseks.'}</div></div><button className={`${styles.btn} ${styles.ghost}`} onClick={onClose}><X size={14} /></button></div>
        <div className={styles.mpad}>
          <label className={styles.flbl}>Põhjus<input autoFocus className={styles.inp} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="nt topelt loodud" onKeyDown={(e) => { if (e.key === 'Enter') onVoid(reason); }} /></label>
          {(st === 'sent' || st === 'uploaded') && <div className={`${styles.note} ${styles.noteWarn}`}><AlertTriangle size={12} /><span>Pakett on juba pangas. Tühista see kindlasti ka internetipangas.</span></div>}
        </div>
        <div className={styles.mfootbar}><div className={styles.mfootR}><button className={styles.btn} onClick={onClose} disabled={busy}>Loobu</button><button className={`${styles.btn} ${styles.danger} ${styles.dangerBorder}`} disabled={busy} onClick={() => onVoid(reason)}>{busy && <Loader2 size={13} className="animate-spin" />}Tühista pakett</button></div></div>
      </div>
    </div>
  );
}

function FileModal({ batch, lines, onClose }: { batch: PaymentBatchListItem; lines: number; onClose: () => void }) {
  const ext = batch.exported_file_format === 'pain.001.001.09' ? 'xml' : 'csv';
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return (
    <div className={styles.modal} onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.mbox}>
        <div className={styles.mhead}><div><h3>{fileName(batch, ext)}</h3><div className={styles.line}>{batch.exported_file_format || '—'} · {lines} makset · {money(batch.total_amount)}</div></div><button className={`${styles.btn} ${styles.ghost}`} onClick={onClose}><X size={14} /></button></div>
        <div className={styles.mbody}><pre className={styles.file}>{batch.exported_file_content}</pre></div>
        <div className={styles.mfootbar}><div className={styles.mfootR}><button className={styles.btn} onClick={onClose}>Sulge</button><button className={`${styles.btn} ${styles.primary}`} onClick={() => downloadText(fileName(batch, ext), batch.exported_file_content || '', ext === 'xml' ? 'application/xml' : 'text/csv')}><Download size={13} />Lae alla</button></div></div>
      </div>
    </div>
  );
}
