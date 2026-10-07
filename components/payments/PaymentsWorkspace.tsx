'use client';

/**
 * Maksed — dense list + resizable detail panel (docs2/design_handoff_maksed, section 1).
 */

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Download, ExternalLink, Info, Loader2, Plus, Search, Stamp, Undo2, X } from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';
import { accountingApi, type AccountOption } from '@/lib/api/accounting.api';
import { bankingApi, type BankAccountRecord } from '@/lib/api/banking.api';
import { invoicesApi, type InvoiceListItem } from '@/lib/api/invoices.api';
import { paymentsApi, type PaymentDetail, type PaymentJournalLine, type PaymentListItem } from '@/lib/api/payments.api';
import { RegisterPaymentDialog } from '@/components/invoices/RegisterPaymentDialog';
import { showToast } from '@/components/ui/Toast';
import styles from './Payments.module.css';
import {
  Avatar, Gutter, Metric, ModuleTabs, PeriodPicker, Tag, amount, csv, dateText, daysBetween, downloadText, inField, money, periodRange,
  personName, useColumns, useMemberNames, useModuleCounts, useOutsideClose, usePanel, type Col, type PeriodKey, type TagKind,
} from './shared';

type TabKey = 'all' | 'draft' | 'posted' | 'reversed';
type DirKey = 'all' | 'incoming' | 'outgoing';
type ColId = 'd' | 'p' | 'dir' | 'src' | 'a' | 's';

const TABS: Array<[TabKey, string]> = [['all', 'Kõik'], ['draft', 'Mustand'], ['posted', 'Konteeritud'], ['reversed', 'Tühistatud']];
const DIRS: Array<[DirKey, string]> = [['all', 'Kõik suunad'], ['incoming', 'Sissetulev'], ['outgoing', 'Väljaminev']];
const COLS: Array<Col<ColId>> = [
  { id: 'd', label: 'Kuupäev', track: '84px' }, { id: 'p', label: 'Partner · arve', track: 'minmax(200px,1.7fr)' }, { id: 'dir', label: 'Suund', track: '106px' },
  { id: 'src', label: 'Allikas', track: 'minmax(140px,1fr)' }, { id: 'a', label: 'Summa', track: '112px', right: true }, { id: 's', label: 'Staatus', track: '118px' },
];
const HIDE_ORDER: ColId[] = ['src', 'dir'];
const PAY_ST: Record<TabKey, [string, TagKind]> = { all: ['', 'draft'], draft: ['Mustand', 'pend'], posted: ['Konteeritud', 'ok'], reversed: ['Tühistatud', 'void'] };
const INVOICE_TYPE: Record<string, string> = { sales_invoice: 'Müügiarve', purchase_invoice: 'Ostuarve', credit_note: 'Kreeditarve', sales_credit_note: 'Kreeditarve', purchase_credit_note: 'Ostu kreeditarve', prepayment_invoice: 'Ettemaksuarve' };
const INVOICE_STATUS: Record<string, string> = {
  draft: 'Mustand', sent: 'Saadetud', approved: 'Kinnitatud', confirmed: 'Kinnitatud', payable: 'Maksmisele', pending_approval: 'Ootab kinnitust', partially_paid: 'Osaliselt tasutud',
  paid: 'Tasutud', overdue: 'Üle tähtaja', cancelled: 'Tühistatud', void: 'Tühistatud', rejected: 'Tagasi lükatud', posted: 'Konteeritud',
};

const stKey = (p: PaymentListItem): TabKey => (p.status === 'cancelled' || p.status === 'reversed' ? 'reversed' : p.status);
const isLive = (p: PaymentListItem) => stKey(p) !== 'reversed';
const invoiceLabel = (p: PaymentListItem) => `${INVOICE_TYPE[p.invoice_type || ''] || 'Arve'} ${p.invoice_number || ''}`.trim();
function sourceText(p: PaymentListItem) {
  if (p.source === 'payment_batch') return `Maksepakett${p.payment_batch_name ? ` · ${p.payment_batch_name}` : ''}`;
  if (p.source === 'bank_import') return `Pangaimport${p.bank_account_name ? ` · ${p.bank_account_name}` : ''}`;
  if (p.source === 'manual') return `Käsitsi registreeritud${p.payment_method_name ? ` · ${p.payment_method_name.toLocaleLowerCase('et')}` : ''}`;
  return '—';
}
const where = (p: PaymentListItem) => p.bank_account_name || p.payment_method_name || '';

export default function PaymentsWorkspace() {
  const router = useRouter();
  const params = useSearchParams();
  const invoiceParam = params.get('invoice_id') || params.get('invoice');
  const searchRef = useRef<HTMLInputElement>(null);
  const reasonRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  const [payments, setPayments] = useState<PaymentListItem[]>([]);
  const [details, setDetails] = useState<Record<string, PaymentDetail>>({});
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(params.get('payment_id'));
  const [tab, setTab] = useState<TabKey>((['draft', 'posted', 'reversed'] as string[]).includes(params.get('status') || '') ? (params.get('status') as TabKey) : 'all');
  const [dir, setDir] = useState<DirKey>('all');
  const [query, setQuery] = useState('');
  const [period, setPeriod] = useState<PeriodKey>(invoiceParam ? 'all' : '90');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [menu, setMenu] = useState<'period' | null>(null);
  const [reversing, setReversing] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const [registering, setRegistering] = useState<InvoiceListItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(Boolean(params.get('payment_id')));
  const names = useMemberNames();
  const panel = usePanel('arvelo.pay.pw');
  const columns = useColumns(COLS, HIDE_ORDER);
  useOutsideClose(useCallback(() => setMenu(null), []));

  const load = useCallback(async (preferred?: string | null) => {
    setError(null);
    try {
      const rows = await paymentsApi.listPayments({ invoice_id: invoiceParam || undefined, limit: 200 });
      setPayments(rows);
      // A posted/reversed payment may leave the current tab: follow it rather than losing the selection.
      const keep = preferred ? rows.find((r) => r.id === preferred) : null;
      if (keep) setTab((t) => (t === 'all' || stKey(keep) === t ? t : stKey(keep)));
      setSelectedId((current) => (preferred && rows.some((r) => r.id === preferred) ? preferred : current && rows.some((r) => r.id === current) ? current : rows[0]?.id || null));
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [invoiceParam]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    accountingApi.getAccounts().then(setAccounts).catch(() => {});
    bankingApi.listBankAccounts().then(setBankAccounts).catch(() => {});
  }, []);
  const loadDetail = useCallback(async (id: string) => {
    try {
      const d = await paymentsApi.getPayment(id);
      setDetails((old) => ({ ...old, [id]: d }));
      return d;
    } catch (e) {
      setError(getErrorMessage(e));
      return null;
    }
  }, []);
  useEffect(() => { if (selectedId && !details[selectedId]) void loadDetail(selectedId); }, [selectedId, details, loadDetail]);

  /* ── filtering ── */
  const range = useMemo(() => periodRange(period, from, to), [period, from, to]);
  const base = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('et');
    return payments.filter((p) => {
      const d = new Date(p.payment_date);
      if (range[0] && d < range[0] && p.status !== 'draft') return false; // a draft waiting for posting never drops out of view
      if (range[1] && d > range[1]) return false;
      if (dir !== 'all' && p.direction !== dir) return false;
      return !q || `${p.partner_name || ''} ${p.invoice_number || ''} ${p.reference || ''} ${amount(p.amount)} ${Number(p.amount).toFixed(2)}`.toLocaleLowerCase('et').includes(q);
    });
  }, [payments, range, dir, query]);
  const count = (k: TabKey) => base.filter((p) => k === 'all' || stKey(p) === k).length;
  const visible = useMemo(() => base.filter((p) => tab === 'all' || stKey(p) === tab), [base, tab]);
  useEffect(() => { if (!loading && !visible.some((p) => p.id === selectedId)) setSelectedId(visible[0]?.id || null); }, [visible, selectedId, loading]);
  useEffect(() => { setReversing(false); setReason(''); }, [selectedId]);

  const sum = (rows: PaymentListItem[], d: 'incoming' | 'outgoing') => rows.filter((p) => isLive(p) && p.direction === d).reduce((n, p) => n + Number(p.amount || 0), 0);
  const periodRows = useMemo(() => payments.filter((p) => { const d = new Date(p.payment_date); return (!range[0] || d >= range[0]) && (!range[1] || d <= range[1]); }), [payments, range]);
  const drafts = useMemo(() => payments.filter((p) => p.status === 'draft'), [payments]);
  const counts = useModuleCounts('pay', loading ? null : drafts.length);
  const hasSource = payments.some((p) => p.source);
  const shownCols = hasSource ? columns.shown : columns.shown.filter((c) => c.id !== 'src');
  const template = shownCols.map((c) => c.track).join(' ');

  const selected = visible.find((p) => p.id === selectedId) || payments.find((p) => p.id === selectedId) || null;
  const detail = selected ? details[selected.id] || null : null;
  const index = selected ? visible.findIndex((p) => p.id === selected.id) : -1;
  const move = useCallback((delta: number) => {
    const next = visible[Math.max(0, Math.min(visible.length - 1, index + delta))];
    if (!next) return;
    setSelectedId(next.id);
    rowRefs.current.get(next.id)?.scrollIntoView({ block: 'nearest' });
  }, [visible, index]);

  /* ── actions ── */
  const post = useCallback(async (p: PaymentListItem) => {
    setBusy('post');
    try {
      await paymentsApi.postPayment(p.id);
      const [, d] = await Promise.all([load(p.id), loadDetail(p.id)]);
      showToast.success(`Makse konteeritud${d?.journal_entry_number ? ` · ${d.journal_entry_number}` : ''}`);
    } catch (e) {
      showToast.error(getErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }, [load, loadDetail]);
  const reverse = useCallback(async (p: PaymentListItem) => {
    setBusy('reverse');
    try {
      await paymentsApi.reversePayment(p.id, { reason: reason.trim() || undefined });
      setReversing(false); setReason('');
      await Promise.all([load(p.id), loadDetail(p.id)]);
      showToast.success('Makse tühistatud · arve avatud');
    } catch (e) {
      showToast.error(getErrorMessage(e));
    } finally {
      setBusy(null);
    }
  }, [load, loadDetail, reason]);
  const setInvoiceChip = (invoiceId: string | null) => {
    const next = new URLSearchParams(params.toString());
    next.delete('invoice'); next.delete('payment_id');
    if (invoiceId) { next.set('invoice_id', invoiceId); setTab('all'); setDir('all'); setPeriod('all'); } else { next.delete('invoice_id'); setPeriod('90'); }
    router.replace(`/accounting/payments${next.toString() ? `?${next}` : ''}`);
  };
  const exportRows = () => {
    downloadText(`maksed-${new Date().toISOString().slice(0, 10)}.csv`, csv([
      ['Kuupäev', 'Partner', 'Arve', 'Suund', 'Allikas', 'Summa', 'Valuuta', 'Staatus', 'Viide', 'Kanne'],
      ...visible.map((p) => [dateText(p.payment_date), p.partner_name, invoiceLabel(p), p.direction === 'incoming' ? 'Sissetulev' : 'Väljaminev', sourceText(p), (p.direction === 'incoming' ? 1 : -1) * Number(p.amount), p.currency, PAY_ST[stKey(p)][0], p.reference, p.journal_entry_number]),
    ]), 'text/csv;charset=utf-8');
  };

  /* ── keyboard ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (picking || registering) return;
      if (inField(e)) {
        if (e.key === 'Escape') (e.target as HTMLElement).blur();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); move(1); }
      else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); move(-1); }
      else if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      else if (e.key === 'Enter' && selected?.status === 'draft' && !busy) { e.preventDefault(); void post(selected); }
      else if (e.key === 'Escape') { setMenu(null); setReversing(false); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [move, post, selected, busy, picking, registering]);
  useEffect(() => { if (reversing) reasonRef.current?.focus(); }, [reversing]);

  const chipLabel = invoiceParam ? payments.find((p) => p.invoice_id === invoiceParam)?.invoice_number || 'valitud arve' : null;
  const bankDrafts = drafts.filter((p) => p.source === 'bank_import');
  const stripRows = bankDrafts.length ? bankDrafts : drafts;
  const style = { '--panel-width': `${panel.px}px` } as CSSProperties;

  return (
    <div className={styles.workspace} style={style}>
      <div className={styles.hdr}>
        <div className={styles.topbar}>
          <h1>Maksed</h1>
          <ModuleTabs active="pay" counts={counts} />
          <div className={styles.metrics}>
            <Metric label="Sissetulev" value={money(sum(periodRows, 'incoming'))} tone="pos" />
            <Metric label="Väljaminev" value={money(sum(periodRows, 'outgoing'))} />
            <Metric label="Ootab konteerimist" value={String(drafts.length)} tone={drafts.length ? 'warn' : undefined} />
          </div>
          <div className={styles.acts}>
            <button className={styles.btn} onClick={() => setPicking(true)}><Plus size={13} />Registreeri makse</button>
          </div>
        </div>
        <div className={styles.railrow}>
          <div className={styles.search}><Search size={13} /><input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Otsi partnerit, arvet, summat  /" /></div>
          <div className={styles.tabs}>
            {TABS.map(([k, l]) => { const n = count(k); return <button key={k} className={`${styles.tab} ${tab === k ? styles.tabOn : ''}`} onClick={() => setTab(k)}>{l}<span className={`${styles.pill} ${k === 'draft' && n ? styles.pillWarn : ''}`}>{n}</span></button>; })}
          </div>
          <div className={styles.seg}>
            {DIRS.map(([k, l]) => <button key={k} className={dir === k ? styles.segOn : ''} onClick={() => setDir(k)}>{l}</button>)}
          </div>
          <PeriodPicker value={period} from={from} to={to} open={menu === 'period'} onOpen={(o) => setMenu(o ? 'period' : null)} onChange={(v, f, t) => { setPeriod(v); if (f !== undefined) setFrom(f); if (t !== undefined) setTo(t); }} />
          {chipLabel && <span className={styles.fchip}>Arve {chipLabel}<button title="Eemalda filter" onClick={() => setInvoiceChip(null)}>×</button></span>}
        </div>
      </div>

      <div className={styles.body} ref={panel.bodyRef}>
        <div className={styles.card}>
          <div className={styles.listhead}>
            <b>{visible.length} makset</b><span className={styles.mut}>· sorteeritud kuupäeva järgi</span>
            <div className={styles.listheadR}>
              <span>Sisse <b className={`${styles.mono} ${styles.in}`}>{money(sum(visible, 'incoming'))}</b></span>
              <span>Välja <b className={styles.mono}>{money(sum(visible, 'outgoing'))}</b></span>
            </div>
          </div>
          {drafts.length > 0 && tab !== 'draft' && (
            <div className={styles.warnstrip}>
              <AlertTriangle size={13} />
              <span>{stripRows === bankDrafts ? `${bankDrafts.length} pangast imporditud makset ootab konteerimist` : `${drafts.length} makset ootab konteerimist`} · {money(stripRows.reduce((n, p) => n + Number(p.amount || 0), 0))}</span>
              <button className={`${styles.btn} ${styles.sm} ${styles.primary}`} onClick={() => setTab('draft')}>Vaata mustandeid</button>
            </div>
          )}
          <div className={styles.tscroll} ref={columns.setScrollEl} style={{ '--cols': template } as CSSProperties}>
            <div className={styles.thead}>{shownCols.map((c) => <div key={c.id} className={c.right ? styles.r : ''}>{c.label}</div>)}</div>
            {loading ? <div className={styles.empty}><Loader2 size={18} className="animate-spin" /></div>
              : error && payments.length === 0 ? <div className={styles.empty}>{error}</div>
              : visible.length === 0 ? <div className={styles.empty}>Selle filtriga makseid pole</div>
              : visible.map((p) => {
                const inc = p.direction === 'incoming';
                const cell: Record<ColId, ReactNode> = {
                  d: <div key="d" data-col className={`${styles.dt} ${styles.mono}`}>{dateText(p.payment_date)}</div>,
                  p: <div key="p" data-main><span className={styles.cust}><Avatar name={p.partner_name || '?'} /><span className={styles.nm}><span className={styles.n1}>{p.partner_name || 'Tundmatu partner'}</span><span className={styles.n2}>{INVOICE_TYPE[p.invoice_type || ''] || 'Arve'} <span className={styles.mono}>{p.invoice_number}</span></span></span></span></div>,
                  dir: <div key="dir" data-col><span className={styles.dir}><span className={`${styles.ar} ${inc ? styles.arIn : styles.arOut}`}>{inc ? <ArrowDownLeft size={11} /> : <ArrowUpRight size={11} />}</span>{inc ? 'Sissetulev' : 'Väljaminev'}</span></div>,
                  src: <div key="src" data-col className={styles.dt}>{sourceText(p)}</div>,
                  a: <div key="a" data-amount className={`${styles.num} ${styles.mono} ${inc ? styles.in : ''} ${isLive(p) ? '' : styles.numMut}`}>{inc ? '+' : '−'}{money(p.amount)}</div>,
                  s: <div key="s" data-col><Tag kind={PAY_ST[stKey(p)][1]}>{PAY_ST[stKey(p)][0]}</Tag></div>,
                };
                return (
                  <div key={p.id} ref={(el) => { if (el) rowRefs.current.set(p.id, el); else rowRefs.current.delete(p.id); }} className={`${styles.trow} ${p.id === selected?.id ? styles.trowOn : ''}`} onClick={() => { setSelectedId(p.id); setDetailOpen(true); }}>
                    {shownCols.map((c) => cell[c.id])}
                  </div>
                );
              })}
          </div>
          <div className={styles.tfoot}>
            <span>↑↓ liigu · Enter konteeri mustand</span>
            <div className={styles.tfootR}><button className={`${styles.btn} ${styles.sm} ${styles.ghost}`} onClick={exportRows} disabled={!visible.length}><Download size={13} />Ekspordi Excel</button></div>
          </div>
        </div>
        <Gutter panel={panel} />
        <div className={`${styles.card} ${styles.detailCard} ${detailOpen ? styles.detailCardOpen : ''}`}>
          <div className={styles.mobileBar}><button className={`${styles.btn} ${styles.ghost}`} onClick={() => setDetailOpen(false)}><ChevronLeft size={16} />Maksed</button></div>
          {selected ? (
            <PaymentDetailPanel
              p={selected} detail={detail} accounts={accounts} bankAccounts={bankAccounts} names={names}
              index={index} total={visible.length} onMove={move} busy={busy}
              reversing={reversing} reason={reason} reasonRef={reasonRef}
              onReason={setReason} onStartReverse={() => setReversing(true)} onCancelReverse={() => { setReversing(false); setReason(''); }}
              onPost={() => void post(selected)} onReverse={() => void reverse(selected)} onInvoiceChip={() => setInvoiceChip(selected.invoice_id)}
            />
          ) : <div className={styles.empty}>{loading ? '' : 'Vali makse'}</div>}
        </div>
      </div>

      {picking && <InvoicePicker onClose={() => setPicking(false)} onPick={(inv) => { setPicking(false); setRegistering(inv); }} />}
      {registering && (
        <RegisterPaymentDialog
          invoice={{ id: registering.id, invoice_number: registering.invoice_number, currency: registering.currency, open_amount: Number(registering.open_amount ?? Number(registering.total || 0) - Number(registering.paid_amount || 0)) }}
          direction={registering.type.startsWith('purchase') ? 'outgoing' : 'incoming'}
          onClose={() => setRegistering(null)}
          onRegistered={async () => { setRegistering(null); await load(); showToast.success('Makse registreeritud'); }}
        />
      )}
    </div>
  );
}

function JournalTable({ rows }: { rows: Array<{ label: string; debit: number; credit: number }> }) {
  return (
    <div className={styles.lines} style={{ '--lc': 'minmax(0,1fr) 88px 88px' } as CSSProperties}>
      <div className={styles.lhead}><div>Konto</div><div className={styles.r}>Deebet</div><div className={styles.r}>Kreedit</div></div>
      {rows.map((r, i) => <div key={i} className={styles.lrow}><div>{r.label}</div><div className={`${styles.a} ${styles.mono}`}>{r.debit ? amount(r.debit) : ''}</div><div className={`${styles.a} ${styles.mono}`}>{r.credit ? amount(r.credit) : ''}</div></div>)}
    </div>
  );
}
const accountLabel = (l: PaymentJournalLine) => [l.account_code, l.account_name].filter(Boolean).join(' ') || '—';
const entryLink = (id: string) => `/accounting/journal/${id}/edit`;

function PaymentDetailPanel({ p, detail, accounts, bankAccounts, names, index, total, onMove, busy, reversing, reason, reasonRef, onReason, onStartReverse, onCancelReverse, onPost, onReverse, onInvoiceChip }: {
  p: PaymentListItem; detail: PaymentDetail | null; accounts: AccountOption[]; bankAccounts: BankAccountRecord[]; names: Map<string, string>;
  index: number; total: number; onMove: (d: number) => void; busy: string | null;
  reversing: boolean; reason: string; reasonRef: RefObject<HTMLInputElement | null>;
  onReason: (v: string) => void; onStartReverse: () => void; onCancelReverse: () => void; onPost: () => void; onReverse: () => void; onInvoiceChip: () => void;
}) {
  const inc = p.direction === 'incoming';
  const st = stKey(p);
  const d = detail;
  const invTotal = Number(d?.invoice_total || 0), invPaid = Number(d?.invoice_paid_amount || 0), invOpen = Number(d?.invoice_open_amount || 0);
  const pct = invTotal ? Math.min(100, (invPaid / invTotal) * 100) : 0;
  const late = d?.due_date ? daysBetween(p.payment_date, d.due_date) : 0;
  const lines = d?.journal_lines || [];
  const entryRows = (id?: string | null) => lines.filter((l) => l.journal_entry_id === id).map((l) => ({ label: accountLabel(l), debit: l.debit, credit: l.credit }));

  // Draft: preview of the entry posting will create (money account ↔ receivables/payables).
  const preview = useMemo(() => {
    const bank = bankAccounts.find((b) => b.name === p.bank_account_name);
    const money = bank?.ledger_account_code ? `${bank.ledger_account_code} ${bank.ledger_account_name || bank.name}` : p.bank_account_name || p.payment_method_name || 'Pangakonto';
    const counter = accounts.find((a) => a.system_code === (inc ? 'AR' : 'AP')) || accounts.find((a) => a.code === (inc ? '1210' : '2110'));
    const other = counter ? `${counter.code} ${counter.name}` : inc ? 'Ostjate laekumata arved' : 'Võlad tarnijatele';
    const amt = Number(p.amount);
    return inc ? [{ label: money, debit: amt, credit: 0 }, { label: other, debit: 0, credit: amt }] : [{ label: other, debit: amt, credit: 0 }, { label: money, debit: 0, credit: amt }];
  }, [accounts, bankAccounts, inc, p]);

  const who = (email?: string | null) => (email ? personName(email, names) : '');
  const tl: Array<[string, 'tlDone' | 'tlWait' | 'tlBad', string]> = [[dateText(p.payment_date), 'tlDone', `Makse kuupäev${where(p) ? ` · ${where(p)}` : ''}`]];
  if (p.source === 'bank_import') tl.push([dateText(p.created_at), st === 'draft' ? 'tlWait' : 'tlDone', st === 'draft' ? 'Imporditud pangast, seotud arvega automaatselt' : 'Imporditud pangast']);
  else if (st === 'draft') tl.push([dateText(p.created_at), 'tlWait', `Loodud mustandina${who(d?.created_by_email) ? ` · ${who(d?.created_by_email)}` : ''}`]);
  if (st !== 'draft') tl.push([p.source === 'manual' ? dateText(p.created_at) : st === 'posted' ? dateText(p.updated_at) : '—', 'tlDone', `Konteeritud${p.source === 'manual' && who(d?.created_by_email) ? ` · ${who(d?.created_by_email)}` : ''}${p.journal_entry_number ? ` · ${p.journal_entry_number}` : ''}`]);
  if (st === 'reversed') tl.push([dateText(p.reversed_at), 'tlBad', `Tühistatud${p.reversal_reason ? ` · ${p.reversal_reason}` : ''}${who(d?.reversed_by_email) ? ` · ${who(d?.reversed_by_email)}` : ''}`]);

  return (
    <>
      <div className={styles.dhead}>
        <div className={styles.drow}>
          <div className={styles.tt}>
            <h2>{p.partner_name || 'Tundmatu partner'}</h2>
            <div className={styles.line}>{inc ? 'Sissetulev' : 'Väljaminev'} · <span className={styles.mono}>{dateText(p.payment_date)}</span>{where(p) ? ` · ${where(p)}` : ''}</div>
          </div>
          <div className={styles.amt}><b className={`${styles.mono} ${inc ? styles.in : ''}`}>{inc ? '+' : '−'}{money(p.amount)}</b></div>
        </div>
        <div className={styles.nav}>
          <Tag kind={PAY_ST[st][1]}>{PAY_ST[st][0]}</Tag>
          <button className={`${styles.btn} ${styles.sm}`} disabled={index <= 0} title="Eelmine (↑)" onClick={() => onMove(-1)}><ChevronLeft size={13} /></button>
          <button className={`${styles.btn} ${styles.sm}`} disabled={index < 0 || index >= total - 1} title="Järgmine (↓)" onClick={() => onMove(1)}><ChevronRight size={13} /></button>
        </div>
      </div>
      <div className={styles.dbody}>
        <div className={styles.sec}>
          <div className={styles.sech}>Seotud arve<span className={styles.sechR}><button className={styles.link} onClick={onInvoiceChip}>Kõik selle arve maksed</button></span></div>
          {d ? (
            <>
              <div className={styles.settle}>
                <div><div className={styles.settleK}>Arve kokku</div><div className={`${styles.settleV} ${styles.mono}`}>{money(invTotal)}</div></div>
                <div><div className={styles.settleK}>Tasutud</div><div className={`${styles.settleV} ${styles.mono}`}>{money(invPaid)}</div></div>
                <div><div className={styles.settleK}>Avatud</div><div className={`${styles.settleV} ${styles.mono} ${invOpen <= 0.004 ? styles.zero : ''}`}>{money(invOpen)}</div></div>
              </div>
              <div className={styles.bar}><i style={{ width: `${pct}%` }} /></div>
            </>
          ) : <div className={styles.empty} style={{ minHeight: 60 }}><Loader2 size={16} className="animate-spin" /></div>}
          <div className={`${styles.kv} ${styles.kvFirst}`}><span>Arve</span><b><Link href={`/invoices/${p.invoice_id}/preview`}>{invoiceLabel(p)} <ExternalLink size={10} style={{ display: 'inline' }} /></Link></b></div>
          <div className={styles.kv}><span>Arve olek</span><b>{INVOICE_STATUS[p.invoice_status || ''] || '—'}</b></div>
          <div className={styles.kv}><span>Tähtaeg</span><b className={styles.mono}>{dateText(d?.due_date)}{late > 0 && <span className={styles.lateText}> · makstud {late} p hiljem</span>}</b></div>
          {d?.payment_reference && <div className={styles.kv}><span>Viitenumber</span><b className={styles.mono}>{d.payment_reference}</b></div>}
          {p.reference && p.reference !== d?.payment_reference && <div className={styles.kv}><span>Selgitus</span><b title={p.reference}>{p.reference}</b></div>}
        </div>

        <div className={styles.sec}>
          <div className={styles.sech}>Kanne{p.journal_entry_id && <span className={styles.sechR}><Link href={entryLink(p.journal_entry_id)}>{p.journal_entry_number || 'Ava kanne'} <ExternalLink size={10} style={{ display: 'inline' }} /></Link></span>}</div>
          {st === 'draft' ? (
            <>
              <div className={`${styles.note} ${styles.noteMut} ${styles.noteFlat}`}><Info size={12} /><span>Kanne luuakse konteerimisel. Eelvaade:</span></div>
              <div className={styles.preview}><JournalTable rows={preview} /></div>
            </>
          ) : d ? <JournalTable rows={entryRows(p.journal_entry_id)} /> : null}
          {st === 'reversed' && (
            <>
              <div className={styles.sech} style={{ marginTop: 10 }}>Tühistav kanne{p.reversal_journal_entry_id && <span className={styles.sechR}><Link href={entryLink(p.reversal_journal_entry_id)}>{p.reversal_journal_entry_number || 'Ava kanne'} <ExternalLink size={10} style={{ display: 'inline' }} /></Link></span>}</div>
              {d && <JournalTable rows={entryRows(p.reversal_journal_entry_id)} />}
              <div className={`${styles.note} ${styles.noteBad}`}><Undo2 size={12} /><span>{p.reversal_reason || 'Põhjus märkimata'}. Arve on uuesti avatud summas {money(invOpen)}.</span></div>
            </>
          )}
        </div>

        <div className={`${styles.sec} ${styles.secLast}`}>
          <div className={styles.sech}>Ajalugu</div>
          <div className={styles.tl}>{tl.map(([date, cls, text], i) => <div key={i} className={`${styles.tlrow} ${styles[cls]}`}><span className={styles.mono}>{date}</span><span className={styles.bul} /><span title={text}>{text}</span></div>)}</div>
        </div>
      </div>

      <div className={styles.dfoot}>
        {st === 'draft' ? (
          <>
            <span className={styles.hint}>Konteerimisel märgitakse arve {d && invOpen - Number(p.amount) > 0.004 ? 'osaliselt tasutuks' : 'tasutuks'}</span>
            <div className={styles.dfootR}>
              {p.source === 'bank_import' && <Link className={styles.btn} href="/accounting/bank">Seo teise arvega</Link>}
              <button className={`${styles.btn} ${styles.primary}`} disabled={!!busy} onClick={onPost}>{busy === 'post' ? <Loader2 size={13} className="animate-spin" /> : <Stamp size={13} />}Konteeri <span className={styles.kbd}>Enter</span></button>
            </div>
          </>
        ) : st === 'posted' ? (
          reversing ? (
            <div className={styles.revbox}>
              <input ref={reasonRef} className={styles.inp} value={reason} onChange={(e) => onReason(e.target.value)} placeholder="Tühistamise põhjus (nähtav kandes)"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onReverse(); } else if (e.key === 'Escape') { e.preventDefault(); onCancelReverse(); } }} />
              <button className={styles.btn} onClick={onCancelReverse}>Loobu</button>
              <button className={`${styles.btn} ${styles.danger} ${styles.dangerBorder}`} disabled={!!busy} onClick={onReverse}>{busy === 'reverse' ? <Loader2 size={13} className="animate-spin" /> : <Undo2 size={13} />}Tühista</button>
            </div>
          ) : (
            <>
              <span className={styles.hint}>Tühistamine loob vastupidise kande ja avab arve uuesti</span>
              <div className={styles.dfootR}><button className={`${styles.btn} ${styles.danger}`} onClick={onStartReverse}><Undo2 size={13} />Tühista makse</button></div>
            </>
          )
        ) : (
          <span className={styles.hint}>Tühistatud {dateText(p.reversed_at)}{p.reversal_reason ? ` · ${p.reversal_reason}` : ''}</span>
        )}
      </div>
    </>
  );
}

/** "Registreeri makse": find the open invoice first, then the regular register-payment dialog. */
function InvoicePicker({ onClose, onPick }: { onClose: () => void; onPick: (inv: InvoiceListItem) => void }) {
  const [rows, setRows] = useState<InvoiceListItem[] | null>(null);
  const [q, setQ] = useState('');
  useEffect(() => {
    invoicesApi.listInvoices({ limit: 500 })
      .then((all) => setRows(all.filter((inv) => !['draft', 'cancelled', 'void', 'paid', 'pending_approval', 'rejected'].includes(inv.status) && Number(inv.open_amount ?? Number(inv.total || 0) - Number(inv.paid_amount || 0)) > 0.004)))
      .catch((e) => { showToast.error(getErrorMessage(e)); setRows([]); });
  }, []);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  const term = q.trim().toLocaleLowerCase('et');
  const shown = (rows || []).filter((inv) => !term || `${inv.invoice_number || ''} ${inv.partner_name || ''} ${inv.payment_reference || ''}`.toLocaleLowerCase('et').includes(term)).slice(0, 80);
  return (
    <div className={styles.modal} onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`${styles.mbox} ${styles.mboxMid}`}>
        <div className={styles.mhead}><div><h3>Registreeri makse</h3><div className={styles.line}>Vali arve, mille laekumist või tasumist registreerid. Summa, kuupäev ja makseviis järgmises sammus.</div></div><button className={`${styles.btn} ${styles.ghost}`} onClick={onClose}><X size={14} /></button></div>
        <div className={styles.mpad} style={{ borderBottom: '1px solid var(--a-border)' }}>
          <div className={styles.search} style={{ flex: 'none' }}><Search size={13} /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Otsi arve numbrit, partnerit või viitenumbrit" /></div>
        </div>
        <div className={styles.mbody}>
          {rows === null ? <div className={styles.empty}><Loader2 size={18} className="animate-spin" /></div>
            : shown.length === 0 ? <div className={styles.empty}>Avatud arveid ei leitud</div>
            : shown.map((inv) => (
              <button key={inv.id} className={styles.pickRow} onClick={() => onPick(inv)}>
                <span><b>{inv.partner_name || 'Tundmatu partner'}</b><span className={styles.s}>{INVOICE_TYPE[inv.type] || 'Arve'} <span className={styles.mono}>{inv.invoice_number}</span></span></span>
                <span className={`${styles.mono} ${styles.dt}`}>{inv.due_date ? `tähtaeg ${dateText(inv.due_date)}` : ''}</span>
                <span className={`${styles.mono} ${styles.r}`} style={{ fontWeight: 600 }}>{money(inv.open_amount ?? Number(inv.total || 0) - Number(inv.paid_amount || 0))}</span>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
