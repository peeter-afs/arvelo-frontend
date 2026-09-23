'use client';

/**
 * Purchase invoices — dense list, approvals, payment order, detail panel with original viewer.
 * Implements docs2/design_handoff_purchase_invoices (Estonian copy is final, hardcoded like the sales list).
 */

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { Bell, CalendarDays, ChevronDown, Columns3, Loader2, Paperclip, Plus, RefreshCw, Search, Upload } from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';
import { accountingApi, type AccountOption, type JournalEntryRecord, type PartnerRecord, type SupplierBankAccount } from '@/lib/api/accounting.api';
import { bankingApi, type BankAccountRecord, type MissingReceiptSettings, type PaymentBatchLine, type PaymentBatchListItem, type PaymentBatchPrefillLine } from '@/lib/api/banking.api';
import { importApi, type PurchaseInvoiceImportListItem } from '@/lib/api/import.api';
import { invoicesApi, type InvoiceDetail, type InvoiceLine, type InvoiceListItem, type ReceiptReminder } from '@/lib/api/invoices.api';
import { paymentsApi, type PaymentListItem } from '@/lib/api/payments.api';
import { tenantsApi, type TenantMember } from '@/lib/api/tenants.api';
import { costCentersApi, projectsApi, type CostCenter, type Project } from '@/lib/api/dimensions.api';
import { showToast } from '@/components/ui/Toast';
import styles from './PurchaseInvoiceWorkspace.module.css';

const PdfViewer = dynamic(() => import('./PdfViewer'), { ssr: false });

type StKey = 'draft' | 'pend' | 'rej' | 'ok' | 'part' | 'over' | 'paid' | 'void';
type SrcKey = 'eai' | 'pdf' | 'man' | 'bank' | 'csv';
type TabKey = 'all' | 'draft' | 'pend' | 'topay' | 'over' | 'paid' | 'rej' | 'void';
type PeriodKey = 'month' | 'prev' | 'quarter' | '90' | 'year' | 'all' | 'custom';
type ColumnId = 'ck' | 'nr' | 'sup' | 'sinv' | 'acc' | 'ccp' | 'total' | 'open' | 'issued' | 'due' | 'paydate' | 'appr' | 'st';
type MenuKey = 'more' | 'period' | 'src' | 'vat' | 'columns' | 'export' | 'upload' | null;
type PTab = 'lines' | 'pdf';
type Zoom = 'fit' | number;
type BatchRef = { batch: PaymentBatchListItem; line: PaymentBatchLine };
type Modal = { kind: 'journal' } | { kind: 'pay'; ids: string[] } | null;

const DAY = 86_400_000;
const DEFAULT_PANEL_WIDTH = 420, MIN_PANEL = 380, MIN_LIST = 560, SHELL_MIN = 1180;
const KEYS = { pw: 'arvelo.pinv.pw', cols: 'arvelo.pinv.cols', hidden: 'arvelo.pinv.hidden' };
const DEFAULT_HIDDEN: ColumnId[] = ['acc', 'ccp', 'issued', 'paydate'];
const COLUMNS: Array<{ id: ColumnId; label: string; width: number; flex?: boolean; locked?: boolean; right?: boolean }> = [
  { id: 'ck', label: '', width: 30, locked: true }, { id: 'nr', label: 'Nr', width: 96 }, { id: 'sup', label: 'Tarnija', width: 220, flex: true }, { id: 'sinv', label: 'Tarnija arve', width: 112 },
  { id: 'acc', label: 'Kulukonto', width: 140 }, { id: 'ccp', label: 'Kulukoht / projekt', width: 140 }, { id: 'total', label: 'Summa', width: 90, right: true }, { id: 'open', label: 'Tasumata', width: 86, right: true },
  { id: 'issued', label: 'Arve kp', width: 84 }, { id: 'due', label: 'Tähtaeg', width: 112 }, { id: 'paydate', label: 'Makstud', width: 84 }, { id: 'appr', label: 'Kinnitaja', width: 92 }, { id: 'st', label: 'Staatus', width: 128 },
];
const TABS: Array<[TabKey, string]> = [['all', 'Kõik'], ['draft', 'Mustand'], ['pend', 'Ootab kinnitust'], ['topay', 'Maksmisele'], ['over', 'Üle tähtaja']];
const MORE_TABS: Array<[TabKey, string]> = [['paid', 'Makstud'], ['rej', 'Tagasi lükatud'], ['void', 'Tühistatud']];
const PERIODS: Array<[PeriodKey, string]> = [['month', 'Käesolev kuu'], ['prev', 'Eelmine kuu'], ['quarter', 'Käesolev kvartal'], ['90', 'Viimased 90 päeva'], ['year', 'Käesolev aasta'], ['all', 'Kõik ajad']];
const ST: Record<StKey, { label: string; cls: string; snr: string }> = {
  draft: { label: 'Mustand', cls: styles.draft, snr: styles.snrDraft }, pend: { label: 'Ootab kinnitust', cls: styles.pend, snr: styles.snrPend }, rej: { label: 'Tagasi lükatud', cls: styles.rej, snr: styles.snrRej },
  ok: { label: 'Kinnitatud', cls: styles.ok, snr: styles.snrOk }, part: { label: 'Osaliselt makstud', cls: styles.part, snr: styles.snrPart }, over: { label: 'Üle tähtaja', cls: styles.overdue, snr: styles.snrOver },
  paid: { label: 'Makstud', cls: styles.paid, snr: styles.snrPaid }, void: { label: 'Tühistatud', cls: styles.void, snr: styles.snrVoid },
};
const SRC: Record<SrcKey, { l: string; d: string }> = { eai: { l: 'E-arve', d: 'Operaatori kaudu' }, pdf: { l: 'PDF', d: 'Üles laaditud / skaneeritud' }, man: { l: 'Käsitsi', d: 'Sisestatud käsitsi' }, bank: { l: 'Pank', d: 'Pangatehingust loodud mustand' }, csv: { l: 'CSV', d: 'Bolt / CSV import' } };
const VAT_CODES = [{ key: 'all', label: 'Kõik käibemaksukoodid', short: 'kõik' }, { key: 'd24', label: 'Siseriiklik 24%', short: '24%' }, { key: 'd22', label: 'Siseriiklik 22%', short: '22%' }, { key: 'd9', label: 'Siseriiklik 9%', short: '9%' }, { key: 'eus', label: 'EU teenus (pöördmaks)', short: 'EU teenus' }, { key: 'ex', label: 'Maksuvaba', short: 'Maksuvaba' }];
const OPEN_BATCH_STATUSES = new Set(['draft', 'generated', 'uploaded', 'submitted', 'pending', 'confirmed']);

function money(value: number | string | null | undefined, currency = 'EUR') { return new Intl.NumberFormat('et-EE', { style: 'currency', currency, minimumFractionDigits: 2 }).format(Number(value || 0)); }
function dateText(value?: string | Date | null) { if (!value) return '—'; const d = new Date(value); return Number.isNaN(+d) ? String(value) : new Intl.DateTimeFormat('et-EE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d); }
function shortDate(value?: string | Date | null) { if (!value) return '—'; const d = new Date(value); return Number.isNaN(+d) ? '—' : new Intl.DateTimeFormat('et-EE', { day: '2-digit', month: '2-digit' }).format(d); }
function startOfDay(d: Date) { const v = new Date(d); v.setHours(0, 0, 0, 0); return v; }
function daysBetween(a: Date, b: Date) { return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / DAY); }
function initials(name: string) { return name.split(/\s+/).filter((w) => w.length > 2).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'A'; }
function shortInitials(name: string) { return name.split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?'; }
function hue(name: string) { let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360; return h; }
function downloadBlob(blob: Blob, name: string) { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }
function openAmount(inv: InvoiceListItem) { return Number(inv.open_amount ?? Number(inv.total || 0) - Number(inv.paid_amount || 0)); }
function lateDays(inv: InvoiceListItem) { return inv.due_date ? daysBetween(new Date(), new Date(inv.due_date)) : 0; }
function stKey(inv: InvoiceListItem): StKey {
  const s = inv.status;
  if (s === 'cancelled' || s === 'void') return 'void';
  if (s === 'draft') return 'draft';
  if (s === 'pending_approval') return 'pend';
  if (s === 'rejected') return 'rej';
  if (s === 'paid' || (openAmount(inv) < 0.005 && s !== 'approved')) return 'paid';
  if (openAmount(inv) > 0.005 && lateDays(inv) > 0) return 'over';
  if (s === 'partially_paid' || Number(inv.paid_amount || 0) > 0.005) return 'part';
  return 'ok';
}
const isOpenSt = (k: StKey) => k === 'ok' || k === 'over' || k === 'part';
const payable = (inv: InvoiceListItem) => isOpenSt(stKey(inv)) && openAmount(inv) > 0.005;
function srcKey(inv: InvoiceListItem): SrcKey {
  const s = String(inv.source || '').toLowerCase();
  if (s.includes('bank')) return 'bank';
  if (s.includes('csv') || s.includes('bolt')) return 'csv';
  if (s.includes('einvoice') || s.includes('peppol') || s.includes('gateway') || s.includes('e-arve')) return 'eai';
  if (s.includes('pdf') || s.includes('ocr') || s.includes('openai') || s.includes('import')) return 'pdf';
  return 'man';
}
function partnerName(inv: InvoiceListItem, partners: Map<string, PartnerRecord>) { return inv.partner_name || partners.get(inv.partner_id || '')?.name || 'Tundmatu tarnija'; }
function hasVatCode(inv: InvoiceListItem, key: string) { return key === 'all' || (inv.vat_codes || []).some((c) => c.key === key); }
function vatText(inv: InvoiceListItem) { return inv.vat_codes?.length ? inv.vat_codes.map((c) => VAT_CODES.find((v) => v.key === c.key)?.short || `${c.rate}%`).join(', ') : '—'; }
function vatLabel(inv: InvoiceListItem) { return inv.vat_codes?.length ? inv.vat_codes.map((c) => VAT_CODES.find((v) => v.key === c.key)?.label || `${c.rate}%`).join(', ') : '—'; }
function paymentTerms(inv: InvoiceListItem) { return inv.due_date ? Math.max(0, daysBetween(new Date(inv.due_date), new Date(inv.invoice_date))) : 0; }
function memberName(m?: TenantMember) { return m ? m.user.name || m.user.email : ''; }
const metaStr = (meta: Record<string, unknown> | null | undefined, key: string) => (typeof meta?.[key] === 'string' ? (meta[key] as string) : '');

export default function PurchaseInvoiceWorkspace() {
  const rootRef = useRef<HTMLDivElement>(null); const searchRef = useRef<HTMLInputElement>(null); const rowRefs = useRef(new Map<string, HTMLDivElement>()); const fileRef = useRef<HTMLInputElement>(null); const [pdfBox, setPdfBox] = useState<HTMLDivElement | null>(null);
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]); const [partners, setPartners] = useState<PartnerRecord[]>([]); const [details, setDetails] = useState<Record<string, InvoiceDetail>>({}); const [payments, setPayments] = useState<PaymentListItem[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]); const [members, setMembers] = useState<TenantMember[]>([]); const [batches, setBatches] = useState<Map<string, BatchRef>>(new Map()); const [imports, setImports] = useState<Map<string, PurchaseInvoiceImportListItem>>(new Map());
  const [bankAccounts, setBankAccounts] = useState<BankAccountRecord[]>([]); const [receiptSettings, setReceiptSettings] = useState<MissingReceiptSettings | null>(null); const [supplierIban, setSupplierIban] = useState<Record<string, SupplierBankAccount | null>>({});
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]); const [projects, setProjects] = useState<Project[]>([]); const [reminders, setReminders] = useState<Record<string, ReceiptReminder[]>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null); const [checked, setChecked] = useState<Set<string>>(new Set()); const [tab, setTab] = useState<TabKey>('all'); const [query, setQuery] = useState(''); const [period, setPeriod] = useState<PeriodKey>('90'); const [dateFrom, setDateFrom] = useState(''); const [dateTo, setDateTo] = useState(''); const [vat, setVat] = useState('all'); const [src, setSrc] = useState<SrcKey | 'all'>('all');
  const [sort, setSort] = useState<ColumnId>('nr'); const [direction, setDirection] = useState<1 | -1>(-1); const [menu, setMenu] = useState<MenuKey>(null); const [wide, setWide] = useState(false); const [mode, setMode] = useState<'list' | 'open'>('list'); const [ptab, setPtab] = useState<PTab>('lines'); const [zoom, setZoom] = useState<Zoom>('fit'); const [fitZoom, setFitZoom] = useState(1); const [pdfPages, setPdfPages] = useState(0);
  const [loading, setLoading] = useState(true); const [detailLoading, setDetailLoading] = useState(false); const [action, setAction] = useState<string | null>(null); const [error, setError] = useState<string | null>(null); const [dragOver, setDragOver] = useState(false);
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH); const [panelDragging, setPanelDragging] = useState(false); const [widths, setWidths] = useState<Partial<Record<ColumnId, number>>>({}); const [hidden, setHidden] = useState<ColumnId[]>(DEFAULT_HIDDEN);
  const [modal, setModal] = useState<Modal>(null); const [journal, setJournal] = useState<JournalEntryRecord | null>(null); const [journalLoading, setJournalLoading] = useState(false);
  const [docUrls, setDocUrls] = useState<Record<string, string>>({});

  const loadInvoices = useCallback(async (preferred?: string | null) => {
    setError(null);
    try {
      const [normal, credits] = await Promise.all([invoicesApi.listInvoices({ type: 'purchase_invoice', limit: 300 }), invoicesApi.listInvoices({ type: 'purchase_credit_note', limit: 100 })]);
      const rows = [...normal, ...credits]; setInvoices(rows);
      setSelectedId((current) => (preferred && rows.some((r) => r.id === preferred) ? preferred : current && rows.some((r) => r.id === current) ? current : rows[0]?.id || null));
    } catch (e) { setError(getErrorMessage(e)); } finally { setLoading(false); }
  }, []);
  const loadBatches = useCallback(async () => {
    try {
      const list = await bankingApi.listPaymentBatches({ limit: 40 });
      const open = list.items.filter((b) => OPEN_BATCH_STATUSES.has(String(b.status))).slice(0, 12);
      const map = new Map<string, BatchRef>();
      await Promise.all(open.map(async (b) => { const full = await bankingApi.getPaymentBatch(b.id).catch(() => null); full?.lines?.forEach((line) => { if (line.invoice_id) map.set(line.invoice_id, { batch: full.batch, line }); }); }));
      setBatches(map);
    } catch { /* payment batches are optional context */ }
  }, []);
  useEffect(() => {
    void loadInvoices(); void loadBatches();
    accountingApi.listPartners({ is_active: true }).then(setPartners).catch(() => {});
    accountingApi.getAccounts().then(setAccounts).catch(() => {});
    bankingApi.listBankAccounts().then(setBankAccounts).catch(() => {});
    bankingApi.getMissingReceiptSettings().then((s) => setReceiptSettings(s as MissingReceiptSettings)).catch(() => {});
    importApi.listPurchaseInvoiceImports({ limit: 500 }).then((res) => setImports(new Map(res.items.filter((r) => r.draft_invoice_id && r.document_id).map((r) => [r.draft_invoice_id!, r])))).catch(() => {});
    costCentersApi.list({ include_inactive: true }).then(setCostCenters).catch(() => {}); projectsApi.list({ include_inactive: true }).then(setProjects).catch(() => {});
    try { setWidths(JSON.parse(localStorage.getItem(KEYS.cols) || '{}')); const h = JSON.parse(localStorage.getItem(KEYS.hidden) || 'null'); if (Array.isArray(h)) setHidden(h); setPanelWidth(Number(localStorage.getItem(KEYS.pw)) || DEFAULT_PANEL_WIDTH); } catch {}
  }, [loadInvoices, loadBatches]);
  const tenantId = useRef<string | null>(null);
  useEffect(() => { import('@/lib/stores/auth.store').then(({ useAuthStore }) => { const id = useAuthStore.getState().tenant?.id || null; tenantId.current = id; if (id) tenantsApi.getMembers(id).then(setMembers).catch(() => {}); }); }, []);
  useEffect(() => { if (!selectedId || details[selectedId]) return; let live = true; setDetailLoading(true); invoicesApi.getInvoice(selectedId).then((d) => { if (live) setDetails((old) => ({ ...old, [selectedId]: d })); }).catch((e) => live && setError(getErrorMessage(e))).finally(() => live && setDetailLoading(false)); return () => { live = false; }; }, [selectedId, details]);
  useEffect(() => { const inv = selectedId ? invoices.find((r) => r.id === selectedId) : null; if (!inv || srcKey(inv) !== 'bank' || reminders[inv.id]) return; let live = true; invoicesApi.listReceiptReminders(inv.id).then((rows) => { if (live) setReminders((m) => ({ ...m, [inv.id]: rows })); }).catch(() => {}); return () => { live = false; }; }, [selectedId, invoices, reminders]);
  useEffect(() => { if (!selectedId) { setPayments([]); return; } let live = true; paymentsApi.listPayments({ invoice_id: selectedId, limit: 20 }).then((rows) => { if (live) setPayments(rows); }).catch(() => {}); return () => { live = false; }; }, [selectedId]);
  useEffect(() => { const close = (e: PointerEvent) => { const t = e.target as Element; if (!t.closest(`.${styles.relative}`) && !t.closest(`.${styles.split}`)) setMenu(null); }; window.addEventListener('pointerdown', close); return () => window.removeEventListener('pointerdown', close); }, []);

  const partnerMap = useMemo(() => new Map(partners.map((p) => [p.id, p])), [partners]);
  const memberMap = useMemo(() => new Map(members.map((m) => [m.user.id, m])), [members]);
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const ccMap = useMemo(() => new Map(costCenters.map((c) => [c.id, c])), [costCenters]); const prjMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const range = useMemo<[Date | null, Date | null]>(() => { const now = new Date(), y = now.getFullYear(), m = now.getMonth(); if (period === 'custom') return [dateFrom ? new Date(`${dateFrom}T00:00:00`) : null, dateTo ? new Date(`${dateTo}T23:59:59`) : null]; if (period === 'month') return [new Date(y, m, 1), new Date(y, m + 1, 0, 23, 59, 59)]; if (period === 'prev') return [new Date(y, m - 1, 1), new Date(y, m, 0, 23, 59, 59)]; if (period === 'quarter') { const q = Math.floor(m / 3) * 3; return [new Date(y, q, 1), new Date(y, q + 3, 0, 23, 59, 59)]; } if (period === 'year') return [new Date(y, 0, 1), new Date(y, 11, 31, 23, 59, 59)]; if (period === '90') return [new Date(startOfDay(now).getTime() - 90 * DAY), now]; return [null, null]; }, [period, dateFrom, dateTo]);
  // Payable invoices are always shown regardless of period: an unpaid bill must never disappear.
  const inPeriod = useCallback((inv: InvoiceListItem) => { const d = new Date(inv.invoice_date); if (range[0] && d < range[0] && !payable(inv)) return false; if (range[1] && d > range[1]) return false; return true; }, [range]);
  const matchesTab = useCallback((inv: InvoiceListItem, key: TabKey) => { const k = stKey(inv); if (key === 'all') return true; if (key === 'topay') return payable(inv); if (key === 'over') return k === 'over'; return k === key; }, []);
  const periodInvoices = useMemo(() => invoices.filter(inPeriod), [invoices, inPeriod]);
  const tabCount = useCallback((key: TabKey) => periodInvoices.filter((r) => matchesTab(r, key)).length, [periodInvoices, matchesTab]);
  const baseFiltered = useMemo(() => periodInvoices.filter((r) => matchesTab(r, tab)), [periodInvoices, matchesTab, tab]);
  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('et');
    return baseFiltered.filter((r) => hasVatCode(r, vat) && (src === 'all' || srcKey(r) === src) && (!q || `${r.invoice_number || ''} ${partnerName(r, partnerMap)} ${r.payment_reference || ''}`.toLocaleLowerCase('et').includes(q)))
      .sort((a, b) => { let av: string | number = '', bv: string | number = ''; if (sort === 'nr' || sort === 'sinv') { av = a.invoice_number || ''; bv = b.invoice_number || ''; } else if (sort === 'sup') { av = partnerName(a, partnerMap); bv = partnerName(b, partnerMap); } else if (sort === 'total') { av = Number(a.total); bv = Number(b.total); } else if (sort === 'open') { av = openAmount(a); bv = openAmount(b); } else if (sort === 'issued') { av = +new Date(a.invoice_date); bv = +new Date(b.invoice_date); } else if (sort === 'due') { av = +(a.due_date ? new Date(a.due_date) : 0); bv = +(b.due_date ? new Date(b.due_date) : 0); } else if (sort === 'paydate') { av = +(batches.get(a.id)?.batch.execution_date ? new Date(batches.get(a.id)!.batch.execution_date!) : 0); bv = +(batches.get(b.id)?.batch.execution_date ? new Date(batches.get(b.id)!.batch.execution_date!) : 0); } else if (sort === 'appr') { av = memberName(memberMap.get(a.approved_by_user_id || '')); bv = memberName(memberMap.get(b.approved_by_user_id || '')); } else if (sort === 'st') { av = ST[stKey(a)].label; bv = ST[stKey(b)].label; } const r = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv), 'et', { numeric: true }); return r * direction; });
  }, [baseFiltered, vat, src, query, sort, direction, partnerMap, batches, memberMap]);
  useEffect(() => { if (selectedId && !visible.some((r) => r.id === selectedId)) setSelectedId(visible[0]?.id || null); }, [visible, selectedId]);
  const selected = selectedId ? invoices.find((r) => r.id === selectedId) || null : null; const detail = selectedId ? details[selectedId] || null : null;
  useEffect(() => { const pid = selected?.partner_id; if (!pid || supplierIban[pid] !== undefined) return; accountingApi.getSupplierBankAccounts(pid).then((rows) => setSupplierIban((m) => ({ ...m, [pid]: rows.find((r) => r.is_default && r.is_active) || rows.find((r) => r.is_active) || null }))).catch(() => setSupplierIban((m) => ({ ...m, [pid]: null }))); }, [selected?.partner_id, supplierIban]);
  const metrics = useMemo(() => { const pay = periodInvoices.filter(payable); return { topay: pay.reduce((n, r) => n + openAmount(r), 0), over: pay.filter((r) => lateDays(r) > 0).reduce((n, r) => n + openAmount(r), 0), week: pay.filter((r) => lateDays(r) <= 0 && lateDays(r) >= -7).reduce((n, r) => n + openAmount(r), 0) }; }, [periodInvoices]);
  const pending = useMemo(() => periodInvoices.filter((r) => stKey(r) === 'pend'), [periodInvoices]);
  const totals = useMemo(() => visible.reduce((v, r) => ({ net: v.net + Number(r.subtotal || 0), vat: v.vat + Number(r.tax_amount || 0), total: v.total + Number(r.total || 0), open: v.open + (payable(r) ? openAmount(r) : 0) }), { net: 0, vat: 0, total: 0, open: 0 }), [visible]);
  const checkedRows = useMemo(() => invoices.filter((r) => checked.has(r.id)), [invoices, checked]);
  const checkedPayable = checkedRows.filter((r) => payable(r) && !batches.has(r.id)); const checkedPending = checkedRows.filter((r) => stKey(r) === 'pend');
  const shownColumns = COLUMNS.filter((c) => !hidden.includes(c.id)); const columnTemplate = shownColumns.map((c) => (widths[c.id] ? `${widths[c.id]}px` : c.flex ? 'minmax(120px,1fr)' : `${c.width}px`)).join(' ');
  const workspaceStyle = { '--columns': columnTemplate, '--panel-width': `${panelWidth}px` } as CSSProperties;
  const docFor = (inv: InvoiceListItem | null) => (inv ? imports.get(inv.id) || null : null);
  const selectedDoc = docFor(selected);

  /* ── original document: fetch once per document id ── */
  useEffect(() => {
    const doc = selectedDoc; if (!doc?.document_id || docUrls[doc.document_id] || ptab !== 'pdf') return;
    let live = true; const id = doc.document_id;
    importApi.downloadDocument(id).then((blob) => { if (live) setDocUrls((m) => ({ ...m, [id]: URL.createObjectURL(blob) })); }).catch((e) => live && showToast.error(getErrorMessage(e)));
    return () => { live = false; };
  }, [selectedDoc, docUrls, ptab]);
  useEffect(() => () => { Object.values(docUrls).forEach((u) => URL.revokeObjectURL(u)); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!pdfBox) return; const fit = () => setFitZoom(Math.max(0.3, (pdfBox.clientWidth - 2) / 600)); fit(); const ro = new ResizeObserver(fit); ro.observe(pdfBox); return () => ro.disconnect(); }, [pdfBox]);
  const zoomValue = zoom === 'fit' ? fitZoom : zoom;
  const stepZoom = (dir: 1 | -1) => setZoom((z) => Math.min(3, Math.max(0.3, Math.round(((z === 'fit' ? fitZoom : z) + dir * 0.25) * 4) / 4)));

  const selectRelative = useCallback((delta: number) => { if (!visible.length) return; const i = visible.findIndex((r) => r.id === selectedId); const next = visible[Math.max(0, Math.min(visible.length - 1, (i < 0 ? 0 : i) + delta))]; if (next) { setSelectedId(next.id); requestAnimationFrame(() => rowRefs.current.get(next.id)?.scrollIntoView({ block: 'nearest' })); } }, [visible, selectedId]);
  const toggleChecked = useCallback((id: string) => setChecked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; }), []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement; if (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
      if (e.key === '/') { e.preventDefault(); searchRef.current?.focus(); }
      else if (e.key.toLowerCase() === 'u' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); window.location.assign('/invoices/new?type=purchase_invoice'); }
      else if (e.key === 'j' || (e.key === 'ArrowDown' && mode === 'list')) { e.preventDefault(); selectRelative(1); }
      else if (e.key === 'k' || (e.key === 'ArrowUp' && mode === 'list')) { e.preventDefault(); selectRelative(-1); }
      else if (e.key === 'x' && selectedId) { e.preventDefault(); toggleChecked(selectedId); }
      else if (e.key === 'Enter' && selectedId) { e.preventDefault(); setMode((v) => (v === 'list' ? 'open' : 'list')); setMenu(null); }
      else if (e.key === 'Escape') { if (modal) setModal(null); else if (mode === 'open') setMode('list'); else if (checked.size) setChecked(new Set()); else setMenu(null); }
      else if (ptab === 'pdf' && (e.key === '+' || e.key === '=')) { e.preventDefault(); stepZoom(1); }
      else if (ptab === 'pdf' && e.key === '-') { e.preventDefault(); stepZoom(-1); }
      else if (ptab === 'pdf' && e.key === '0') { e.preventDefault(); setZoom('fit'); }
    };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, [selectRelative, selectedId, mode, modal, checked.size, ptab, toggleChecked]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── actions ── */
  const run = async (key: string, fn: () => Promise<void>) => { setAction(key); setError(null); try { await fn(); } catch (e) { const m = getErrorMessage(e); setError(m); showToast.error(m); } finally { setAction(null); } };
  const patchInvoice = (id: string, patch: Partial<InvoiceListItem>) => { setInvoices((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r))); setDetails((old) => { const n = { ...old }; delete n[id]; return n; }); };
  const submit = (inv: InvoiceListItem) => run(`submit:${inv.id}`, async () => { const r = await invoicesApi.submitApproval(inv.id); patchInvoice(inv.id, r.invoice); showToast.success('Saadetud kinnitamiseks'); });
  const approve = (inv: InvoiceListItem) => run(`approve:${inv.id}`, async () => {
    const approved = await invoicesApi.approve(inv.id); patchInvoice(inv.id, approved.invoice);
    try { const confirmed = await invoicesApi.confirm(inv.id); patchInvoice(inv.id, confirmed.invoice); const entry = await accountingApi.getJournalEntry(confirmed.journal_entry_id).catch(() => null); showToast.success(`Arve ${inv.invoice_number || ''} kinnitatud · kanne ${entry?.entry_number || 'loodud'}`); }
    catch (e) { showToast.error(`Arve kinnitatud, kuid kannet ei tekkinud: ${getErrorMessage(e)}`); }
  });
  const bulkApprove = () => run('bulk-approve', async () => { for (const inv of checkedPending) { const a = await invoicesApi.approve(inv.id); patchInvoice(inv.id, a.invoice); try { const c = await invoicesApi.confirm(inv.id); patchInvoice(inv.id, c.invoice); } catch { /* stays approved */ } } setChecked(new Set()); showToast.success(`${checkedPending.length} arvet kinnitatud`); });
  const reject = (inv: InvoiceListItem) => { const why = window.prompt('Tagasilükkamise põhjus', 'Summa ei klapi tellimusega'); if (why === null) return; void run(`reject:${inv.id}`, async () => { const r = await invoicesApi.reject(inv.id, why || undefined); patchInvoice(inv.id, r.invoice); showToast.success(`Arve ${inv.invoice_number || ''} tagasi lükatud`); }); };
  const remindNow = (inv: InvoiceListItem) => run(`remind:${inv.id}`, async () => { const r = await invoicesApi.sendReceiptReminder(inv.id); setReminders((m) => { const n = { ...m }; delete n[inv.id]; return n; }); await loadInvoices(inv.id); showToast.success(`Meeldetuletus ${r.reminder_number} saadetud · ${r.sent_to}`); });
  const noDoc = (inv: InvoiceListItem) => run(`nodoc:${inv.id}`, async () => { if (!inv.bank_transaction_id) throw new Error('Pangatehing pole seotud'); await bankingApi.dismissMissingReceipt(inv.bank_transaction_id, { reason: 'Originaali ei tule' }); await loadInvoices(inv.id); showToast.success('Meeldetuletused peatatud · kanne tehakse ilma originaalita'); });
  const uploadFiles = (files: FileList | File[]) => { const list = Array.from(files); if (!list.length) return; void run('upload', async () => { for (const f of list) { if (/csv$/i.test(f.name)) await importApi.importBoltCsv(f); else await importApi.uploadPurchaseInvoicePdf(f); } showToast.success(list.length === 1 ? `${list[0].name} laaditud üles — tuvastame andmed` : `${list.length} faili laaditud üles`); await loadInvoices(selectedId); importApi.listPurchaseInvoiceImports({ limit: 500 }).then((res) => setImports(new Map(res.items.filter((r) => r.draft_invoice_id && r.document_id).map((r) => [r.draft_invoice_id!, r])))).catch(() => {}); }); };
  const openJournal = async (inv: InvoiceListItem) => { if (!inv.journal_entry_id) return; setJournalLoading(true); setModal({ kind: 'journal' }); try { setJournal(await accountingApi.getJournalEntry(inv.journal_entry_id)); } catch (e) { showToast.error(getErrorMessage(e)); setModal(null); } finally { setJournalLoading(false); } };
  const exportRows = async (format: 'xlsx' | 'csv' | 'pdf') => { setMenu(null); const data = visible.map((r) => ({ Nr: r.invoice_number || r.id, Tarnija: partnerName(r, partnerMap), Summa: Number(r.total), Tasumata: payable(r) ? openAmount(r) : 0, 'Arve kp': dateText(r.invoice_date), Tähtaeg: dateText(r.due_date), Staatus: ST[stKey(r)].label, Allikas: SRC[srcKey(r)].l })); if (format === 'xlsx') { const XLSX = await import('xlsx'); const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(data), 'Ostuarved'); XLSX.writeFile(book, 'ostuarved.xlsx'); } else if (format === 'csv') { const XLSX = await import('xlsx'); const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(data), { FS: ';' }); downloadBlob(new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' }), 'ostuarved.csv'); } else { const { jsPDF } = await import('jspdf'); const doc = new jsPDF(); doc.setFontSize(14); doc.text('Ostuarved', 14, 16); doc.setFontSize(9); data.slice(0, 55).forEach((r, i) => doc.text(`${r.Nr}  ${r.Tarnija}  ${money(r.Summa)}`, 14, 25 + i * 4.5)); doc.save('ostuarved.pdf'); } };
  const resizeColumn = (id: ColumnId, e: ReactPointerEvent) => { e.stopPropagation(); e.preventDefault(); const start = e.clientX, current = widths[id] || COLUMNS.find((c) => c.id === id)!.width; const move = (ev: PointerEvent) => setWidths((old) => ({ ...old, [id]: Math.max(40, current + ev.clientX - start) })); const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); setWidths((v) => { localStorage.setItem(KEYS.cols, JSON.stringify(v)); return v; }); }; window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); };
  const resizePanel = (e: ReactPointerEvent) => { e.preventDefault(); const start = e.clientX, current = panelWidth, shell = Math.max(SHELL_MIN, rootRef.current?.clientWidth || SHELL_MIN); setPanelDragging(true); const move = (ev: PointerEvent) => setPanelWidth(Math.max(MIN_PANEL, Math.min(shell - 9 - MIN_LIST, current + start - ev.clientX))); const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); setPanelDragging(false); setPanelWidth((v) => { localStorage.setItem(KEYS.pw, String(v)); return v; }); }; window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); };
  const setSortColumn = (id: ColumnId) => { if (id === 'ck') return; if (sort === id) setDirection((v) => (v === 1 ? -1 : 1)); else { setSort(id); setDirection(1); } };
  const setHiddenPersist = (next: ColumnId[]) => { setHidden(next); localStorage.setItem(KEYS.hidden, JSON.stringify(next)); };
  const openPdf = (id: string) => { setSelectedId(id); setPtab('pdf'); };
  const periodLabel = period === 'custom' ? `${dateText(dateFrom)} – ${dateText(dateTo)}` : PERIODS.find((p) => p[0] === period)?.[1] || 'Kohandatud';
  const rangeLabel = range[0] && range[1] ? `${dateText(range[0])} – ${dateText(range[1])}` : 'kõik ajad';
  const allVisibleChecked = visible.length > 0 && visible.every((r) => checked.has(r.id));

  const ctx: Ctx = { partnerMap, memberMap, accountMap, ccMap, prjMap, batches, imports, payments, reminders, supplierIban, receiptSettings, action, docUrls, zoom, zoomValue, fitZoom, pdfPages, ptab, wide, visible, selectedId, setPtab, setZoom, stepZoom, setPdfPages, onNavigate: selectRelative, onWide: () => setWide((v) => !v), onOpen: () => setMode('open'), onClose: () => setMode('list'), onJournal: (inv) => void openJournal(inv), submit, approve, reject, remindNow, noDoc, upload: () => fileRef.current?.click(), pay: (ids) => setModal({ kind: 'pay', ids }), downloadDoc: (inv) => { const d = docFor(inv); const u = d?.document_id ? docUrls[d.document_id] : null; if (u) { const a = document.createElement('a'); a.href = u; a.download = d?.file_name || 'originaal'; a.click(); } } };

  return <div ref={rootRef} className={`${styles.workspace} ${styles.relativeCard}`} style={workspaceStyle}
    onDragOver={(e) => { if (e.dataTransfer.types.includes('Files')) { e.preventDefault(); setDragOver(true); } }} onDragLeave={(e) => { if (e.currentTarget === e.target) setDragOver(false); }} onDrop={(e) => { if (e.dataTransfer.files.length) { e.preventDefault(); setDragOver(false); uploadFiles(e.dataTransfer.files); } }}>
    {dragOver && <div className={styles.dropHint}>Lase lahti — laadime faili üles</div>}
    <input ref={fileRef} type="file" accept=".pdf,image/*,.xml,.csv" multiple hidden onChange={(e) => { if (e.target.files) uploadFiles(e.target.files); e.target.value = ''; }} />
    <div className={styles.topbar}><h1>Ostuarved</h1><span className={styles.sub}>{rangeLabel} · {periodInvoices.length} arvet</span>
      <div className={styles.metrics}><Metric label="Maksmisele" value={money(metrics.topay)} /><Metric label="Üle tähtaja" value={money(metrics.over)} negative /><Metric label="7 päeva jooksul" value={money(metrics.week)} /></div>
      <div className={styles.actions}>
        <span className={styles.relative}><button className={`${styles.button} ${styles.primary}`} disabled={action === 'upload'} onClick={() => setMenu(menu === 'upload' ? null : 'upload')}>{action === 'upload' ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}Laadi üles</button>
          {menu === 'upload' && <div className={`${styles.menu} ${styles.uploadMenu}`}>
            {[['pdf', 'PDF või pilt', 'Tuvastame tarnija, summad ja read', '.pdf,image/*'], ['xml', 'E-arve XML', 'Kui arve ei tulnud operaatori kaudu', '.xml'], ['csv', 'CSV / Bolt eksport', 'Mitu arvet korraga', '.csv']].map(([k, l, d, accept]) => <button key={k} className={styles.menuItem} onClick={() => { setMenu(null); if (fileRef.current) { fileRef.current.accept = accept; fileRef.current.click(); } }}><span>{l}<span className={styles.menuDesc}>{d}</span></span></button>)}
            <div className={styles.menuFoot}>Faili võib lohistada ka otse nimekirjale</div>
          </div>}</span>
        <Link className={styles.button} href="/invoices/new?type=purchase_invoice"><Plus size={14} />Uus ostuarve <span className={styles.key} style={{ color: 'var(--a-text-3)', borderColor: 'var(--a-border-strong)', background: 'var(--a-surface-2)' }}>U</span></Link>
        <button className={`${styles.button} ${styles.ghost}`} onClick={() => { void loadInvoices(selectedId); void loadBatches(); }}><RefreshCw size={14} />Värskenda</button>
      </div></div>
    {error && <div className={styles.notice}>{error}</div>}
    {mode === 'list' && <div className={styles.filterbar}>
      <div className={styles.tabs}>{TABS.map(([key, label]) => <button key={key} className={`${styles.tab} ${tab === key ? styles.tabActive : ''}`} onClick={() => setTab(key)}>{label}<span className={`${styles.pill} ${key === 'pend' && tab !== key && tabCount(key) ? styles.pillWarn : ''}`}>{tabCount(key)}</span></button>)}
        <span className={styles.relative}><button className={`${styles.tab} ${MORE_TABS.some((x) => x[0] === tab) ? styles.tabActive : ''}`} onClick={() => setMenu(menu === 'more' ? null : 'more')}>{MORE_TABS.find((x) => x[0] === tab)?.[1] || '···'}{MORE_TABS.some((x) => x[0] === tab) && <span className={styles.pill}>{tabCount(tab)}</span>}</button>{menu === 'more' && <div className={styles.menu}>{MORE_TABS.map(([key, label]) => <button key={key} className={`${styles.menuItem} ${tab === key ? styles.menuOn : ''}`} onClick={() => { setTab(key); setMenu(null); }}>{label}<span className={styles.pill}>{tabCount(key)}</span></button>)}</div>}</span></div>
      <div className={styles.relative}><button className={`${styles.picker} ${period !== '90' ? styles.pickerActive : ''}`} onClick={() => setMenu(menu === 'period' ? null : 'period')}><CalendarDays size={14} />{periodLabel}<ChevronDown size={12} /></button>{menu === 'period' && <div className={styles.popover}><div className={styles.label}>Arve kuupäev</div><div className={styles.presets}>{PERIODS.map(([key, label]) => <button key={key} className={`${styles.preset} ${period === key ? styles.presetActive : ''}`} onClick={() => setPeriod(key)}>{label}</button>)}</div><div className={styles.label} style={{ marginTop: 10 }}>Kohandatud vahemik</div><div className={styles.dateFields}><input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /><input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div><div className={styles.popoverFooter}><span className={styles.hint}>{rangeLabel}</span><button className={`${styles.button} ${styles.small}`} onClick={() => { setPeriod('all'); setDateFrom(''); setDateTo(''); }}>Eemalda</button><button className={`${styles.button} ${styles.small} ${styles.primary}`} onClick={() => { if (dateFrom || dateTo) setPeriod('custom'); setMenu(null); }}>Rakenda</button></div></div>}</div>
      <div className={styles.relative}><button className={`${styles.picker} ${src !== 'all' ? styles.pickerActive : ''}`} onClick={() => setMenu(menu === 'src' ? null : 'src')}>Allikas: {src === 'all' ? 'kõik' : SRC[src].l}<ChevronDown size={12} /></button>{menu === 'src' && <div className={`${styles.menu} ${styles.menuLeft}`} style={{ width: 214 }}><button className={`${styles.menuItem} ${src === 'all' ? styles.menuOn : ''}`} onClick={() => { setSrc('all'); setMenu(null); }}>Kõik allikad<span className={styles.pill}>{baseFiltered.length}</span></button>{(Object.keys(SRC) as SrcKey[]).map((k) => <button key={k} className={`${styles.menuItem} ${src === k ? styles.menuOn : ''}`} onClick={() => { setSrc(k); setMenu(null); }}><span>{SRC[k].l}<span className={styles.menuDesc}>{SRC[k].d}</span></span><span className={styles.pill}>{baseFiltered.filter((r) => srcKey(r) === k).length}</span></button>)}</div>}</div>
      <div className={styles.relative}><button className={`${styles.picker} ${vat !== 'all' ? styles.pickerActive : ''}`} onClick={() => setMenu(menu === 'vat' ? null : 'vat')}>KM: {VAT_CODES.find((x) => x.key === vat)?.short}<ChevronDown size={12} /></button>{menu === 'vat' && <div className={`${styles.menu} ${styles.menuLeft}`}>{VAT_CODES.map((code) => <button key={code.key} className={`${styles.menuItem} ${vat === code.key ? styles.menuOn : ''}`} onClick={() => { setVat(code.key); setMenu(null); }}>{code.label}<span className={styles.pill}>{baseFiltered.filter((r) => hasVatCode(r, code.key)).length}</span></button>)}</div>}</div>
      <label className={styles.search}><Search size={14} /><input ref={searchRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Otsi arvet või tarnijat  /" /></label>
    </div>}
    {mode === 'list' ? <div className={`${styles.body} ${wide ? styles.bodyWide : ''}`}>
      <section className={`${styles.card} ${styles.listColumn}`}>
        {checked.size ? <div className={`${styles.listHeader} ${styles.listHeaderSel}`}><span><b>{checkedRows.length}</b> valitud</span><span style={{ color: 'var(--a-text-3)' }}>·</span><span className={styles.mono}>maksmisele <b>{money(checkedPayable.reduce((n, r) => n + openAmount(r), 0))}</b>{checkedPayable.length < checkedRows.length && <span style={{ color: 'var(--a-text-3)' }}> ({checkedPayable.length} arvet)</span>}</span>
          <div className={`${styles.push}`} style={{ display: 'flex', gap: 7 }}>{checkedPending.length > 0 && <button className={`${styles.button} ${styles.small}`} disabled={!!action} onClick={() => void bulkApprove()}>{action === 'bulk-approve' && <Loader2 size={13} className="animate-spin" />}Kinnita ({checkedPending.length})</button>}<button className={`${styles.button} ${styles.small} ${styles.primary}`} disabled={!checkedPayable.length} onClick={() => setModal({ kind: 'pay', ids: checkedRows.map((r) => r.id) })}>Koosta maksekorraldus</button><button className={`${styles.button} ${styles.small} ${styles.ghost}`} title="Tühista valik (Esc)" onClick={() => setChecked(new Set())}>✕</button></div></div>
        : <div className={styles.listHeader}><span><b>{visible.length}</b>&nbsp;arvet nähtaval</span><span style={{ color: 'var(--a-text-3)' }}>· märgi read <kbd className={styles.key} style={{ color: 'var(--a-text-3)', borderColor: 'var(--a-border-strong)', background: 'var(--a-surface-2)' }}>x</kbd>, et koostada maksekorraldus</span>
          <div className={`${styles.relative} ${styles.push}`}><button className={`${styles.button} ${styles.small} ${styles.ghost}`} onClick={() => setMenu(menu === 'columns' ? null : 'columns')}><Columns3 size={13} />Veerud</button>{menu === 'columns' && <div className={styles.menu}>{COLUMNS.filter((c) => !c.locked).map((col) => <label key={col.id} className={styles.menuLabel}><input type="checkbox" checked={!hidden.includes(col.id)} onChange={() => setHiddenPersist(hidden.includes(col.id) ? hidden.filter((id) => id !== col.id) : [...hidden, col.id])} />{col.label}</label>)}<button className={styles.menuItem} onClick={() => { setHiddenPersist(DEFAULT_HIDDEN); setWidths({}); localStorage.removeItem(KEYS.cols); }}>Lähtesta</button></div>}</div></div>}
        {pending.length > 0 && tab !== 'pend' && checked.size === 0 && <div className={styles.warning}><Bell size={14} /><span><b>{pending.length}</b> arvet ootab kinnitust summas {money(pending.reduce((n, r) => n + Number(r.total), 0))} — neid ei saa enne kinnitamist maksta</span><button className={`${styles.button} ${styles.small} ${styles.primary}`} onClick={() => setTab('pend')}>Ava kinnitamiseks</button></div>}
        <div className={styles.tableScroll}><div className={styles.tableHead}>{shownColumns.map((col) => col.id === 'ck' ? <div key={col.id} className={`${styles.headerCell} ${styles.checkCell}`}><input type="checkbox" title="Vali kõik nähtavad" checked={allVisibleChecked} onChange={() => setChecked((s) => { const n = new Set(s); if (allVisibleChecked) visible.forEach((r) => n.delete(r.id)); else visible.forEach((r) => n.add(r.id)); return n; })} /></div> : <button key={col.id} className={`${styles.headerCell} ${col.right ? styles.alignRight : ''} ${sort === col.id ? styles.sorted : ''}`} onClick={() => setSortColumn(col.id)}>{col.label}{sort === col.id && <span className={styles.sortArrow}>{direction === 1 ? '↑' : '↓'}</span>}<span className={styles.grip} onDoubleClick={(e) => { e.stopPropagation(); setWidths((v) => { const n = { ...v }; delete n[col.id]; localStorage.setItem(KEYS.cols, JSON.stringify(n)); return n; }); }} onPointerDown={(e) => resizeColumn(col.id, e)} /></button>)}</div>
          <div className={styles.rows}>{loading ? <div className={styles.empty}><Loader2 size={20} className="animate-spin" /></div> : visible.length === 0 ? <div className={styles.empty}>Selles vaates arveid pole</div> : visible.map((inv) => <Row key={inv.id} inv={inv} ctx={ctx} columns={shownColumns.map((c) => c.id)} selected={selectedId === inv.id} ticked={checked.has(inv.id)} rowRef={(n) => { if (n) rowRefs.current.set(inv.id, n); else rowRefs.current.delete(inv.id); }} onSelect={() => setSelectedId(inv.id)} onOpen={() => { setSelectedId(inv.id); setMode('open'); }} onTick={() => toggleChecked(inv.id)} onClip={() => openPdf(inv.id)} />)}</div></div>
        <div className={styles.footer}><span className={styles.footerLeft}>Sorteeritud: {(COLUMNS.find((c) => c.id === sort)?.label || 'nr').toLocaleLowerCase('et')} {direction === 1 ? '↑' : '↓'}</span><div className={styles.footerRight}><span className={`${styles.mono} ${styles.tooltip}`} title={`Käibemaksuta ${money(totals.net)} · KM ${money(totals.vat)}`}>Summa kokku <b>{money(totals.total)}</b></span><span className={styles.mono}>Maksmisele <b>{money(totals.open)}</b></span><span className={styles.split}><button className={`${styles.button} ${styles.small} ${styles.ghost}`} onClick={() => void exportRows('xlsx')}>Ekspordi Excel</button><button className={`${styles.button} ${styles.small} ${styles.ghost}`} onClick={() => setMenu(menu === 'export' ? null : 'export')}><ChevronDown size={12} /></button>{menu === 'export' && <div className={`${styles.menu} ${styles.menuUp}`}><button className={styles.menuItem} onClick={() => void exportRows('xlsx')}>Excel (.xlsx)</button><button className={styles.menuItem} onClick={() => void exportRows('csv')}>CSV (.csv)</button><button className={styles.menuItem} onClick={() => void exportRows('pdf')}>PDF</button></div>}</span></div></div>
      </section>
      <div className={`${styles.gutter} ${panelDragging ? styles.gutterActive : ''}`} title="Lohista paneeli laiust · topeltklikk lähtestab" onPointerDown={resizePanel} onDoubleClick={() => { setPanelWidth(DEFAULT_PANEL_WIDTH); localStorage.setItem(KEYS.pw, String(DEFAULT_PANEL_WIDTH)); }} />
      <section className={styles.card}>{detailLoading && !detail ? <div className={styles.empty}><Loader2 size={20} className="animate-spin" /></div> : selected && detail ? <DetailPanel inv={selected} detail={detail} ctx={ctx} setPdfBox={setPdfBox} /> : <div className={styles.empty}>Vali arve</div>}</section>
    </div> : selected && detail ? <FullView inv={selected} detail={detail} ctx={ctx} setPdfBox={setPdfBox} /> : <div className={`${styles.card} ${styles.full}`}><div className={styles.empty}><Loader2 size={20} className="animate-spin" /></div></div>}
    {modal?.kind === 'journal' && <JournalModal journal={journal} loading={journalLoading} inv={selected} name={selected ? partnerName(selected, partnerMap) : ''} accounts={accounts} onClose={() => { setModal(null); setJournal(null); }} />}
    {modal?.kind === 'pay' && <PaymentModal ids={modal.ids} invoices={invoices} ctx={ctx} bankAccounts={bankAccounts} onClose={() => setModal(null)} onDone={(ids) => { setChecked((s) => { const n = new Set(s); ids.forEach((id) => n.delete(id)); return n; }); setModal(null); void loadBatches(); }} />}
  </div>;
}

/* ── shared context for row / panel / full view ── */
type Ctx = {
  partnerMap: Map<string, PartnerRecord>; memberMap: Map<string, TenantMember>; accountMap: Map<string, AccountOption>; ccMap: Map<string, CostCenter>; prjMap: Map<string, Project>;
  batches: Map<string, BatchRef>; imports: Map<string, PurchaseInvoiceImportListItem>; payments: PaymentListItem[]; reminders: Record<string, ReceiptReminder[]>; supplierIban: Record<string, SupplierBankAccount | null>; receiptSettings: MissingReceiptSettings | null; action: string | null;
  docUrls: Record<string, string>; zoom: Zoom; zoomValue: number; fitZoom: number; pdfPages: number; ptab: PTab; wide: boolean; visible: InvoiceListItem[]; selectedId: string | null;
  setPtab: (t: PTab) => void; setZoom: (z: Zoom) => void; stepZoom: (d: 1 | -1) => void; setPdfPages: (n: number) => void; onNavigate: (d: number) => void; onWide: () => void; onOpen: () => void; onClose: () => void; onJournal: (inv: InvoiceListItem) => void;
  submit: (inv: InvoiceListItem) => Promise<void>; approve: (inv: InvoiceListItem) => Promise<void>; reject: (inv: InvoiceListItem) => void; remindNow: (inv: InvoiceListItem) => Promise<void>; noDoc: (inv: InvoiceListItem) => Promise<void>; upload: () => void; pay: (ids: string[]) => void; downloadDoc: (inv: InvoiceListItem) => void;
};
const lineAccounts = (detail: InvoiceDetail | null, ctx: Ctx) => [...new Set((detail?.lines || []).map((l) => l.account_id).filter(Boolean))].map((id) => ctx.accountMap.get(id!)).filter(Boolean) as AccountOption[];
const accText = (detail: InvoiceDetail | null, ctx: Ctx) => { const a = lineAccounts(detail, ctx); return a.length === 0 ? '—' : a.length === 1 ? `${a[0].code} ${a[0].name}` : `${a[0].code} + ${a.length - 1}`; };
const accTitle = (detail: InvoiceDetail | null, ctx: Ctx) => lineAccounts(detail, ctx).map((a) => `${a.code} ${a.name}`).join(', ');
const dimsOf = (detail: InvoiceDetail | null, ctx: Ctx) => { const hm = detail?.invoice.meta || {}; const cc = [...new Set([...(detail?.lines || []).map((l) => metaStr(l.meta, 'cost_center_id')), metaStr(hm as Record<string, unknown>, 'cost_center_id')].filter(Boolean))]; const pj = [...new Set([...(detail?.lines || []).map((l) => metaStr(l.meta, 'project_id')), metaStr(hm as Record<string, unknown>, 'project_id')].filter(Boolean))]; return [ctx.ccMap.get(cc[0] || '')?.name, ctx.prjMap.get(pj[0] || '')?.name].filter(Boolean).join(' · ') || '—'; };
const lineDims = (l: InvoiceLine, ctx: Ctx) => [ctx.ccMap.get(metaStr(l.meta, 'cost_center_id'))?.name, ctx.prjMap.get(metaStr(l.meta, 'project_id'))?.name].filter(Boolean);
const approverOf = (inv: InvoiceListItem, ctx: Ctx) => memberName(ctx.memberMap.get(inv.approved_by_user_id || inv.rejected_by_user_id || '')) || '';
const enteredBy = (inv: InvoiceListItem, ctx: Ctx) => memberName(ctx.memberMap.get(inv.created_by_user_id || '')) || 'süsteem';
/** Reminder history: real rows from the reminders table when loaded, otherwise dates spaced by the
 *  configured frequency back from the last send. `next` is the next automatic send, always in the future. */
const reminderDates = (inv: InvoiceListItem, ctx: Ctx) => {
  const history = ctx.reminders[inv.id];
  const n = Number(inv.receipt_reminder_sent_count || 0); const last = inv.receipt_reminder_last_sent_at ? new Date(inv.receipt_reminder_last_sent_at) : null; const freq = Number(ctx.receiptSettings?.frequency_days || 3);
  const dates: Array<{ date: Date; to: string }> = history?.length ? history.map((r) => ({ date: new Date(r.sent_at), to: r.sent_to_email })) : [];
  if (!history?.length && last) for (let i = n - 1; i >= 0; i -= 1) dates.push({ date: new Date(last.getTime() - i * freq * DAY), to: ctx.receiptSettings?.responsible_email || '' });
  const stopped = inv.receipt_reminder_state !== 'active' || !!inv.receipt_dismissed_reason || (ctx.receiptSettings?.max_reminders != null && n >= Number(ctx.receiptSettings.max_reminders));
  const lastTime = dates.length ? dates[dates.length - 1].date.getTime() : last ? last.getTime() : new Date(inv.created_at).getTime();
  const next = stopped ? null : new Date(Math.max(Date.now() + DAY, lastTime + freq * DAY));
  return { dates, next, to: dates[dates.length - 1]?.to || ctx.receiptSettings?.responsible_email || '' };
};
const originText = (inv: InvoiceListItem) => ({ eai: 'Saabus e-arvena', bank: 'Loodud pangatehingust', csv: 'Imporditud CSV-st', pdf: 'PDF tuvastatud', man: 'Sisestatud' })[srcKey(inv)];

function Metric({ label, value, negative = false }: { label: string; value: string; negative?: boolean }) { return <div className={styles.metric}><span className={styles.metricKey}>{label}</span><span className={`${styles.metricValue} ${styles.mono} ${negative ? styles.negative : ''}`}>{value}</span></div>; }

function Row({ inv, ctx, columns, selected, ticked, rowRef, onSelect, onOpen, onTick, onClip }: { inv: InvoiceListItem; ctx: Ctx; columns: ColumnId[]; selected: boolean; ticked: boolean; rowRef: (n: HTMLDivElement | null) => void; onSelect: () => void; onOpen: () => void; onTick: () => void; onClip: () => void }) {
  const k = stKey(inv), name = partnerName(inv, ctx.partnerMap), late = lateDays(inv), pay = payable(inv), batch = ctx.batches.get(inv.id), doc = ctx.imports.get(inv.id), rem = Number(inv.receipt_reminder_sent_count || 0), approver = approverOf(inv, ctx), done = !['draft', 'pend'].includes(k), h = hue(name);
  return <div ref={rowRef} role="button" tabIndex={-1} className={`${styles.row} ${ticked ? styles.ticked : ''} ${selected ? styles.selected : ''}`} onClick={onSelect} onDoubleClick={onOpen}>{columns.map((id) => {
    if (id === 'ck') return <div key={id} className={`${styles.cell} ${styles.checkCell}`} onClick={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}><input type="checkbox" checked={ticked} onChange={onTick} /></div>;
    if (id === 'nr') return <div key={id} className={`${styles.cell} ${styles.invoiceNumber} ${styles.mono}`}>{inv.invoice_number || inv.id.slice(0, 8)}</div>;
    if (id === 'sup') return <div key={id} className={styles.cell}><div className={styles.customer}><span className={styles.avatar} style={{ background: `oklch(0.92 0.045 ${h})`, color: `oklch(0.36 0.09 ${h})` }}>{initials(name)}</span><span className={styles.customerText}><span className={styles.customerName}>{name}</span><span className={styles.customerMeta}>{SRC[srcKey(inv)].l}{srcKey(inv) === 'bank' && !doc ? ' · originaal puudub' : ''} · {paymentTerms(inv)}p</span></span></div></div>;
    if (id === 'sinv') return <div key={id} className={styles.cell}><span className={styles.sinv}><span className={styles.mono}>{inv.invoice_number || '—'}</span><button type="button" className={`${styles.clip} ${doc ? '' : styles.clipNone}`} title={doc ? 'Ava originaal (PDF)' : 'Manus puudub'} onClick={(e) => { e.stopPropagation(); onClip(); }}><Paperclip size={11} /></button></span></div>;
    if (id === 'acc') return <div key={id} className={`${styles.cell} ${styles.accText}`} title="Kulukonto laetakse arve avamisel">{ctx.selectedId === inv.id ? '' : ''}—</div>;
    if (id === 'ccp') return <div key={id} className={`${styles.cell} ${styles.accText}`}>{[ctx.ccMap.get(metaStr(inv.meta as Record<string, unknown>, 'cost_center_id'))?.name, ctx.prjMap.get(metaStr(inv.meta as Record<string, unknown>, 'project_id'))?.name].filter(Boolean).join(' · ') || '—'}</div>;
    if (id === 'total') return <div key={id} className={`${styles.cell} ${styles.amount} ${styles.mono}`}>{money(inv.total, inv.currency)}</div>;
    if (id === 'open') return <div key={id} className={`${styles.cell} ${styles.amount} ${styles.mono} ${pay ? '' : styles.mutedAmount}`}>{pay ? money(openAmount(inv), inv.currency) : '—'}</div>;
    if (id === 'issued') return <div key={id} className={`${styles.cell} ${styles.date} ${styles.mono}`}>{dateText(inv.invoice_date)}</div>;
    if (id === 'due') return <div key={id} className={`${styles.cell} ${styles.date} ${styles.mono}`}>{dateText(inv.due_date)} {pay && inv.due_date && <span className={`${styles.dateDelta} ${late > 0 ? styles.negative : ''}`}>{late > 0 ? `+${late}p` : `${-late}p`}</span>}</div>;
    if (id === 'paydate') return <div key={id} className={`${styles.cell} ${styles.date} ${styles.mono}`}>{k === 'paid' ? dateText(inv.updated_at) : batch?.batch.execution_date ? <>{dateText(batch.batch.execution_date)} <span className={styles.dateDelta}>plaan</span></> : <span style={{ color: 'var(--a-text-3)' }}>—</span>}</div>;
    if (id === 'appr') return <div key={id} className={styles.cell}><span className={styles.appr} title={`${done ? 'Kinnitas' : 'Kinnitab'} ${approver || '—'}`}><span className={`${styles.avSmall} ${done ? '' : styles.avPending}`}>{approver ? shortInitials(approver) : '?'}</span><span>{approver || '—'}</span></span></div>;
    return <div key={id} className={styles.cell}><span className={`${styles.status} ${ST[k].cls}`}>{ST[k].label}</span>{batch && <span className={styles.chip} title={`Maksepakis ${batch.batch.batch_name || batch.batch.id.slice(0, 8)} · ${dateText(batch.batch.execution_date)}`}>MP</span>}{rem > 0 && !doc && <span className={`${styles.chip} ${styles.chipWarn}`} title={`Originaal puudub · ${rem} meeldetuletust saadetud, viimane ${dateText(inv.receipt_reminder_last_sent_at)}${ctx.receiptSettings?.responsible_email ? ` · ${ctx.receiptSettings.responsible_email}` : ''}`}><Bell size={9} style={{ verticalAlign: -1 }} /> {rem}</span>}</div>;
  })}</div>;
}

function Seg({ ctx, count, pushLeft = false }: { ctx: Ctx; count: number; pushLeft?: boolean }) { return <span className={`${styles.seg} ${pushLeft ? styles.pushLeft : ''}`}><button className={ctx.ptab === 'lines' ? styles.segOn : ''} onClick={() => ctx.setPtab('lines')}>Read · {count}</button><button className={ctx.ptab === 'pdf' ? styles.segOn : ''} onClick={() => ctx.setPtab('pdf')}>Originaal</button></span>; }

function LinesBlock({ inv, detail, ctx, wide, seg }: { inv: InvoiceListItem; detail: InvoiceDetail; ctx: Ctx; wide: boolean; seg: boolean }) {
  return <div className={`${styles.lines} ${wide ? styles.wideLines : ''}`}><div className={styles.lineHead}><span>Kirjeldus</span>{wide && <span>Kulukonto</span>}<span className={styles.alignRight}>Kogus</span>{wide && <span className={styles.alignRight}>Hind</span>}<span className={styles.alignRight}>KM</span><span className={styles.alignRight}>Summa</span></div>
    <div className={styles.lineRows}>{detail.lines.map((l) => { const acc = ctx.accountMap.get(l.account_id || ''); const dims = lineDims(l, ctx); return <div className={styles.lineRow} key={l.id}><span className={styles.lineDesc} title={[l.description, ...dims].join(' · ')}>{l.description}</span>{wide && <span className={styles.lineAcc}><span className={styles.mono}>{acc?.code || '—'}</span> {acc?.name || ''}</span>}<span className={`${styles.mono} ${styles.alignRight}`}>{Number(l.quantity)}</span>{wide && <span className={`${styles.mono} ${styles.alignRight}`}>{money(l.unit_price, inv.currency)}</span>}<span className={`${styles.mono} ${styles.alignRight}`}>{Number(l.tax_rate || 0)}%</span><span className={`${styles.mono} ${styles.lineAmount}`}>{money(l.line_total, inv.currency)}</span></div>; })}</div>
    <div className={styles.lineTotalRow}>{seg && <Seg ctx={ctx} count={detail.lines.length} pushLeft />}{(wide || !seg) && <span>Neto <b className={styles.mono}>{money(inv.subtotal, inv.currency)}</b></span>}<span>KM <b className={styles.mono}>{money(inv.tax_amount, inv.currency)}</b></span><span title={`Neto ${money(inv.subtotal, inv.currency)} · KM ${money(inv.tax_amount, inv.currency)}`}>Kokku <b className={styles.mono}>{money(inv.total, inv.currency)}</b></span></div></div>;
}

function ApprovalTimeline({ inv, ctx }: { inv: InvoiceListItem; ctx: Ctx }) {
  const k = stKey(inv), rows: Array<{ d: string | Date | null; t: string; s?: 'done' | 'wait' | 'bad'; title?: string }> = [{ d: inv.created_at, t: `${originText(inv)} · ${enteredBy(inv, ctx)}`, s: 'done' }];
  const approver = approverOf(inv, ctx) || '—', rem = reminderDates(inv, ctx), doc = ctx.imports.get(inv.id), paid = Number(inv.paid_amount || 0), late = lateDays(inv), batch = ctx.batches.get(inv.id);
  if (k === 'draft') { rem.dates.forEach((d, i) => rows.push({ d: d.date, t: `Meeldetuletus ${i + 1} saadetud · ${d.to}`, s: 'wait', title: `Saadetud ${d.to}` })); if (srcKey(inv) === 'bank' && rem.next) rows.push({ d: rem.next, t: 'Järgmine meeldetuletus (automaatne)' }); rows.push({ d: null, t: doc || srcKey(inv) !== 'bank' ? 'Täienda ja saada kinnitamiseks' : 'Ootab originaali', s: 'wait' }); }
  else if (k === 'pend') rows.push({ d: inv.approval_requested_at || null, t: `Ootab kinnitust · ${approver}`, s: 'wait' });
  else if (k === 'rej') rows.push({ d: inv.rejected_at || null, t: `Tagasi lükatud · ${approver}: ${inv.rejection_reason || 'põhjus märkimata'}`, s: 'bad', title: inv.rejection_reason || undefined });
  else if (k === 'void') rows.push({ d: null, t: 'Tühistatud' });
  else { rows.push({ d: inv.approved_at || inv.updated_at, t: `Kinnitatud · ${approver}`, s: 'done' }); if (batch) rows.push({ d: batch.batch.execution_date || null, t: `Maksepakis ${batch.batch.batch_name || batch.batch.id.slice(0, 8)}`, s: 'wait' }); ctx.payments.filter((p) => p.status === 'posted').forEach((p) => rows.push({ d: p.payment_date, t: `Makstud ${money(p.amount, p.currency)}`, s: 'done' })); if (k === 'paid' && !ctx.payments.length) rows.push({ d: inv.updated_at, t: `Makstud ${money(paid || inv.total, inv.currency)}`, s: 'done' }); if (!batch && payable(inv)) rows.push({ d: inv.due_date || null, t: late > 0 ? `Tähtaeg möödas ${late} p` : 'Maksmata', s: late > 0 ? 'bad' : undefined }); }
  return <div className={styles.timeline}>{rows.map((r, i) => <div key={i} className={`${styles.timelineRow} ${r.s === 'done' ? styles.done : r.s === 'wait' ? styles.tlWait : r.s === 'bad' ? styles.tlBad : ''}`}><span className={styles.mono}>{r.d ? shortDate(r.d) : '—'}</span><span className={styles.bullet} /><span title={r.title || r.t}>{r.t}</span></div>)}</div>;
}

function BankTx({ inv, ctx }: { inv: InvoiceListItem; ctx: Ctx }) {
  const k = stKey(inv), batch = ctx.batches.get(inv.id), posted = ctx.payments.filter((p) => p.status === 'posted');
  if (srcKey(inv) === 'bank' && k === 'draft') return <div className={styles.btx}><span className={styles.mono}>{shortDate(inv.invoice_date)}</span><b className={styles.mono}>−{money(inv.total, inv.currency)}</b><span>Pangatehing · mustand loodud siit</span><span className={styles.push}><Link href="/accounting/bank" className={styles.link}>Ava</Link></span></div>;
  if (posted.length) { const p = posted[posted.length - 1]; return <div className={styles.btx}><span className={styles.mono}>{shortDate(p.payment_date)}</span><b className={styles.mono}>−{money(p.amount, p.currency)}</b><span>{batch ? batch.batch.batch_name || 'Maksepakk' : 'Makse'}</span><span className={styles.push}><Link href={`/accounting/payments?invoice=${inv.id}`} className={styles.link}>Ava</Link></span></div>; }
  if (batch) return <div className={`${styles.btx} ${styles.btxNone}`}>Makse ootab panka · {batch.batch.batch_name || batch.batch.id.slice(0, 8)} · {dateText(batch.batch.execution_date)}</div>;
  return <div className={`${styles.btx} ${styles.btxNone}`}>Pangatehingut pole seotud</div>;
}

function ActionBar({ inv, ctx, full }: { inv: InvoiceListItem; ctx: Ctx; full: boolean }) {
  const k = stKey(inv), batch = ctx.batches.get(inv.id), busy = !!ctx.action, edit = `/invoices/${inv.id}/edit`;
  const P = (t: string, fn: () => void, key?: string) => <button className={`${styles.button} ${styles.primary}`} disabled={busy} onClick={fn}>{key && ctx.action === key && <Loader2 size={13} className="animate-spin" />}{t}</button>;
  const B = (t: string, fn: () => void, cls = '') => <button className={`${styles.button} ${cls}`} disabled={busy} onClick={fn}>{t}</button>;
  let left: ReactNode;
  if (k === 'draft') left = <>{P('Saada kinnitamiseks', () => void ctx.submit(inv), `submit:${inv.id}`)}{srcKey(inv) === 'bank' ? B('Saada meeldetuletus', () => void ctx.remindNow(inv)) : <Link className={styles.button} href={edit}>Muuda</Link>}</>;
  else if (k === 'pend') left = <>{P('Kinnita', () => void ctx.approve(inv), `approve:${inv.id}`)}{B('Lükka tagasi', () => ctx.reject(inv), styles.dangerGhost)}</>;
  else if (k === 'rej') left = <Link className={`${styles.button} ${styles.primary}`} href={edit}>Paranda ja saada uuesti</Link>;
  else if (payable(inv)) left = <>{batch ? <Link className={styles.button} href="/accounting/payment-batches">Maksepakis {batch.batch.batch_name || batch.batch.id.slice(0, 8)}</Link> : P('Lisa maksekorraldusse', () => ctx.pay([inv.id]))}<Link className={styles.button} href={`/accounting/payments?invoice=${inv.id}`}>Registreeri tasumine</Link></>;
  else left = full ? <Link className={`${styles.button} ${styles.primary}`} href={edit}>Muuda</Link> : P('Ava arve', ctx.onOpen);
  return <div className={styles.detailFooter}>{left}<div className={styles.detailFooterRight}>{!['draft', 'pend', 'rej'].includes(k) || full ? <Link className={`${styles.button} ${styles.ghost}`} href={edit}>Muuda</Link> : null}{inv.journal_entry_id && <button className={`${styles.button} ${styles.ghost}`} onClick={() => ctx.onJournal(inv)}>Kanne</button>}</div></div>;
}

function PdfPane({ inv, ctx, seg, lineCount, setPdfBox }: { inv: InvoiceListItem; ctx: Ctx; seg: boolean; lineCount: number; setPdfBox: (el: HTMLDivElement | null) => void }) {
  const doc = ctx.imports.get(inv.id), url = doc?.document_id ? ctx.docUrls[doc.document_id] : null, rem = reminderDates(inv, ctx), bank = srcKey(inv) === 'bank';
  if (!doc) return <div className={styles.pview}><div className={styles.noorig}>
    <div className={styles.noorigIcon}><Paperclip size={18} /></div>
    <div><h4>Originaal puudub</h4><p>{bank ? <>Mustand loodi pangatehingust {dateText(inv.invoice_date)}. Kviitungi või arve küsimiseks saadetakse automaatselt meeldetuletusi aadressile <b>{rem.to || '—'}</b>.</> : 'Arvel pole originaali. Lisa PDF või pilt, et arvet saaks kinnitada.'}</p></div>
    {rem.dates.length > 0 && <div><div className={styles.sectionTitle} style={{ marginBottom: 6 }}>Meeldetuletused · {rem.dates.length}</div><div className={styles.remlist}>{rem.dates.map((d, i) => <div key={i}><span className={styles.mono}>{dateText(d.date)}</span><span><b>Meeldetuletus {i + 1}</b> · e-post</span><span className={styles.mono} style={{ color: 'var(--a-text-3)' }} title={d.to}>{d.to.split('@')[0] || ''}</span></div>)}{rem.next && <div className={styles.remNext}><span className={styles.mono}>{dateText(rem.next)}</span><span>Järgmine automaatne meeldetuletus</span><span /></div>}</div></div>}
    <div className={styles.noorigActs}><button className={`${styles.button} ${styles.primary}`} onClick={ctx.upload}>Laadi originaal üles</button>{bank && <><button className={styles.button} disabled={!!ctx.action} onClick={() => void ctx.remindNow(inv)}>Saada meeldetuletus kohe</button><button className={`${styles.button} ${styles.ghost}`} disabled={!!ctx.action || inv.receipt_reminder_state !== 'active'} onClick={() => void ctx.noDoc(inv)}>Originaali ei tule</button></>}</div>
  </div>{seg && <div className={styles.pdfbar}><Seg ctx={ctx} count={lineCount} /><span className="fn">Faili võib lohistada siia</span></div>}</div>;
  const pct = `${Math.round(ctx.zoomValue * 100)}%`;
  return <div className={styles.pview}><div ref={setPdfBox} className={styles.pdf} onWheel={(e) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); ctx.stepZoom(e.deltaY < 0 ? 1 : -1); } }}>{url ? <PdfViewer url={url} mimeType={doc.mime_type} zoom={ctx.zoomValue} onPages={ctx.setPdfPages} /> : <div style={{ padding: 20, fontSize: 12, color: 'var(--a-text-3)' }}><Loader2 size={16} className="animate-spin" /></div>}</div>
    <div className={styles.pdfbar}>{seg && <Seg ctx={ctx} count={lineCount} />}<span className={styles.fn} title={`${doc.file_name || 'originaal'} · ${ctx.pdfPages || 1} lk · ${SRC[srcKey(inv)].l}`}>{doc.file_name || 'originaal'} · {ctx.pdfPages || 1} lk · {SRC[srcKey(inv)].l}</span>
      <span className={styles.push}><span className={styles.zoom}><button title="Vähenda (− · Ctrl+rullik)" onClick={() => ctx.stepZoom(-1)}>−</button><span className={styles.zv}>{pct}</span><button title="Suurenda (+)" onClick={() => ctx.stepZoom(1)}>+</button><button className={ctx.zoom === 'fit' ? styles.zoomOn : ''} title="Mahuta laiusele (0)" onClick={() => ctx.setZoom('fit')}>↔</button><button className={ctx.zoom === 1 ? styles.zoomOn : ''} title="Tegelik suurus" onClick={() => ctx.setZoom(1)}>1:1</button></span><button className={styles.iconb} title="Laadi alla" onClick={() => ctx.downloadDoc(inv)}>↓</button><button className={styles.iconb} title="Asenda fail" onClick={ctx.upload}>↻</button></span></div></div>;
}

function DetailPanel({ inv, detail, ctx, setPdfBox }: { inv: InvoiceListItem; detail: InvoiceDetail; ctx: Ctx; setPdfBox: (el: HTMLDivElement | null) => void }) {
  const k = stKey(inv), name = partnerName(inv, ctx.partnerMap), i = ctx.visible.findIndex((x) => x.id === inv.id), late = lateDays(inv), iban = inv.partner_id ? ctx.supplierIban[inv.partner_id] : null, pdf = ctx.ptab === 'pdf';
  return <><div className={`${styles.detailHeader} ${pdf ? styles.detailHeaderPdf : ''}`}><div className={styles.detailHeaderRow}><h2 title={`${inv.invoice_number || ''} · ${name}`}><span className={`${styles.mono} ${styles.snr} ${ST[k].snr}`} title={ST[k].label}>{inv.invoice_number || inv.id.slice(0, 8)}</span> · {name}</h2>
    <div className={styles.detailNav}><button className={`${styles.button} ${styles.small}`} disabled={i <= 0} title="Eelmine (k)" onClick={() => ctx.onNavigate(-1)}>↑</button><button className={`${styles.button} ${styles.small}`} disabled={i >= ctx.visible.length - 1} title="Järgmine (j)" onClick={() => ctx.onNavigate(1)}>↓</button><button className={`${styles.button} ${styles.small}`} title={ctx.wide ? 'Kitsenda paneel' : 'Laienda paneel (tabel peitu)'} onClick={ctx.onWide}>{ctx.wide ? '⇲' : '⇱'}</button><button className={`${styles.button} ${styles.small}`} title="Ava täisvaates (Enter)" onClick={ctx.onOpen}>Ava →</button></div></div>
    {!pdf && <div className={`${styles.detailMeta} ${styles.mono}`}>{inv.invoice_number || '—'} · {SRC[srcKey(inv)].l}</div>}</div>
    <div className={styles.detailBody}>{pdf ? <PdfPane inv={inv} ctx={ctx} seg lineCount={detail.lines.length} setPdfBox={setPdfBox} /> : <>
      <div className={`${styles.section} ${styles.grow}`}>{k === 'rej' && <div className={styles.rejectNote}>Tagasi lükatud: {inv.rejection_reason || 'põhjus märkimata'}</div>}<LinesBlock inv={inv} detail={detail} ctx={ctx} wide={ctx.wide} seg /></div>
      <div className={styles.detailSplit}><div className={styles.section}><div className={styles.sectionTitle}>Andmed</div><KV label="Tähtaeg" value={dateText(inv.due_date)} neg={payable(inv) && late > 0} /><KV label="Viitenumber" value={inv.payment_reference || '—'} /><KV label="IBAN" value={iban?.iban || '—'} /><KV label="KM kood" value={vatText(inv)} title={vatLabel(inv)} /><KV label="Kulukonto" value={accText(detail, ctx)} title={accTitle(detail, ctx)} /><KV label="Kulukoht / projekt" value={dimsOf(detail, ctx)} /></div>
        <div className={styles.section}><div className={styles.sectionTitle}>Kinnitamine</div><ApprovalTimeline inv={inv} ctx={ctx} /><div className={styles.sectionTitle} style={{ margin: '10px 0 4px' }}>Pangatehing</div><BankTx inv={inv} ctx={ctx} /></div></div></>}</div>
    {!pdf && <ActionBar inv={inv} ctx={ctx} full={false} />}</>;
}

function KV({ label, value, title, neg = false }: { label: string; value: string; title?: string; neg?: boolean }) { return <div className={styles.kv}><span>{label}</span><b className={styles.mono} title={title || value} style={neg ? { color: '#c0392b' } : undefined}>{value}</b></div>; }

function FullView({ inv, detail, ctx, setPdfBox }: { inv: InvoiceListItem; detail: InvoiceDetail; ctx: Ctx; setPdfBox: (el: HTMLDivElement | null) => void }) {
  const k = stKey(inv), name = partnerName(inv, ctx.partnerMap), i = ctx.visible.findIndex((x) => x.id === inv.id), late = lateDays(inv), iban = inv.partner_id ? ctx.supplierIban[inv.partner_id] : null, partner = inv.partner_id ? ctx.partnerMap.get(inv.partner_id) : undefined, paid = Number(inv.paid_amount || 0), total = Number(inv.total || 0), batch = ctx.batches.get(inv.id), doc = ctx.imports.get(inv.id);
  const byAcc = new Map<string, number>(); detail.lines.forEach((l) => byAcc.set(l.account_id || '', (byAcc.get(l.account_id || '') || 0) + Number(l.line_total || 0)));
  const journalRows = [...byAcc.entries()].map(([id, v]) => ({ code: ctx.accountMap.get(id)?.code || '—', name: ctx.accountMap.get(id)?.name || 'Konto määramata', d: v, c: 0 })).concat(Number(inv.tax_amount || 0) ? [{ code: '1510', name: 'Sisendkäibemaks', d: Number(inv.tax_amount), c: 0 }] : [], [{ code: '2110', name: 'Võlad tarnijatele', d: 0, c: total }]);
  const openTotal = ctx.visible.filter((x) => x.partner_id === inv.partner_id && payable(x)).reduce((n, x) => n + openAmount(x), 0);
  return <section className={`${styles.card} ${styles.full}`}><div className={styles.fullHeader}><div className={styles.fullTitle}><button className={styles.link} onClick={ctx.onClose}>← Ostuarved</button><span className={styles.crumb}> / {inv.invoice_number}</span><h2><span className={styles.mono}>{inv.invoice_number || inv.id.slice(0, 8)}</span> · {name}</h2><div className={`${styles.detailMeta} ${styles.mono}`}>Tarnija arve {inv.invoice_number || '—'} · {dateText(inv.invoice_date)} → {dateText(inv.due_date)} · {paymentTerms(inv)} päeva · viide {inv.payment_reference || '—'} · {SRC[srcKey(inv)].l}</div></div>
    <div className={styles.fullHeaderActions}><span className={`${styles.status} ${ST[k].cls}`}>{ST[k].label}</span><button className={`${styles.button} ${styles.small}`} disabled={i <= 0} onClick={() => ctx.onNavigate(-1)}>↑</button><button className={`${styles.button} ${styles.small}`} disabled={i >= ctx.visible.length - 1} onClick={() => ctx.onNavigate(1)}>↓</button><button className={`${styles.button} ${styles.small} ${styles.ghost}`} title="Esc" onClick={ctx.onClose}>Sulge</button></div></div>
    <div className={styles.fullSplit}><div className={styles.fullLeft} style={{ display: 'flex', flexDirection: 'column' }}>
      <div className={styles.fullTabRow}><Seg ctx={ctx} count={detail.lines.length} />{k === 'rej' && <span className={styles.rejectNote} style={{ marginLeft: 'auto', marginBottom: 0 }}>Tagasi lükatud: {inv.rejection_reason || 'põhjus märkimata'}</span>}</div>
      {ctx.ptab === 'pdf' ? <PdfPane inv={inv} ctx={ctx} seg={false} lineCount={detail.lines.length} setPdfBox={setPdfBox} /> : <>
        <div className={styles.fullLineHead}><span>Kirjeldus</span><span>Kogus</span><span>Hind</span><span>KM</span><span>Neto</span><span>Kokku</span></div>
        {detail.lines.map((l) => { const acc = ctx.accountMap.get(l.account_id || ''), rate = Number(l.tax_rate || 0), net = Number(l.line_total || 0); return <div className={styles.fullLineRow} key={l.id}><span>{l.description}<span className={styles.accountMeta}><span className={styles.mono}>{acc?.code || '—'}</span> {acc?.name || ''}{lineDims(l, ctx).map((d) => ` · ${d}`).join('')}</span></span><span className={styles.mono}>{Number(l.quantity)}</span><span className={styles.mono}>{money(l.unit_price, inv.currency)}</span><span className={styles.mono}>{rate}%</span><span className={styles.mono}>{money(net, inv.currency)}</span><span className={styles.mono} style={{ fontWeight: 700 }}>{money(net * (1 + rate / 100), inv.currency)}</span></div>; })}
        <div className={styles.totals}><span>Neto <b>{money(inv.subtotal, inv.currency)}</b></span><span>Käibemaks <b>{money(inv.tax_amount, inv.currency)}</b></span><span>Kokku <b>{money(inv.total, inv.currency)}</b></span></div>
        <div className={styles.journal}><div className={styles.sectionTitle}>Konteering <span style={{ float: 'right', textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>{inv.journal_entry_id ? <button className={styles.link} onClick={() => ctx.onJournal(inv)}>Vaata kannet →</button> : 'eelvaade · kanne tekib kinnitamisel'}</span></div>{journalRows.map((r, idx) => <div className={styles.journalRow} key={idx}><span className={styles.mono}>{r.code}</span><span>{r.name}</span><span className={`${styles.mono} ${styles.alignRight}`} style={r.d ? undefined : { color: 'var(--a-text-3)' }}>{r.d ? money(r.d, inv.currency) : '—'}</span><span className={`${styles.mono} ${styles.alignRight}`} style={r.c ? undefined : { color: 'var(--a-text-3)' }}>{r.c ? money(r.c, inv.currency) : '—'}</span></div>)}</div></>}
    </div>
      <aside className={styles.rail}><div className={styles.sectionTitle}>Maksmine</div><div className={`${styles.balance} ${styles.mono}`}>{money(isOpenSt(k) ? openAmount(inv) : k === 'paid' ? 0 : total, inv.currency)}</div><div className={styles.detailMeta}>{k === 'paid' ? 'makstud täielikult' : isOpenSt(k) ? `tasumata · makstud ${money(paid, inv.currency)}` : 'maksmine pärast kinnitamist'}</div><div className={styles.progress}><span style={{ width: `${total ? Math.min(100, (paid / total) * 100) : 0}%` }} /></div>
        <KV label="Tähtaeg" value={`${dateText(inv.due_date)}${payable(inv) ? (late > 0 ? ` · +${late} p` : ` · ${-late} p`) : ''}`} neg={payable(inv) && late > 0} /><KV label="Saaja IBAN" value={iban?.iban || '—'} /><KV label="Viitenumber" value={inv.payment_reference || '—'} /><KV label="Maksepakk" value={batch ? batch.batch.batch_name || batch.batch.id.slice(0, 8) : '—'} />
        <div className={styles.sectionTitle} style={{ marginTop: 18 }}>Tarnija <Link href="/accounting/partners" className={styles.link} style={{ float: 'right', textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>Partneri kaart</Link></div><KV label="Registrikood" value={partner?.reg_code || '—'} /><KV label="KM kood" value={vatLabel(inv)} /><KV label="Vaikimisi kulukonto" value={accText(detail, ctx)} /><KV label="Avatud kokku" value={money(openTotal, inv.currency)} />
        <div className={styles.sectionTitle} style={{ marginTop: 18 }}>Kinnitamine</div><ApprovalTimeline inv={inv} ctx={ctx} />
        <div className={styles.sectionTitle} style={{ marginTop: 18 }}>Pangatehing</div><BankTx inv={inv} ctx={ctx} />
        <div className={styles.sectionTitle} style={{ marginTop: 18 }}>Manused</div>{doc ? <div className={styles.kv}><span>{doc.file_name || 'originaal'}</span><b><button className={styles.link} onClick={() => ctx.setPtab('pdf')}>Ava</button></b></div> : <div className={styles.kv}><span>Manus puudub</span><b><button className={styles.link} onClick={ctx.upload}>Lisa</button></b></div>}
      </aside></div>
    <ActionBar inv={inv} ctx={ctx} full /></section>;
}

function JournalModal({ journal, loading, inv, name, accounts, onClose }: { journal: JournalEntryRecord | null; loading: boolean; inv: InvoiceListItem | null; name: string; accounts: AccountOption[]; onClose: () => void }) {
  const accountMap = new Map(accounts.map((a) => [a.id, a])), debit = journal?.rows?.reduce((n, r) => n + Number(r.debit || 0), 0) || 0, credit = journal?.rows?.reduce((n, r) => n + Number(r.credit || 0), 0) || 0;
  return <div className={styles.modalBackdrop} onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><div className={styles.modal}><div className={styles.modalHeader}><div><h3>Arvega seotud kanded</h3><div className={styles.detailMeta}>Ostuarve {inv?.invoice_number} · {name} · {journal ? 1 : 0} kannet</div></div><button className={`${styles.button} ${styles.small}`} onClick={onClose}>Sulge</button></div>
    <div className={styles.modalBody}>{loading ? <div className={styles.empty} style={{ height: 180 }}><Loader2 size={20} className="animate-spin" /></div> : journal && <><div className={styles.journalGroup}><b>{journal.entry_number || journal.id.slice(0, 8)}</b> · {dateText(journal.entry_date)} · {journal.description || 'Ostuarve'}</div><div className={styles.journalHead}><span>Konto</span><span>Nimetus</span><span className={styles.alignRight}>Deebet</span><span className={styles.alignRight}>Kreedit</span></div>{journal.rows?.map((row) => <div className={styles.journalLine} key={row.id}><span>{accountMap.get(row.account_id)?.code || '—'}</span><span>{accountMap.get(row.account_id)?.name || row.description || '—'}</span><span className={`${styles.mono} ${styles.alignRight}`}>{Number(row.debit) > 0 ? money(row.debit) : '—'}</span><span className={`${styles.mono} ${styles.alignRight}`}>{Number(row.credit) > 0 ? money(row.credit) : '—'}</span></div>)}<div className={styles.journalSum}><span /><span>Kokku</span><span className={`${styles.mono} ${styles.alignRight}`}>{money(debit)}</span><span className={`${styles.mono} ${styles.alignRight}`}>{money(credit)}</span></div></>}</div>
    <div className={styles.modalFooter}><span>{Math.abs(debit - credit) < 0.005 ? 'Kanded on tasakaalus' : 'Kanded ei ole tasakaalus'}</span><div className={styles.modalFooterActions}><button className={styles.button} onClick={onClose}>Sulge</button>{journal && <Link className={`${styles.button} ${styles.primary}`} href={`/accounting/journal/${journal.id}/edit`}>Ava pearaamatus →</Link>}</div></div></div></div>;
}

function PaymentModal({ ids, invoices, ctx, bankAccounts, onClose, onDone }: { ids: string[]; invoices: InvoiceListItem[]; ctx: Ctx; bankAccounts: BankAccountRecord[]; onClose: () => void; onDone: (ids: string[]) => void }) {
  const picked = invoices.filter((r) => ids.includes(r.id)), lines = picked.filter((r) => payable(r) && !ctx.batches.has(r.id)), skipped = picked.length - lines.length;
  const [bankAccountId, setBankAccountId] = useState(bankAccounts[0]?.id || ''); const [date, setDate] = useState(new Date().toISOString().slice(0, 10)); const [grouping, setGrouping] = useState<'each' | 'payee'>('each'); const [prefill, setPrefill] = useState<Record<string, PaymentBatchPrefillLine>>({}); const [missing, setMissing] = useState<string[]>([]); const [busy, setBusy] = useState<null | 'save' | 'file'>(null);
  useEffect(() => { if (!bankAccountId && bankAccounts[0]) setBankAccountId(bankAccounts[0].id); }, [bankAccounts, bankAccountId]);
  useEffect(() => { if (!lines.length) return; let live = true; bankingApi.getPaymentBatchPrefillLines({ invoice_ids: lines.map((r) => r.id) }).then((res) => { if (!live) return; setPrefill(Object.fromEntries(res.lines.filter((l) => l.invoice_id).map((l) => [l.invoice_id!, l]))); setMissing(res.missing_supplier_bank_account_invoice_ids || []); }).catch((e) => showToast.error(getErrorMessage(e))); return () => { live = false; }; }, [ids]); // eslint-disable-line react-hooks/exhaustive-deps
  const rows = useMemo(() => {
    const base = lines.map((r) => { const p = prefill[r.id]; return { inv: r, payee: p?.payee_name || partnerName(r, ctx.partnerMap), iban: p?.payee_iban || '', bic: p?.payee_bic || undefined, reference: p?.reference || r.payment_reference || '', description: p?.description || r.invoice_number || '', amount: Number(p?.amount ?? openAmount(r)), due: r.due_date, ids: [r.id] }; });
    if (grouping === 'each') return base;
    const byPayee = new Map<string, (typeof base)[number]>();
    for (const b of base) { const key = `${b.payee}|${b.iban}`; const cur = byPayee.get(key); if (!cur) byPayee.set(key, { ...b }); else { cur.amount += b.amount; cur.reference = [cur.reference, b.reference].filter(Boolean).join(', '); cur.description = [cur.description, b.description].filter(Boolean).join(', '); cur.ids = [...cur.ids, ...b.ids]; if (b.due && (!cur.due || b.due < cur.due)) cur.due = b.due; } }
    return [...byPayee.values()];
  }, [lines, prefill, grouping, ctx.partnerMap]);
  const total = rows.reduce((n, r) => n + r.amount, 0);
  const save = async (file: boolean) => {
    if (!bankAccountId) { showToast.error('Vali maksja konto'); return; }
    if (rows.some((r) => !r.iban)) { showToast.error('Mõnel saajal puudub IBAN — lisa see partneri kaardile'); return; }
    setBusy(file ? 'file' : 'save');
    try {
      const created = await bankingApi.createPaymentBatch({ bank_account_id: bankAccountId, execution_date: date, lines: rows.map((r) => ({ invoice_id: grouping === 'each' ? r.ids[0] : null, amount: Math.round(r.amount * 100) / 100, payee_name: r.payee, payee_iban: r.iban, payee_bic: r.bic, reference: r.reference || undefined, description: r.description || undefined })) });
      if (file) { const gen = await bankingApi.generatePaymentBatchPain001(created.batch.id); const content = gen.batch.exported_file_content; if (content) downloadBlob(new Blob([String(content)], { type: 'application/xml' }), gen.batch.exported_file_name || `${gen.batch.batch_name || 'maksepakk'}.xml`); showToast.success('Pangafail loodud ja alla laaditud'); }
      else showToast.success(`Maksepakk ${created.batch.batch_name || ''} salvestatud`);
      onDone(lines.map((r) => r.id));
    } catch (e) { showToast.error(getErrorMessage(e)); } finally { setBusy(null); }
  };
  return <div className={styles.modalBackdrop} onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}><div className={`${styles.modal} ${styles.modalWide}`}>
    <div className={styles.modalHeader}><div><h3>Maksekorraldus</h3><div className={`${styles.detailMeta} ${styles.mono}`}>{lines.length} arvet · {new Set(rows.map((r) => r.payee)).size} saajat · kokku {money(total)}</div></div><button className={`${styles.button} ${styles.small} ${styles.ghost}`} onClick={onClose}>Sulge</button></div>
    <div className={styles.mfields}><label>Maksja konto<select className={styles.minp} value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)}>{bankAccounts.length === 0 && <option value="">Pangakontot pole seadistatud</option>}{bankAccounts.map((b) => <option key={b.id} value={b.id}>{b.bank_name || b.name} · {b.iban || ''}</option>)}</select></label><label>Maksekuupäev<input type="date" className={styles.minp} value={date} onChange={(e) => setDate(e.target.value)} /></label><label>Koondamine<select className={styles.minp} value={grouping} onChange={(e) => setGrouping(e.target.value as 'each' | 'payee')}><option value="each">Iga arve eraldi</option><option value="payee">Koonda saaja kaupa</option></select></label></div>
    {skipped > 0 && <div className={styles.pbnote}><b>{skipped}</b> valitud arvet jäid välja — need on mustandid, ootavad kinnitust või on juba maksepakis.</div>}
    {missing.length > 0 && <div className={styles.pbnote}><b>{missing.length}</b> arvel puudub tarnija IBAN — lisa see partneri kaardile enne faili loomist.</div>}
    <div className={styles.modalBody}><div className={styles.pbh}><div>Saaja</div><div>IBAN</div><div>Selgitus / viide</div><div>Tähtaeg</div><div className={styles.alignRight}>Summa</div></div>{rows.length === 0 ? <div className={styles.empty} style={{ height: 80 }}>Valitud arvetest pole ühtegi maksmisele</div> : rows.map((r, i) => <div className={styles.pbr} key={i}><div>{r.payee}</div><div className={styles.mono} style={{ fontSize: 11, color: r.iban ? undefined : '#c0392b' }}>{r.iban || 'IBAN puudub'}</div><div className={styles.mono} style={{ fontSize: 11 }} title={`${r.reference} · ${r.description}`}>{[r.reference, r.description].filter(Boolean).join(' · ')}</div><div className={styles.mono} style={r.due && lateDays(r.inv) > 0 ? { color: '#c0392b' } : undefined}>{dateText(r.due)}</div><div className={`${styles.mono} ${styles.alignRight}`} style={{ fontWeight: 600 }}>{money(r.amount)}</div></div>)}</div>
    <div className={styles.pbsum}><span>Makseid <b className={styles.mono}>{rows.length}</b></span><span>Kokku <b className={styles.mono}>{money(total)}</b></span></div>
    <div className={styles.modalFooter}><span style={{ fontSize: 11.5, color: 'var(--a-text-3)' }}>Arved märgitakse makstuks, kui pangatehing saabub ja seotakse</span><div className={styles.modalFooterActions}><button className={styles.button} onClick={onClose}>Loobu</button><button className={styles.button} disabled={!!busy || !rows.length} onClick={() => void save(false)}>{busy === 'save' && <Loader2 size={13} className="animate-spin" />}Salvesta maksepakina</button><button className={`${styles.button} ${styles.primary}`} disabled={!!busy || !rows.length} onClick={() => void save(true)}>{busy === 'file' && <Loader2 size={13} className="animate-spin" />}Laadi pangafail (pain.001)</button></div></div>
  </div></div>;
}
