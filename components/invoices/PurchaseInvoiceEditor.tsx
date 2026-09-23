'use client';

/**
 * Purchase invoice editor — implements docs2/design_handoff_purchase_invoice_edit.
 * Same shell, grid, line mechanics and right panel as SalesInvoiceEditor; adds the original (PDF)
 * tab with zoom, the comparison against the recognised total, supplier-side checks (duplicate
 * supplier invoice number, IBAN vs partner card) and editable GL accounts in the journal preview.
 * Copy is Estonian by design (the handoff's strings are final).
 */

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import {
  useCallback, useEffect, useMemo, useRef, useState,
  type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode,
} from 'react';
import { Loader2 } from 'lucide-react';
import { accountingApi, type AccountOption, type AccountingSettings, type PartnerRecord, type SupplierBankAccount } from '@/lib/api/accounting.api';
import { getErrorMessage } from '@/lib/api/client';
import { importApi, type PurchaseInvoiceImportListItem } from '@/lib/api/import.api';
import { invoicesApi, type InvoiceDetail, type InvoiceDraftPayload, type InvoiceLine, type InvoiceListItem } from '@/lib/api/invoices.api';
import { tenantsApi, type TenantMember } from '@/lib/api/tenants.api';
import { costCentersApi, projectsApi, dimensionLabel, groupProjects, type CostCenter, type Project } from '@/lib/api/dimensions.api';
import { useAuthStore } from '@/lib/stores/auth.store';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { showToast } from '@/components/ui/Toast';
import styles from './PurchaseInvoiceEditor.module.css';

const PdfViewer = dynamic(() => import('./PdfViewer'), { ssr: false });

type SupplyType = 'domestic' | 'intra_community' | 'reverse_charge' | 'third_country';
type VatCode = { key: string; label: string; short: string; rate: number; supply: SupplyType };
type Term = { d: number; l: string };
type Extra = { hinote: boolean; hcc: boolean; hprj: boolean; lcc: boolean; lprj: boolean };
type Menu = 'fields' | 'terms' | 'partner' | null;
type CheckState = 'ok' | 'warn' | 'err';
type Check = { s: CheckState; t: ReactNode };
type RTab = 'sum' | 'pdf';
type Zoom = 'fit' | number;
type Gl = { vat: string; ap: string; ded: number };

type Line = {
  key: number;
  description: string;
  account_id: string;
  cost_center: string;
  project: string;
  quantity: string;
  unit: string;
  unit_price: string;
};

type Header = {
  partnerId: string;
  partnerName: string;
  sinv: string;
  currency: string;
  issued: string;
  due: string;
  iban: string;
  ref: string;
  desc: string;
  inote: string;
  vatc: string;
  approverId: string;
  costCenter: string;
  project: string;
};

// Purchase-side codes: the rate drives every line; EU service = reverse charge (0%, KMD lisa).
const VAT_CODES: VatCode[] = [
  { key: 'd24', label: 'Siseriiklik 24%', short: '24%', rate: 24, supply: 'domestic' },
  { key: 'd22', label: 'Siseriiklik 22%', short: '22%', rate: 22, supply: 'domestic' },
  { key: 'd9', label: 'Siseriiklik 9%', short: '9%', rate: 9, supply: 'domestic' },
  { key: 'eus', label: 'EU teenus (pöördmaks)', short: 'EU teenus', rate: 0, supply: 'reverse_charge' },
  { key: 'ex', label: 'Maksuvaba', short: 'Maksuvaba', rate: 0, supply: 'domestic' },
];
const UNITS = ['tk', 'pk', 'h', 'kuu', 'km', 'l'];
const CURRENCIES = ['EUR', 'USD', 'SEK'];
const TERM_CHIPS = [7, 14, 30];
const DEFAULT_TERMS: Term[] = [0, 7, 10, 14, 21, 30, 45, 60].map((d) => ({ d, l: d === 0 ? 'Kohe' : `${d} päeva` }));
const DEFAULT_EXTRA: Extra = { hinote: false, hcc: false, hprj: false, lcc: false, lprj: false };
const KEYS = { extra: 'arvelo.pinv.edit.extra', coll: 'arvelo.pinv.edit.coll', rail: 'arvelo.pinv.edit.rail', rtab: 'arvelo.pinv.edit.rtab', pw: (t: RTab) => `arvelo.pinv.edit.pw.${t}`, terms: 'arvelo.inv.terms' };
const DEFAULT_PW: Record<RTab, number> = { sum: 330, pdf: 460 };
const MIN_PW: Record<RTab, number> = { sum: 260, pdf: 360 };
const MIN_EDITOR = 620, SHELL_MIN = 1180, GUTTER = 9;
const DED_CHIPS = [100, 50, 0];
const IMPORT_NOTE = /^Imported from purchase invoice import\b/i;

let lineKeySeq = 0;
const nextKey = () => ++lineKeySeq;
const r2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: string | number) => { const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const fmtNum = (n: number) => n.toLocaleString('et-EE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = (n: number, currency: string) => {
  try { return new Intl.NumberFormat('et-EE', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n); }
  catch { return `${fmtNum(n)} ${currency}`; }
};
const isoToEt = (iso?: string | null) => { const m = iso ? /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) : null; return m ? `${m[3]}.${m[2]}.${m[1]}` : ''; };
const etToIso = (s: string) => {
  const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
  return d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[1] ? d.toISOString().slice(0, 10) : null;
};
const addDaysEt = (et: string, days: number) => { const iso = etToIso(et); if (!iso) return null; const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return isoToEt(d.toISOString().slice(0, 10)); };
const daysBetweenEt = (a: string, b: string) => { const x = etToIso(a), y = etToIso(b); return x && y ? Math.round((Date.parse(y) - Date.parse(x)) / 86_400_000) : null; };
const todayEt = () => isoToEt(new Date().toISOString().slice(0, 10));
const timeText = (d: Date | string) => new Intl.DateTimeFormat('et-EE', { hour: '2-digit', minute: '2-digit' }).format(new Date(d));
const dateText = (d?: Date | string | null) => (d ? isoToEt(new Date(d).toISOString()) : '—');
const initials = (name: string) => name.split(/\s+/).filter((w) => w.length > 2).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'A';
const hue = (name: string) => { let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
const readJson = <T,>(key: string, fallback: T): T => { try { const raw = localStorage.getItem(key); return raw ? { ...fallback, ...JSON.parse(raw) } : fallback; } catch { return fallback; } };
const memberName = (m?: TenantMember | null) => (m ? m.user.name || m.user.email : '');
const shortName = (name: string) => { const parts = name.trim().split(/\s+/); return parts.length > 1 ? `${parts[0][0]}. ${parts.slice(1).join(' ')}` : name; };
const normIban = (s: string) => s.replace(/\s/g, '').toUpperCase();
const ibanValid = (s: string) => /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(normIban(s));
const fmtIban = (s: string) => normIban(s).replace(/(.{4})/g, '$1 ').trim();
const nz = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : null; };

function vatCodeFor(lines: InvoiceLine[], meta: Record<string, unknown> | null | undefined, vatEnabled: boolean): string {
  if (!vatEnabled) return 'ex';
  if (meta?.vat_code && VAT_CODES.some((c) => c.key === meta.vat_code)) return String(meta.vat_code);
  const first = lines[0];
  if (!first) return 'd24';
  const rate = Number(first.tax_rate || 0), supply = (first.supply_type || 'domestic') as SupplyType;
  return VAT_CODES.find((c) => c.supply === supply && c.rate === rate)?.key || (rate === 0 ? 'ex' : 'd24');
}

function lineFrom(line: InvoiceLine): Line {
  const meta = (line.meta || {}) as Record<string, unknown>;
  return {
    key: nextKey(),
    description: line.description || '',
    account_id: line.account_id || '',
    cost_center: String(meta.cost_center_id || ''),
    project: String(meta.project_id || ''),
    quantity: String(Number(line.quantity ?? 1)),
    unit: String(meta.unit || 'tk'),
    unit_price: fmtNum(Number(line.unit_price || 0)),
  };
}

function headerFrom(detail: InvoiceDetail, vatEnabled: boolean): Header {
  const inv = detail.invoice, m = (inv.meta || {}) as Record<string, unknown>;
  const notes = inv.notes || '';
  return {
    partnerId: inv.partner_id || '',
    partnerName: inv.partner_name || '',
    sinv: inv.invoice_number || '',
    currency: inv.currency || 'EUR',
    issued: isoToEt(inv.invoice_date),
    due: isoToEt(inv.due_date),
    iban: String(m.supplier_iban || ''),
    ref: inv.payment_reference || '',
    desc: String(m.payment_description || ''),
    // The import's own note is bookkeeping, it never becomes an internal note the user has to clean up.
    inote: String(m.internal_note || (IMPORT_NOTE.test(notes) ? '' : notes)),
    vatc: vatCodeFor(detail.lines, m, vatEnabled),
    approverId: String(m.approver_user_id || ''),
    costCenter: String(m.cost_center_id || ''),
    project: String(m.project_id || ''),
  };
}
function glFrom(detail: InvoiceDetail | undefined): Gl | null {
  const m = (detail?.invoice.meta || {}) as Record<string, unknown>;
  if (!m.gl_vat_account_id && !m.gl_ap_account_id && m.vat_deduction_pct == null) return null;
  return { vat: String(m.gl_vat_account_id || ''), ap: String(m.gl_ap_account_id || ''), ded: m.vat_deduction_pct != null ? Number(m.vat_deduction_pct) : 100 };
}

const emptyHeader = (vatEnabled: boolean): Header => ({
  partnerId: '', partnerName: '', sinv: '', currency: 'EUR', issued: '', due: '', iban: '', ref: '', desc: '', inote: '',
  vatc: vatEnabled ? 'd24' : 'ex', approverId: '', costCenter: '', project: '',
});
const newLine = (base: Partial<Line> = {}): Line => ({ key: nextKey(), description: '', account_id: '', cost_center: '', project: '', quantity: '1', unit: 'tk', unit_price: '', ...base });

type Props = { mode: 'create' | 'edit'; invoiceId?: string; initial?: InvoiceDetail };

export default function PurchaseInvoiceEditor({ mode, invoiceId, initial }: Props) {
  const router = useRouter();
  const { tenant, user } = useAuthStore();
  const vatEnabled = tenant ? Boolean(tenant.is_vat_registered) : true;

  const [id, setId] = useState<string | null>(invoiceId || null);
  const [invoice, setInvoice] = useState<InvoiceListItem | null>(initial?.invoice || null);
  const [hdr, setHdr] = useState<Header>(() => (initial ? headerFrom(initial, vatEnabled) : emptyHeader(vatEnabled)));
  const [lines, setLines] = useState<Line[]>(() => (initial ? initial.lines.map(lineFrom) : []));
  const [glOverride, setGlOverride] = useState<Gl | null>(() => glFrom(initial));
  const [loading, setLoading] = useState(mode === 'edit' && !initial);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [busy, setBusy] = useState<null | 'save' | 'submit' | 'approve' | 'reject' | 'delete' | 'upload'>(null);

  const [partners, setPartners] = useState<PartnerRecord[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [settings, setSettings] = useState<AccountingSettings | null>(null);
  const [balances, setBalances] = useState<Map<string, number>>(new Map());
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [purchases, setPurchases] = useState<InvoiceListItem[]>([]);
  const [supplierIbans, setSupplierIbans] = useState<Record<string, SupplierBankAccount[]>>({});
  const [imports, setImports] = useState<PurchaseInvoiceImportListItem[]>([]);
  const [docUrl, setDocUrl] = useState<{ id: string; url: string } | null>(null);

  const [extra, setExtra] = useState<Extra>(DEFAULT_EXTRA);
  const [coll, setColl] = useState(false);
  const [rail, setRail] = useState(true);
  const [rtab, setRtab] = useState<RTab>('sum');
  const [pws, setPws] = useState<Record<RTab, number>>(DEFAULT_PW);
  const [resizing, setResizing] = useState(false);
  const [zoom, setZoom] = useState<Zoom>('fit');
  const [fitZoom, setFitZoom] = useState(1);
  const [pdfPages, setPdfPages] = useState(0);
  const [gledit, setGledit] = useState(false);
  const [flashAcc, setFlashAcc] = useState<number | null>(null);
  const [menu, setMenu] = useState<Menu>(null);
  const [terms, setTerms] = useState<Term[]>(DEFAULT_TERMS);
  const [newTerm, setNewTerm] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const shellRef = useRef<HTMLDivElement>(null);
  const partnerRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pdfBoxRef = useRef<HTMLDivElement | null>(null);
  const descRefs = useRef(new Map<number, HTMLInputElement | null>());
  const accRefs = useRef(new Map<number, HTMLSelectElement | null>());
  const pendingFocus = useRef<number | null>(null);

  const touch = useCallback(() => setDirty(true), []);
  const setH = useCallback((patch: Partial<Header>) => { setHdr((h) => ({ ...h, ...patch })); setDirty(true); }, []);

  /* ── persisted UI prefs + defaults for a new invoice ── */
  useEffect(() => {
    setExtra(readJson(KEYS.extra, DEFAULT_EXTRA));
    setColl(localStorage.getItem(KEYS.coll) === '1');
    setRail(localStorage.getItem(KEYS.rail) !== '0');
    const tab = localStorage.getItem(KEYS.rtab);
    if (tab === 'pdf' || tab === 'sum') setRtab(tab);
    setPws({ sum: Number(localStorage.getItem(KEYS.pw('sum'))) || DEFAULT_PW.sum, pdf: Number(localStorage.getItem(KEYS.pw('pdf'))) || DEFAULT_PW.pdf });
    try { const saved = JSON.parse(localStorage.getItem(KEYS.terms) || 'null'); if (Array.isArray(saved) && saved.length) setTerms(saved); } catch {}
    if (mode === 'create') {
      const issued = todayEt();
      setHdr((h) => (h.issued ? h : { ...h, issued, due: addDaysEt(issued, 14) || issued }));
      setLines((current) => (current.length ? current : [newLine()]));
    }
  }, [mode]);

  /* ── reference data ── */
  useEffect(() => {
    accountingApi.listPartners({ is_active: true }).then((rows) => setPartners(rows.filter((p) => p.type !== 'customer'))).catch(() => {});
    accountingApi.getAccounts().then(setAccounts).catch(() => {});
    accountingApi.getAccountingSettings().then(setSettings).catch(() => {});
    accountingApi.listPartnersWithBalances('supplier').then((rows) => setBalances(new Map(rows.map((r) => [r.id, Number(r.balance || 0)])))).catch(() => {});
    if (tenant?.id) tenantsApi.getMembers(tenant.id).then(setMembers).catch(() => {});
    costCentersApi.list().then(setCostCenters).catch(() => {});
    projectsApi.list().then(setProjects).catch(() => {});
    invoicesApi.listInvoices({ type: 'purchase_invoice', limit: 1000 }).then(setPurchases).catch(() => {});
  }, [tenant?.id]);

  /* ── originals: the newest import attached to this draft ── */
  const loadImports = useCallback(() => {
    if (!id) return;
    importApi.listPurchaseInvoiceImports({ limit: 500 }).then((res) => setImports(res.items.filter((r) => r.draft_invoice_id === id))).catch(() => {});
  }, [id]);
  useEffect(() => { loadImports(); }, [loadImports]);
  const doc = useMemo(() => [...imports].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).find((r) => r.document_id) || null, [imports]);
  const firstImport = useMemo(() => [...imports].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at))[0] || null, [imports]);
  useEffect(() => {
    const docId = doc?.document_id;
    if (!docId || docUrl?.id === docId || !rail || rtab !== 'pdf') return;
    let live = true;
    importApi.downloadDocument(docId).then((blob) => { if (live) setDocUrl({ id: docId, url: URL.createObjectURL(blob) }); }).catch((e) => live && showToast.error(getErrorMessage(e)));
    return () => { live = false; };
  }, [doc?.document_id, docUrl?.id, rail, rtab]);

  /* ── load the draft when the page did not pass it in ── */
  useEffect(() => {
    if (mode !== 'edit' || !invoiceId || initial) return;
    let live = true;
    setLoading(true);
    invoicesApi.getInvoice(invoiceId).then((detail) => {
      if (!live) return;
      setInvoice(detail.invoice); setHdr(headerFrom(detail, vatEnabled)); setLines(detail.lines.map(lineFrom)); setGlOverride(glFrom(detail));
    }).catch((e) => live && setLoadError(getErrorMessage(e))).finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [mode, invoiceId, initial, vatEnabled]);

  const partner = useMemo(() => partners.find((p) => p.id === hdr.partnerId) || null, [partners, hdr.partnerId]);

  /* ── supplier bank accounts for the IBAN check ── */
  useEffect(() => {
    const pid = hdr.partnerId;
    if (!pid || supplierIbans[pid]) return;
    accountingApi.getSupplierBankAccounts(pid).then((rows) => setSupplierIbans((m) => ({ ...m, [pid]: rows.filter((r) => r.is_active !== false) }))).catch(() => setSupplierIbans((m) => ({ ...m, [pid]: [] })));
  }, [hdr.partnerId, supplierIbans]);
  const partnerIbans = useMemo(() => (hdr.partnerId ? supplierIbans[hdr.partnerId] || [] : []), [supplierIbans, hdr.partnerId]);
  const partnerDefaultIban = partnerIbans.find((r) => r.is_default)?.iban || partnerIbans[0]?.iban || partner?.einvoice_iban || '';

  /* ── fill what the draft does not carry yet from the partner card (not a user change) ── */
  useEffect(() => {
    if (!partner) return;
    setHdr((h) => {
      const patch: Partial<Header> = {};
      if (!h.partnerName) patch.partnerName = partner.name;
      if (!h.iban.trim() && partnerDefaultIban) patch.iban = fmtIban(partnerDefaultIban);
      return Object.keys(patch).length ? { ...h, ...patch } : h;
    });
  }, [partner, partnerDefaultIban]);

  /* ── focus management ── */
  useEffect(() => {
    if (pendingFocus.current === null) return;
    const el = descRefs.current.get(pendingFocus.current);
    pendingFocus.current = null;
    el?.focus();
  }, [lines]);

  // On window, not document: the app router hydrates the whole document, so React's delegated
  // handlers live on document and a stopPropagation() inside them cannot shield a document listener.
  useEffect(() => {
    const close = () => setMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const guard = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener('beforeunload', guard);
    return () => window.removeEventListener('beforeunload', guard);
  }, [dirty]);

  /* ── derived ── */
  const vat = useMemo(() => VAT_CODES.find((c) => c.key === hdr.vatc) || VAT_CODES[0], [hdr.vatc]);
  const rate = vatEnabled ? vat.rate : 0;
  const expenseAccounts = useMemo(() => accounts.filter((a) => a.is_active && a.type === 'expense'), [accounts]);
  const assetAccounts = useMemo(() => accounts.filter((a) => a.is_active && a.type === 'asset' && /^1[5-9]/.test(a.code)), [accounts]);
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const lineNet = (l: Line) => r2(num(l.quantity) * num(l.unit_price));
  const totals = useMemo(() => {
    const net = r2(lines.reduce((s, l) => s + lineNet(l), 0));
    // VAT is rounded per line, exactly as the database computes it.
    const vatAmt = r2(lines.reduce((s, l) => s + r2(lineNet(l) * rate / 100), 0));
    return { net, vat: vatAmt, tot: r2(net + vatAmt) };
  }, [lines, rate]);
  const termDays = useMemo(() => daysBetweenEt(hdr.issued, hdr.due), [hdr.issued, hdr.due]);
  const status = invoice?.status || 'draft';
  const isDraft = !invoice || status === 'draft' || status === 'rejected';
  const isPending = status === 'pending_approval';
  const editable = isDraft;
  const approverName = useMemo(() => {
    const m = members.find((x) => x.user.id === hdr.approverId);
    return m ? memberName(m) : '';
  }, [members, hdr.approverId]);
  const approverShort = approverName ? shortName(approverName) : '';
  const balance = hdr.partnerId ? balances.get(hdr.partnerId) : undefined;
  const expenseDefault = settings?.purchase_expense_account_id || '';

  /* ── source + recognised values ── */
  const srcInfo = useMemo(() => {
    const s = String(invoice?.source || '').toLowerCase();
    if (!invoice) return null;
    if (s.includes('einvoice') || s.includes('peppol') || s.includes('gateway')) return { l: 'E-arve', t: 'Saabus e-arvena operaatori kaudu' };
    if (s.includes('bank')) return { l: 'Pank', t: `Mustand loodi pangatehingust ${dateText(invoice.invoice_date)}` };
    if (s.includes('csv') || s.includes('bolt')) return { l: 'CSV import', t: `CSV import ${dateText(invoice.created_at)}` };
    if (s.includes('pdf') || s.includes('ocr') || s.includes('openai') || s.includes('import') || firstImport) return { l: 'PDF import', t: `PDF üles laaditud ${dateText(firstImport?.created_at || invoice.created_at)} · andmed tuvastatud automaatselt` };
    return null;
  }, [invoice, firstImport]);
  const ocr = useMemo(() => {
    const pd = (firstImport?.preview_data || {}) as Record<string, unknown>;
    const total = nz(pd.total);
    const rows = Array.isArray(pd.lines) ? pd.lines.length : 0;
    return total != null ? { total, rows } : null;
  }, [firstImport]);
  const ocrDiff = ocr ? r2(totals.tot - ocr.total) : null;
  const ocrMatch = ocrDiff != null && Math.abs(ocrDiff) < 0.01;

  /* ── supplier invoice number uniqueness (same supplier, other invoices) ── */
  const duplicateOf = useMemo(() => {
    const n = hdr.sinv.trim().toLowerCase();
    if (!n || !hdr.partnerId) return null;
    return purchases.find((p) => p.id !== id && p.partner_id === hdr.partnerId && String(p.invoice_number || '').trim().toLowerCase() === n && p.status !== 'cancelled') || null;
  }, [purchases, hdr.sinv, hdr.partnerId, id]);

  /* ── IBAN vs partner card ── */
  const ibanState: 'empty' | 'invalid' | 'match' | 'differs' | 'unknown' = useMemo(() => {
    const v = normIban(hdr.iban);
    if (!v) return 'empty';
    if (!ibanValid(v)) return 'invalid';
    if (!partnerIbans.length && !partner?.einvoice_iban) return 'unknown';
    const known = [...partnerIbans.map((r) => normIban(r.iban)), ...(partner?.einvoice_iban ? [normIban(partner.einvoice_iban)] : [])];
    return known.includes(v) ? 'match' : 'differs';
  }, [hdr.iban, partnerIbans, partner?.einvoice_iban]);

  /* ── a pristine new line takes the default expense account once settings arrive ── */
  useEffect(() => {
    if (!expenseDefault) return;
    setLines((ls) => (ls.some((l) => !l.account_id && !l.description.trim()) ? ls.map((l) => (!l.account_id && !l.description.trim() ? { ...l, account_id: expenseDefault } : l)) : ls));
  }, [expenseDefault]);

  const checks = useMemo<Check[]>(() => {
    const out: Check[] = [];
    out.push(partner ? { s: 'ok', t: <>Tarnija <b>{partner.name}</b> seotud</> } : { s: 'err', t: 'Tarnija on valimata' });
    const sinv = hdr.sinv.trim();
    if (!sinv) out.push({ s: 'err', t: 'Tarnija arve nr puudub' });
    else if (duplicateOf) out.push({ s: 'err', t: <>Arve <b>{sinv}</b> on juba sisestatud ({dateText(duplicateOf.invoice_date)})</> });
    else out.push({ s: 'ok', t: <>Arve nr <b>{sinv}</b> pole varem sisestatud</> });
    if (ocr && ocrDiff != null) {
      if (ocrMatch) out.push({ s: 'ok', t: <>Summa klapib originaaliga <b>{money(ocr.total, hdr.currency)}</b></> });
      else out.push({ s: 'warn', t: <>Summa erineb originaalist <b>{ocrDiff > 0 ? '+' : ''}{money(ocrDiff, hdr.currency)}</b></> });
    }
    const noDesc = lines.filter((l) => !l.description.trim()).length;
    const noAcc = lines.filter((l) => !l.account_id).length;
    if (!lines.length) out.push({ s: 'err', t: 'Arvel pole ridu' });
    else if (noDesc) out.push({ s: 'err', t: <><b>{noDesc}</b> rida ilma kirjelduseta</> });
    else if (noAcc) out.push({ s: 'err', t: <><b>{noAcc}</b> rida ilma kulukontota</> });
    else out.push({ s: 'ok', t: 'Kulukonto määratud kõigil ridadel' });
    if (ibanState === 'invalid') out.push({ s: 'err', t: 'IBAN ei ole kehtiv' });
    else if (ibanState === 'differs') out.push({ s: 'warn', t: 'IBAN erineb partneri kaardist — kontrolli' });
    else if (ibanState === 'match') out.push({ s: 'ok', t: 'IBAN klapib partneri kaardiga' });
    const a = etToIso(hdr.issued), b = etToIso(hdr.due);
    if (!a || !b) out.push({ s: 'err', t: 'Kuupäev vormis pp.kk.aaaa' });
    else if (b < a) out.push({ s: 'err', t: 'Maksetähtaeg on enne arve kuupäeva' });
    if (extra.lcc) { const n = lines.filter((l) => !l.cost_center.trim()).length; if (n) out.push({ s: 'warn', t: <><b>{n}</b> rida ilma kulukohata</> }); }
    if (extra.lprj) { const n = lines.filter((l) => !l.project.trim()).length; if (n) out.push({ s: 'warn', t: <><b>{n}</b> rida ilma projektita</> }); }
    if (vat.supply === 'reverse_charge' && vatEnabled) out.push({ s: 'warn', t: 'Pöördmaks — KM arvestatakse deklaratsioonis (KMD lisa)' });
    return out;
  }, [partner, hdr.sinv, hdr.issued, hdr.due, hdr.currency, duplicateOf, ocr, ocrDiff, ocrMatch, lines, ibanState, extra.lcc, extra.lprj, vat.supply, vatEnabled]);
  const hasErrors = checks.some((c) => c.s === 'err');
  const worst: CheckState = hasErrors ? 'err' : checks.some((c) => c.s === 'warn') ? 'warn' : 'ok';

  /* ── GL accounts: defaults from settings, overrides kept in invoice meta ── */
  const glVatOptions = useMemo(() => accounts.filter((a) => a.is_active && (a.type === 'asset' || a.type === 'liability') && /^(15|27)/.test(a.code) && /käibemaks|vat/i.test(a.name)), [accounts]);
  const glApOptions = useMemo(() => accounts.filter((a) => a.is_active && a.type === 'liability' && /^2[12]/.test(a.code)), [accounts]);
  const glDefault = useMemo<Gl>(() => ({ vat: settings?.vat_input_account_id || glVatOptions[0]?.id || '', ap: settings?.accounts_payable_account_id || glApOptions[0]?.id || '', ded: 100 }), [settings, glVatOptions, glApOptions]);
  const gl: Gl = useMemo(() => ({ vat: glOverride?.vat || glDefault.vat, ap: glOverride?.ap || glDefault.ap, ded: glOverride?.ded ?? glDefault.ded }), [glOverride, glDefault]);
  const glChanged = gl.vat !== glDefault.vat || gl.ap !== glDefault.ap || gl.ded !== glDefault.ded;
  const setGl = (patch: Partial<Gl>) => { setGlOverride({ ...gl, ...patch }); touch(); };
  const resetGl = () => { setGlOverride(null); setGledit(false); touch(); showToast.info('Üldkontod taastatud vaikeväärtustele'); };

  const journal = useMemo(() => {
    const vatD = r2(totals.vat * gl.ded / 100), vatN = r2(totals.vat - vatD);
    const byAcc = new Map<string, number>();
    lines.forEach((l) => byAcc.set(l.account_id, r2((byAcc.get(l.account_id) || 0) + lineNet(l))));
    // Non-deductible VAT spreads over the expense accounts by their share; the last one takes the rounding.
    if (vatN && totals.net) {
      const keys = [...byAcc.keys()]; let rest = vatN;
      keys.forEach((k, i) => { const part = i === keys.length - 1 ? rest : r2(vatN * (byAcc.get(k) || 0) / totals.net); byAcc.set(k, r2((byAcc.get(k) || 0) + part)); rest = r2(rest - part); });
    }
    const name = (accountId: string, fallback: string) => { const a = accountMap.get(accountId); return a ? { code: a.code, name: a.name } : { code: '—', name: fallback }; };
    const expense = [...byAcc.entries()].map(([accountId, v]) => ({ accountId, ...name(accountId, 'Kulukonto määramata'), d: v }));
    return { vatD, vatN, expense, vatAcc: name(gl.vat, 'Sisendkäibemaks'), apAcc: name(gl.ap, 'Võlad tarnijatele') };
  }, [lines, totals, gl, accountMap]);

  const lcols = useMemo(() => [
    { id: 'ix', w: '22px', l: '' }, { id: 'desc', w: 'minmax(130px,1fr)', l: 'Kirjeldus' }, { id: 'acc', w: '136px', l: 'Kulukonto' },
    ...(extra.lcc ? [{ id: 'cc', w: '96px', l: 'Kulukoht' }] : []), ...(extra.lprj ? [{ id: 'prj', w: '104px', l: 'Projekt' }] : []),
    { id: 'qty', w: '52px', l: 'Kogus', r: true }, { id: 'unit', w: '50px', l: 'Ühik' }, { id: 'price', w: '86px', l: 'Ühikuhind', r: true },
    { id: 'vat', w: '50px', l: 'KM' }, { id: 'sum', w: '92px', l: 'Rea summa', r: true }, { id: 'act', w: '46px', l: '' },
  ], [extra.lcc, extra.lprj]);

  const partnerMatches = useMemo(() => {
    const q = hdr.partnerName.trim().toLowerCase();
    const pool = !q || (partner && q === partner.name.toLowerCase()) ? partners : partners.filter((p) => `${p.name} ${p.reg_code || ''}`.toLowerCase().includes(q));
    return pool.slice(0, 40);
  }, [partners, partner, hdr.partnerName]);

  /* ── UI prefs: panel open, active tab, a width per tab ── */
  const pw = pws[rtab];
  const clampPw = useCallback((v: number, tab: RTab) => Math.max(MIN_PW[tab], Math.min(v, Math.max(SHELL_MIN, shellRef.current?.clientWidth || SHELL_MIN) - GUTTER - MIN_EDITOR)), []);
  useEffect(() => { const onResize = () => setPws((p) => ({ sum: clampPw(p.sum, 'sum'), pdf: clampPw(p.pdf, 'pdf') })); window.addEventListener('resize', onResize); return () => window.removeEventListener('resize', onResize); }, [clampPw]);
  const toggleRail = (open: boolean) => { setRail(open); localStorage.setItem(KEYS.rail, open ? '1' : '0'); };
  const pickTab = (tab: RTab) => { setRtab(tab); localStorage.setItem(KEYS.rtab, tab); if (!rail) toggleRail(true); };
  const toggleColl = () => { setColl((v) => { localStorage.setItem(KEYS.coll, v ? '0' : '1'); return !v; }); };
  const setExtraKeys = (patch: Partial<Extra>, on: boolean) => {
    setExtra((e) => { const next = { ...e, ...patch }; localStorage.setItem(KEYS.extra, JSON.stringify(next)); return next; });
    showToast.info(on ? 'Väli lisatud' : 'Väli eemaldatud');
  };
  const resizePanel = (e: ReactPointerEvent) => {
    e.preventDefault();
    const tab = rtab, x0 = e.clientX, w0 = clampPw(pw, tab);
    setResizing(true);
    const move = (ev: PointerEvent) => setPws((p) => ({ ...p, [tab]: clampPw(w0 - (ev.clientX - x0), tab) }));
    const up = (ev: PointerEvent) => {
      setResizing(false);
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      const final = clampPw(w0 - (ev.clientX - x0), tab); setPws((p) => ({ ...p, [tab]: final })); localStorage.setItem(KEYS.pw(tab), String(final));
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };
  const resetPw = () => { localStorage.removeItem(KEYS.pw(rtab)); setPws((p) => ({ ...p, [rtab]: DEFAULT_PW[rtab] })); };

  /* ── zoom: fit-to-width recomputes while the panel is resized ── */
  const setPdfBox = useCallback((el: HTMLDivElement | null) => { pdfBoxRef.current = el; if (el) setFitZoom(Math.max(0.3, (el.clientWidth - 2) / 600)); }, []);
  useEffect(() => { const el = pdfBoxRef.current; if (el) setFitZoom(Math.max(0.3, (el.clientWidth - 2) / 600)); }, [pw, rail, rtab]);
  const zoomValue = zoom === 'fit' ? fitZoom : zoom;
  const stepZoom = (dir: 1 | -1) => setZoom((z) => Math.min(3, Math.max(0.3, Math.round(((z === 'fit' ? fitZoom : z) + dir * 0.25) * 4) / 4)));

  /* ── dimension options: the supplier's own projects first, everything else after ── */
  const projectGroups = useMemo(() => groupProjects(projects, hdr.partnerId), [projects, hdr.partnerId]);
  const CostCenterOptions = ({ current }: { current: string }) => (
    <>
      <option value="">—</option>
      {current && !costCenters.some((c) => c.id === current) && <option value={current}>(tundmatu kulukoht)</option>}
      {costCenters.map((c) => <option key={c.id} value={c.id}>{dimensionLabel(c)}</option>)}
    </>
  );
  const ProjectOptions = ({ current }: { current: string }) => (
    <>
      <option value="">—</option>
      {current && !projects.some((p) => p.id === current) && <option value={current}>(tundmatu projekt)</option>}
      {projectGroups.own.length > 0 && <optgroup label="Tarnija projektid">{projectGroups.own.map((p) => <option key={p.id} value={p.id}>{dimensionLabel(p)}</option>)}</optgroup>}
      {projectGroups.other.length > 0 && <optgroup label={projectGroups.own.length ? 'Muud projektid' : 'Projektid'}>{projectGroups.other.map((p) => <option key={p.id} value={p.id}>{dimensionLabel(p)}</option>)}</optgroup>}
    </>
  );
  const projectPatch = (projectId: string): { project: string; costCenter?: string } => {
    const p = projects.find((x) => x.id === projectId);
    return p?.cost_center_id ? { project: projectId, costCenter: p.cost_center_id } : { project: projectId };
  };
  const AccountOptions = ({ current }: { current: string }) => (
    <>
      <option value="">—</option>
      {current && !accountMap.has(current) && <option value={current}>(tundmatu konto)</option>}
      {expenseAccounts.map((a) => <option key={a.id} value={a.id} title={`${a.code} ${a.name}`}>{a.code} {a.name}</option>)}
      {assetAccounts.length > 0 && <optgroup label="Vara">{assetAccounts.map((a) => <option key={a.id} value={a.id} title={`${a.code} ${a.name}`}>{a.code} {a.name}</option>)}</optgroup>}
    </>
  );

  /* ── header actions ── */
  const pickPartner = (p: PartnerRecord) => {
    const due = p.payment_terms_days != null ? addDaysEt(hdr.issued, p.payment_terms_days) : null;
    setH({ partnerId: p.id, partnerName: p.name, iban: '', ...(due ? { due } : {}) });
    setMenu(null);
    partnerRef.current?.blur();
  };
  const setDue = (days: number) => { const due = addDaysEt(hdr.issued, days); if (due) setH({ due }); };
  const addTerm = () => {
    const n = parseInt(newTerm, 10);
    if (Number.isNaN(n) || n < 0) return;
    setTerms((t) => { const next = t.some((x) => x.d === n) ? t : [...t, { d: n, l: n === 0 ? 'Kohe' : `${n} päeva` }].sort((a, b) => a.d - b.d); localStorage.setItem(KEYS.terms, JSON.stringify(next)); return next; });
    setDue(n); setNewTerm(''); setMenu(null); showToast.info('Maksetingimus lisatud');
  };

  /* ── line actions ── */
  const updateLine = (i: number, patch: Partial<Line>) => { setLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...patch } : l))); touch(); };
  const removeLine = (i: number) => {
    setLines((ls) => { const next = ls.filter((_, k) => k !== i); const target = next[Math.min(i, next.length - 1)]; pendingFocus.current = target ? target.key : null; return next; });
    touch(); showToast.info('Rida kustutatud');
  };
  const dupLine = (i: number) => { setLines((ls) => { const copy = { ...ls[i], key: nextKey() }; return [...ls.slice(0, i + 1), copy, ...ls.slice(i + 1)]; }); touch(); showToast.info('Rida kopeeritud'); };
  const addLine = () => {
    const last = lines[lines.length - 1];
    const line = newLine({ account_id: last?.account_id || expenseDefault, cost_center: last?.cost_center || hdr.costCenter, project: last?.project || hdr.project, unit: last?.unit || 'tk' });
    pendingFocus.current = line.key;
    setLines((ls) => [...ls, line]); touch();
  };
  const moveLine = (from: number, to: number) => { if (from === to) return; setLines((ls) => { const next = [...ls]; const [m] = next.splice(from, 1); next.splice(to, 0, m); return next; }); touch(); };
  const rowKeys = (e: ReactKeyboardEvent<HTMLDivElement>, i: number) => {
    const target = e.target as HTMLElement;
    if (e.key === 'Enter' && target.tagName === 'INPUT') {
      e.preventDefault();
      if (i === lines.length - 1) addLine(); else descRefs.current.get(lines[i + 1].key)?.focus();
    }
    if (e.key === 'Backspace' && e.altKey) { e.preventDefault(); removeLine(i); }
  };
  /** Clicking an expense row in the journal jumps to the first line that books there. */
  const jumpToAccount = (accountId: string) => {
    const i = lines.findIndex((l) => l.account_id === accountId);
    if (i < 0) return;
    accRefs.current.get(lines[i].key)?.focus();
    setFlashAcc(i); setTimeout(() => setFlashAcc(null), 900);
  };

  /* ── persistence ── */
  const validationMessage = () => {
    if (!hdr.partnerId) return 'Vali tarnija enne salvestamist';
    if (!lines.length) return 'Lisa arvele vähemalt üks rida';
    if (lines.some((l) => !l.description.trim())) return 'Igal real peab olema kirjeldus';
    if (lines.some((l) => num(l.quantity) <= 0)) return 'Kogus peab olema suurem kui 0';
    if (!etToIso(hdr.issued) || !etToIso(hdr.due)) return 'Kuupäev vormis pp.kk.aaaa';
    return null;
  };
  const buildPayload = (): InvoiceDraftPayload => ({
    type: 'purchase_invoice',
    partner_id: hdr.partnerId,
    invoice_number: hdr.sinv.trim() || undefined,
    invoice_date: etToIso(hdr.issued)!,
    due_date: etToIso(hdr.due) || undefined,
    currency: hdr.currency,
    notes: hdr.inote.trim() || undefined,
    payment_reference: hdr.ref.trim() || undefined,
    meta: {
      ...(invoice?.meta || {}),
      internal_note: hdr.inote.trim(), supplier_iban: normIban(hdr.iban), payment_description: hdr.desc.trim(), approver_user_id: hdr.approverId || undefined,
      cost_center_id: hdr.costCenter || undefined, project_id: hdr.project || undefined, cost_center: undefined, project: undefined, vat_code: vat.key,
      gl_vat_account_id: glOverride ? glOverride.vat || undefined : undefined, gl_ap_account_id: glOverride ? glOverride.ap || undefined : undefined, vat_deduction_pct: glOverride ? glOverride.ded : undefined,
    },
    lines: lines.map((l) => {
      const meta: Record<string, string> = {};
      if (l.unit.trim()) meta.unit = l.unit.trim();
      if (l.cost_center) meta.cost_center_id = l.cost_center;
      if (l.project) meta.project_id = l.project;
      return { description: l.description.trim(), account_id: l.account_id || undefined, quantity: num(l.quantity), unit_price: num(l.unit_price), discount_percent: 0, tax_rate: rate, supply_type: vat.supply, meta: Object.keys(meta).length ? meta : undefined };
    }),
  });
  const save = async (): Promise<InvoiceDetail | null> => {
    const problem = validationMessage();
    if (problem) { showToast.error(problem); return null; }
    setBusy('save');
    try {
      const result = id ? await invoicesApi.updateInvoice(id, buildPayload()) : await invoicesApi.createInvoice(buildPayload());
      setInvoice(result.invoice);
      if (!id) { setId(result.invoice.id); window.history.replaceState(null, '', `/invoices/${result.invoice.id}/edit`); }
      setDirty(false); setSavedAt(new Date());
      showToast.success('Mustand salvestatud');
      return result;
    } catch (e) { showToast.error(getErrorMessage(e)); return null; }
    finally { setBusy(null); }
  };
  const submit = async () => {
    if (hasErrors) { showToast.error('Paranda kontrolli vead enne saatmist'); return; }
    let currentId = id;
    if (dirty || !currentId) { const saved = await save(); if (!saved) return; currentId = saved.invoice.id; }
    setBusy('submit');
    try {
      const r = await invoicesApi.submitApproval(currentId!);
      setInvoice(r.invoice); setDirty(false);
      showToast.success(`Saadetud kinnitamiseks${approverShort ? ` · ${approverShort}` : ''}`);
      router.push('/invoices/purchase');
    } catch (e) { showToast.error(getErrorMessage(e)); }
    finally { setBusy(null); }
  };
  const approve = async () => {
    if (!id) return;
    setBusy('approve');
    try {
      const a = await invoicesApi.approve(id); setInvoice(a.invoice);
      try { const c = await invoicesApi.confirm(id); setInvoice(c.invoice); } catch { /* stays approved */ }
      showToast.success(`Arve ${hdr.sinv || ''} kinnitatud`);
      router.push('/invoices/purchase');
    } catch (e) { showToast.error(getErrorMessage(e)); }
    finally { setBusy(null); }
  };
  const reject = async () => {
    if (!id) return;
    const why = window.prompt('Tagasilükkamise põhjus', '');
    if (why === null) return;
    setBusy('reject');
    try { const r = await invoicesApi.reject(id, why || undefined); setInvoice(r.invoice); showToast.success(`Arve ${hdr.sinv || ''} tagasi lükatud`); router.push('/invoices/purchase'); }
    catch (e) { showToast.error(getErrorMessage(e)); }
    finally { setBusy(null); }
  };
  const deleteDraft = async () => {
    if (!id) return;
    setBusy('delete');
    try { await invoicesApi.deleteInvoice(id); setDirty(false); showToast.success('Mustand kustutatud'); router.push('/invoices/purchase'); }
    catch (e) { showToast.error(getErrorMessage(e)); }
    finally { setBusy(null); }
  };
  const cancel = () => { if (dirty) setConfirmCancel(true); else router.push('/invoices/purchase'); };

  /* ── original: upload / replace / download ── */
  const uploadOriginal = async (file: File) => {
    let currentId = id;
    if (!currentId) { const saved = await save(); if (!saved) return; currentId = saved.invoice.id; }
    setBusy('upload');
    try {
      await importApi.uploadPurchaseInvoicePdf(file, { target_invoice_id: currentId! });
      setDocUrl(null); loadImports(); pickTab('pdf');
      showToast.success(doc ? 'Originaal asendatud' : 'Originaal seotud arvega');
    } catch (e) { showToast.error(getErrorMessage(e)); }
    finally { setBusy(null); }
  };
  const downloadDoc = () => { if (!docUrl) return; const a = document.createElement('a'); a.href = docUrl.url; a.download = doc?.file_name || 'originaal'; a.click(); };

  /* ── keyboard: ⌘S save · ⌘K supplier · ⌘O original · Esc cancel · + − 0 zoom ── */
  const latest = useRef({ save, cancel, dirty, busy, menu, rtab, rail, dialogOpen: confirmCancel || confirmDelete, editable });
  latest.current = { save, cancel, dirty, busy, menu, rtab, rail, dialogOpen: confirmCancel || confirmDelete, editable };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = latest.current, mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); if (s.dirty && !s.busy && s.editable) void s.save(); return; }
      if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); partnerRef.current?.select(); setMenu('partner'); return; }
      if (mod && e.key.toLowerCase() === 'o') { e.preventDefault(); pickTab(s.rtab === 'pdf' && s.rail ? 'sum' : 'pdf'); return; }
      if (e.key === 'Escape') {
        if (s.dialogOpen) return;
        if (s.menu) { setMenu(null); return; }
        s.cancel(); return;
      }
      const tag = (document.activeElement as HTMLElement | null)?.tagName || '';
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag)) return;
      if (s.rtab === 'pdf' && s.rail) {
        if (e.key === '+' || e.key === '=') { e.preventDefault(); stepZoom(1); }
        else if (e.key === '-') { e.preventDefault(); stepZoom(-1); }
        else if (e.key === '0') { e.preventDefault(); setZoom('fit'); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers read through `latest`
  }, []);

  /* ── render ── */
  const savedText = savedAt ? `Salvestatud ${timeText(savedAt)}` : invoice ? `Salvestatud ${timeText(invoice.updated_at)}` : 'Uus mustand';
  const statusTag = !invoice || status === 'draft' ? { l: 'Mustand', c: styles.draft }
    : status === 'rejected' ? { l: 'Tagasi lükatud', c: styles.rej }
    : status === 'pending_approval' ? { l: 'Ootab kinnitust', c: styles.pend }
    : status === 'paid' ? { l: 'Makstud', c: styles.paid } : { l: 'Kinnitatud', c: styles.sent };
  const avatarHue = hue(hdr.partnerName || 'A');
  const approverOptions = members.length ? members.map((m) => ({ id: m.user.id, name: memberName(m) })) : user ? [{ id: user.id, name: user.name || user.email }] : [];
  if (hdr.approverId && !approverOptions.some((o) => o.id === hdr.approverId)) approverOptions.push({ id: hdr.approverId, name: 'Tundmatu kasutaja' });
  const showInote = extra.hinote || !!hdr.inote.trim();
  const moreOn = termDays !== null && !TERM_CHIPS.includes(termDays);
  const unitOptions = (u: string) => (UNITS.includes(u) || !u ? UNITS : [...UNITS, u]);
  const sinvMeta = !hdr.sinv.trim() ? null : duplicateOf ? { t: 'juba sisestatud', c: styles.bad } : { t: 'unikaalne', c: styles.ok };
  const ibanMeta = ibanState === 'match' ? { t: 'kehtiv · partneri kaardilt', c: styles.ok } : ibanState === 'differs' ? { t: 'erineb partneri kaardist', c: styles.bad } : ibanState === 'invalid' ? { t: 'vigane', c: styles.bad } : ibanState === 'unknown' ? { t: 'kehtiv', c: styles.ok } : null;
  const OcrChip = ({ variant }: { variant: 'lines' | 'panel' }) => ocr && ocrDiff != null ? (
    ocrMatch ? <span className={`${styles.ocr} ${styles.ocrOk}`} title={`Originaalil ${money(ocr.total, hdr.currency)}`}>✓ klapib originaaliga</span>
      : <span className={`${styles.ocr} ${styles.ocrBad}`} title={`Originaalil ${money(ocr.total, hdr.currency)}`}>{variant === 'lines' ? `originaalist ${ocrDiff > 0 ? '+' : ''}${fmtNum(ocrDiff)} €` : `originaalil ${money(ocr.total, hdr.currency)}`}</span>
  ) : null;
  const bankDraft = !!invoice?.bank_transaction_id;
  const history = useMemo(() => {
    const rows: Array<{ d: string; t: string; s: 'done' | 'wait' | 'bad' | '' }> = [];
    if (firstImport) { rows.push({ d: dateText(firstImport.created_at), t: 'PDF üles laaditud', s: 'done' }); rows.push({ d: dateText(firstImport.created_at), t: `Andmed tuvastatud · ${ocr?.rows ?? 0} rida`, s: 'done' }); }
    else if (invoice) rows.push({ d: dateText(invoice.created_at), t: srcInfo?.l === 'Pank' ? 'Mustand loodud pangatehingust' : 'Mustand loodud', s: 'done' });
    rows.push(dirty ? { d: '—', t: 'Salvestamata muudatused', s: '' } : savedAt || invoice ? { d: dateText(savedAt || invoice!.updated_at), t: `Mustand salvestatud ${timeText(savedAt || invoice!.updated_at)}`, s: 'done' } : { d: '—', t: 'Salvestamata', s: '' });
    if (status === 'rejected') rows.push({ d: dateText(invoice?.rejected_at), t: `Tagasi lükatud${invoice?.rejection_reason ? `: ${invoice.rejection_reason}` : ''}`, s: 'bad' });
    else if (isPending) rows.push({ d: dateText(invoice?.approval_requested_at), t: `Ootab kinnitust${approverShort ? ` · ${approverShort}` : ''}`, s: 'wait' });
    else if (invoice?.approved_at) rows.push({ d: dateText(invoice.approved_at), t: `Kinnitatud · ${memberName(members.find((m) => m.user.id === invoice.approved_by_user_id)) || '—'}`, s: 'done' });
    else rows.push({ d: '—', t: `Kinnitamine${approverShort ? ` · ${approverShort}` : ''}`, s: '' });
    return rows;
  }, [firstImport, invoice, srcInfo, dirty, savedAt, status, isPending, approverShort, ocr, members]);

  return (
    <div ref={shellRef} className={`${styles.shell} ${resizing ? styles.resizing : ''}`}>
      <input ref={fileRef} type="file" accept=".pdf,image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadOriginal(f); e.target.value = ''; }} />
      <div className={styles.topbar}>
        <div className={styles.crumb}><Link href="/invoices/purchase">← Ostuarved</Link><span className={styles.sep}>/</span></div>
        <h1 className={`${styles.title} ${styles.mono}`}>{hdr.sinv.trim() || invoice?.invoice_number || 'Uus ostuarve'}</h1>
        <span className={`${styles.tag} ${statusTag.c}`}><span className={styles.dot} />{statusTag.l}</span>
        {srcInfo && <span className={`${styles.tag} ${styles.info}`} title={srcInfo.t}><span className={styles.dot} />{srcInfo.l}</span>}
        <div className={styles.acts}>
          <span className={`${styles.dirty} ${dirty ? '' : styles.clean}`}><span className={styles.dot} />{dirty ? 'Salvestamata muudatused' : savedText}</span>
          <button type="button" className={`${styles.btn} ${styles.ghost}`} onClick={cancel}>Loobu <kbd className={styles.kbd}>Esc</kbd></button>
          {isPending ? (
            <>
              <button type="button" className={styles.btn} disabled={!!busy || loading} onClick={() => void reject()}>{busy === 'reject' && <Loader2 size={13} className="animate-spin" />}Lükka tagasi</button>
              <button type="button" className={`${styles.btn} ${styles.primary}`} disabled={!!busy || loading} onClick={() => void approve()}>{busy === 'approve' && <Loader2 size={13} className="animate-spin" />}Kinnita</button>
            </>
          ) : (
            <>
              <button type="button" className={styles.btn} disabled={!dirty || !!busy || loading || !editable} onClick={() => void save()}>{busy === 'save' && <Loader2 size={13} className="animate-spin" />}Salvesta mustand <kbd className={styles.kbd}>⌘S</kbd></button>
              <button type="button" className={`${styles.btn} ${styles.primary}`} disabled={!!busy || loading || !editable} title={hasErrors ? 'Paranda kontrolli vead enne saatmist' : undefined} onClick={() => void submit()}>{busy === 'submit' && <Loader2 size={13} className="animate-spin" />}Saada kinnitamiseks</button>
            </>
          )}
          <button type="button" className={`${styles.btn} ${styles.ghost}`} title={rail ? 'Peida paneel' : 'Näita paneeli'} onClick={() => toggleRail(!rail)}>
            <svg className={styles.icon} viewBox="0 0 24 24"><path d="M3 5h18v14H3zM15 5v14" /></svg> <span className={styles.raillbl}>{rail ? 'Peida paneel' : 'Näita paneeli'}</span>
          </button>
        </div>
      </div>

      <div className={`${styles.body} ${rail ? '' : styles.norail}`} style={{ '--pw': `${clampPw(pw, rtab)}px` } as CSSProperties}>
        <div className={styles.left}>
          {loading ? <div className={styles.loading}><Loader2 size={20} className="animate-spin" /></div> : (
            <div className={styles.lscroll}>
              {loadError && <div className={styles.notice} style={{ marginTop: 10 }}>{loadError}</div>}
              {status === 'rejected' && <div className={styles.rejectNote} style={{ marginTop: 10 }}>Tagasi lükatud: {invoice?.rejection_reason || 'põhjus märkimata'}. Paranda ja saada uuesti kinnitamiseks.</div>}
              <div className={`${styles.sec} ${styles.form} ${coll ? styles.collapsed : ''}`}>
                <div className={styles.fbar}>
                  <span className={styles.mwrap} onClick={(e) => e.stopPropagation()}>
                    <button type="button" className={styles.collbtn} title="Lisa välju" onClick={() => setMenu(menu === 'fields' ? null : 'fields')}><svg className={styles.icon} viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg></button>
                    {menu === 'fields' && (
                      <div className={styles.menu} style={{ width: 214 }}>
                        <div className={styles.mh}>Ainult arvel</div>
                        <label className={styles.mlabel}><input type="checkbox" checked={showInote} onChange={(e) => setExtraKeys({ hinote: e.target.checked }, e.target.checked)} /> Sisemärkus</label>
                        <div className={styles.mh} style={{ paddingTop: 7 }}>Arvel ja ridadel</div>
                        <label className={styles.mlabel}><input type="checkbox" checked={extra.hcc} onChange={(e) => setExtraKeys({ hcc: e.target.checked, lcc: e.target.checked }, e.target.checked)} /> Kulukoht</label>
                        <label className={styles.mlabel}><input type="checkbox" checked={extra.hprj} onChange={(e) => setExtraKeys({ hprj: e.target.checked, lprj: e.target.checked }, e.target.checked)} /> Projekt</label>
                        <div className={styles.mh} style={{ paddingTop: 7 }}>Ainult ridadel</div>
                        <label className={styles.mlabel}><input type="checkbox" checked={extra.lcc} onChange={(e) => setExtraKeys({ lcc: e.target.checked }, e.target.checked)} /> Kulukoht real</label>
                        <label className={styles.mlabel}><input type="checkbox" checked={extra.lprj} onChange={(e) => setExtraKeys({ lprj: e.target.checked }, e.target.checked)} /> Projekt real</label>
                      </div>
                    )}
                  </span>
                  <button type="button" className={styles.collbtn} title={coll ? 'Ava arve andmed' : 'Ahenda arve andmed'} onClick={toggleColl}>{coll ? '▸' : '▾'}</button>
                </div>
                <div className={styles.csum}>
                  <b>{hdr.partnerName || 'Tarnija valimata'}</b><span className={styles.s}>·</span><span className={styles.mono}>{hdr.sinv || '—'}</span><span className={styles.s}>·</span>
                  <span className={styles.mono}>{hdr.issued || '—'}</span> → <span className={styles.mono}>{hdr.due || '—'}</span><span className={styles.s}>·</span>{vat.short}<span className={styles.s}>·</span>kinnitab {approverShort || '—'}
                </div>
                <div className={styles.fgrid}>
                  <div className={`${styles.fld} ${styles.wide}`}>
                    <div className={styles.lbl}>Tarnija <span className={styles.r}>{partner ? `Reg ${partner.reg_code || '—'} · avatud ${money(balance ?? 0, hdr.currency)}` : 'vali tarnija'}</span></div>
                    <div className={styles.partner} onClick={(e) => e.stopPropagation()}>
                      <span className={styles.av} style={{ background: `oklch(0.92 0.045 ${avatarHue})`, color: `oklch(0.36 0.09 ${avatarHue})` }}>{initials(hdr.partnerName || '?')}</span>
                      <input ref={partnerRef} value={hdr.partnerName} placeholder="Otsi tarnijat…" disabled={!editable} onChange={(e) => { setHdr((h) => ({ ...h, partnerName: e.target.value })); setMenu('partner'); }} onFocus={() => setMenu('partner')}
                        onBlur={() => { setMenu((m) => (m === 'partner' ? null : m)); if (partner) setHdr((h) => ({ ...h, partnerName: partner.name })); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' && partnerMatches[0]) { e.preventDefault(); pickPartner(partnerMatches[0]); } }} />
                      <button type="button" className={styles.pmeta} tabIndex={-1} onMouseDown={(e) => { e.preventDefault(); partnerRef.current?.focus(); partnerRef.current?.select(); setMenu('partner'); }}>Vaheta ⌘K</button>
                      {menu === 'partner' && editable && (
                        <div className={styles.plist}>
                          {partnerMatches.length ? partnerMatches.map((p) => (
                            <button key={p.id} type="button" className={`${styles.pitem} ${p.id === hdr.partnerId ? styles.pitemOn : ''}`} onMouseDown={(e) => { e.preventDefault(); pickPartner(p); }}>
                              <span className={styles.n}>{p.name}</span><span className={`${styles.d} ${styles.mono}`}>{p.reg_code ? `Reg ${p.reg_code}` : ''}</span>
                            </button>
                          )) : <div className={styles.pempty}>Tarnijat ei leitud</div>}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`${styles.fld} ${styles.mid}`}>
                    <div className={styles.lbl}>Tarnija arve nr {sinvMeta && <span className={`${styles.r} ${sinvMeta.c}`}>{sinvMeta.t}</span>}</div>
                    <input className={`${styles.inp} ${styles.mono} ${duplicateOf ? styles.inpWarn : ''}`} value={hdr.sinv} placeholder="Nr tarnija arvelt" disabled={!editable} onChange={(e) => setH({ sinv: e.target.value })} />
                  </div>
                  <div className={styles.fld}>
                    <div className={styles.lbl} style={{ paddingRight: 46 }}>Valuuta</div>
                    <select className={styles.inp} value={hdr.currency} disabled={!editable} onChange={(e) => setH({ currency: e.target.value })}>{(CURRENCIES.includes(hdr.currency) ? CURRENCIES : [...CURRENCIES, hdr.currency]).map((c) => <option key={c}>{c}</option>)}</select>
                  </div>

                  <div className={styles.fld}><div className={styles.lbl}>Arve kuupäev</div><input className={`${styles.inp} ${styles.mono}`} value={hdr.issued} placeholder="pp.kk.aaaa" disabled={!editable} onChange={(e) => setH({ issued: e.target.value })} /></div>
                  <div className={styles.fld}><div className={styles.lbl}>Maksetähtaeg</div><input className={`${styles.inp} ${styles.mono}`} value={hdr.due} placeholder="pp.kk.aaaa" disabled={!editable} onChange={(e) => setH({ due: e.target.value })} /></div>
                  <div className={styles.fld}>
                    <div className={styles.lbl}>Maksetingimus</div>
                    <div className={styles.chips} onClick={(e) => e.stopPropagation()}>
                      {TERM_CHIPS.map((d) => <button key={d} type="button" className={`${styles.chip} ${termDays === d ? styles.chipOn : ''}`} disabled={!editable} onClick={() => setDue(d)}>{d}p</button>)}
                      <button type="button" className={`${styles.chip} ${moreOn ? styles.chipOn : ''}`} title="Kõik maksetingimused" disabled={!editable} onClick={() => setMenu(menu === 'terms' ? null : 'terms')}>{moreOn ? `${termDays}p` : '···'}</button>
                      {menu === 'terms' && (
                        <div className={`${styles.menu} ${styles.menuLeft}`} style={{ top: 24 }}>
                          <div className={styles.mh}>Maksetingimus</div>
                          {terms.map((t) => <button key={t.d} type="button" className={`${styles.mrow} ${t.d === termDays ? styles.mrowOn : ''}`} onClick={() => { setDue(t.d); setMenu(null); }}>{t.l}<span className={styles.d}>{t.d}p</span></button>)}
                          <div className={styles.msep} />
                          <div className={styles.madd}><span>+ Lisa</span><input value={newTerm} inputMode="numeric" placeholder="päeva" onChange={(e) => setNewTerm(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTerm(); } }} /><button type="button" onClick={addTerm}>Lisa</button></div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`${styles.fld} ${styles.mid}`}>
                    <div className={styles.lbl}>Saaja IBAN {ibanMeta && <span className={`${styles.r} ${ibanMeta.c}`}>{ibanMeta.t}</span>}</div>
                    <input className={`${styles.inp} ${styles.mono} ${ibanState === 'invalid' || ibanState === 'differs' ? styles.inpWarn : ''}`} value={hdr.iban} placeholder="EE00 0000 0000 0000 0000" disabled={!editable} onChange={(e) => setH({ iban: e.target.value })} onBlur={(e) => { if (ibanValid(e.target.value)) setHdr((h) => ({ ...h, iban: fmtIban(e.target.value) })); }} />
                  </div>
                  <div className={styles.fld}><div className={styles.lbl}>Viitenumber</div><input className={`${styles.inp} ${styles.mono}`} value={hdr.ref} disabled={!editable} onChange={(e) => setH({ ref: e.target.value })} /></div>

                  <div className={`${styles.fld} ${styles.wide}`}><div className={styles.lbl}>Selgitus <span className={styles.r}>maksekorraldusele</span></div><input className={styles.inp} value={hdr.desc} placeholder={hdr.sinv ? `Arve ${hdr.sinv}` : 'Kasutatakse, kui viitenumbrit pole'} disabled={!editable} onChange={(e) => setH({ desc: e.target.value })} /></div>
                  <div className={styles.fld}>
                    <div className={styles.lbl}>KM kood</div>
                    <select className={styles.inp} value={hdr.vatc} disabled={!vatEnabled || !editable} onChange={(e) => setH({ vatc: e.target.value })}>{VAT_CODES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select>
                  </div>
                  <div className={`${styles.fld} ${styles.mid}`}>
                    <div className={styles.lbl}>Kinnitaja <span className={styles.r}>saab teavituse</span></div>
                    <select className={styles.inp} value={hdr.approverId} disabled={!editable} onChange={(e) => setH({ approverId: e.target.value })}><option value="">—</option>{approverOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
                  </div>
                  {showInote && <div className={`${styles.fld} ${styles.wide}`}><div className={styles.lbl}>Sisemärkus <span className={styles.r}>ainult raamatupidajale</span></div><input className={styles.inp} value={hdr.inote} disabled={!editable} onChange={(e) => setH({ inote: e.target.value })} /></div>}
                  {extra.hcc && <div className={styles.fld}><div className={styles.lbl}>Kulukoht <span className={styles.r}>ridadel</span></div><select className={styles.inp} value={hdr.costCenter} disabled={!editable} onChange={(e) => setH({ costCenter: e.target.value })}><CostCenterOptions current={hdr.costCenter} /></select></div>}
                  {extra.hprj && <div className={styles.fld}><div className={styles.lbl}>Projekt <span className={styles.r}>ridadel</span></div><select className={styles.inp} value={hdr.project} disabled={!editable} onChange={(e) => setH(projectPatch(e.target.value))}><ProjectOptions current={hdr.project} /></select></div>}
                </div>
              </div>

              <div className={`${styles.sec} ${styles.linesec}`}>
                <div className={styles.lines} style={{ '--lcols': lcols.map((c) => c.w).join(' ') } as CSSProperties}>
                  <div className={styles.lh}>{lcols.map((c) => <div key={c.id} className={c.r ? styles.r : ''}>{c.l}</div>)}</div>
                  <div className={styles.rows}>
                    {lines.length === 0 && <div className={styles.empty}>Ridu pole — lisa esimene rida</div>}
                    {lines.map((l, i) => {
                      const acc = l.account_id ? accountMap.get(l.account_id) : null;
                      return (
                        <div key={l.key} className={`${styles.lr} ${dragIndex === i ? styles.dragging : ''} ${overIndex === i || flashAcc === i ? styles.over : ''}`}
                          onDragOver={(e) => { e.preventDefault(); if (overIndex !== i) setOverIndex(i); }} onDrop={(e) => { e.preventDefault(); if (dragIndex !== null) moveLine(dragIndex, i); setDragIndex(null); setOverIndex(null); }}
                          onKeyDown={(e) => rowKeys(e, i)}>
                          <div className={`${styles.ix} ${styles.mono}`} title="Lohista järjestamiseks" draggable={editable} onDragStart={() => setDragIndex(i)} onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}>{i + 1}</div>
                          <div><input ref={(el) => { descRefs.current.set(l.key, el); }} className={`${styles.in} ${l.description.trim() ? '' : styles.miss}`} value={l.description} placeholder="Kirjeldus" disabled={!editable} onChange={(e) => updateLine(i, { description: e.target.value })} /></div>
                          <div>
                            <select ref={(el) => { accRefs.current.set(l.key, el); }} className={`${styles.in} ${styles.sel} ${l.account_id ? '' : styles.miss}`} value={l.account_id} title={acc ? `${acc.code} ${acc.name}` : 'Kulukonto määramata'} disabled={!editable} onChange={(e) => updateLine(i, { account_id: e.target.value })}>
                              <AccountOptions current={l.account_id} />
                            </select>
                          </div>
                          {extra.lcc && <div><select className={`${styles.in} ${styles.sel}`} value={l.cost_center} title={costCenters.find((c) => c.id === l.cost_center)?.name || 'Kulukoht'} disabled={!editable} onChange={(e) => updateLine(i, { cost_center: e.target.value })}><CostCenterOptions current={l.cost_center} /></select></div>}
                          {extra.lprj && <div><select className={`${styles.in} ${styles.sel}`} value={l.project} title={projects.find((p) => p.id === l.project)?.name || 'Projekt'} disabled={!editable} onChange={(e) => { const patch = projectPatch(e.target.value); updateLine(i, { project: patch.project, ...(patch.costCenter ? { cost_center: patch.costCenter } : {}) }); }}><ProjectOptions current={l.project} /></select></div>}
                          <div><input className={`${styles.in} ${styles.r}`} inputMode="decimal" value={l.quantity} disabled={!editable} onChange={(e) => updateLine(i, { quantity: e.target.value })} /></div>
                          <div><select className={`${styles.in} ${styles.sel}`} value={l.unit} disabled={!editable} onChange={(e) => updateLine(i, { unit: e.target.value })}>{unitOptions(l.unit).map((u) => <option key={u}>{u}</option>)}</select></div>
                          <div><input className={`${styles.in} ${styles.r} ${styles.mono}`} inputMode="decimal" value={l.unit_price} placeholder="0,00" disabled={!editable} onChange={(e) => updateLine(i, { unit_price: e.target.value })} onBlur={(e) => { if (e.target.value.trim()) updateLine(i, { unit_price: fmtNum(num(e.target.value)) }); }} /></div>
                          <div className={styles.rate}>{rate}%</div>
                          <div className={styles.sum}>{fmtNum(lineNet(l))}</div>
                          <div className={styles.ra}>
                            <button type="button" className={styles.iconbtn} title="Kopeeri rida" tabIndex={-1} disabled={!editable} onClick={() => dupLine(i)}>⧉</button>
                            <button type="button" className={`${styles.iconbtn} ${styles.del}`} title="Kustuta rida" tabIndex={-1} disabled={!editable} onClick={() => removeLine(i)}>✕</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className={styles.addrow}>
                    <button type="button" className={`${styles.btn} ${styles.sm} ${styles.ghost}`} disabled={!editable} onClick={addLine}><svg className={styles.icon} viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg> Lisa rida</button>
                    <button type="button" className={`${styles.btn} ${styles.sm} ${styles.ghost}`} disabled={!editable} title="Jaga üks summa mitme kulukonto vahel" onClick={() => showToast.info('Jaga summa: vali kontod ja osakaalud — read luuakse automaatselt')}>Jaga kontodele</button>
                    <span className={styles.hint}><kbd className={styles.kbd}>⏎</kbd> viimasel real lisab uue · <kbd className={styles.kbd}>⌥⌫</kbd> kustutab rea</span>
                  </div>
                  <div className={styles.ltot}>
                    <div className={`${styles.lcount} ${styles.mono}`}>{lines.length} rida <OcrChip variant="lines" /></div>
                    <div className={styles.cells}>
                      <Cell k="Neto" v={money(totals.net, hdr.currency)} />
                      <Cell k={`KM ${rate}%`} v={money(totals.vat, hdr.currency)} />
                      <Cell k="Kokku" v={money(totals.tot, hdr.currency)} cls={styles.big} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className={styles.footbar}>
            <div className={styles.fhint}><span><kbd className={styles.kbd}>⌘S</kbd> salvesta</span><span><kbd className={styles.kbd}>⌘O</kbd> originaal</span><span><kbd className={styles.kbd}>Esc</kbd> loobu</span></div>
            <div className={styles.fr}>
              <button type="button" className={`${styles.btn} ${styles.sm} ${styles.ghost} ${styles.danger}`} disabled={!id || !!busy || !isDraft} onClick={() => setConfirmDelete(true)}>Kustuta mustand</button>
            </div>
          </div>
        </div>

        <div className={`${styles.gutter} ${resizing ? styles.gutterActive : ''}`} title="Lohista paneeli laiust · topeltklikk lähtestab" onPointerDown={resizePanel} onDoubleClick={resetPw} />

        <div className={styles.right}>
          <div className={styles.rhead}>
            <span className={styles.seg}>
              <button type="button" className={rtab === 'sum' ? styles.segOn : ''} onClick={() => pickTab('sum')}>Kokkuvõte <span className={`${styles.sdot} ${worst === 'err' ? styles.sdotErr : worst === 'warn' ? styles.sdotWarn : ''}`} /></button>
              <button type="button" className={rtab === 'pdf' ? styles.segOn : ''} onClick={() => pickTab('pdf')}>Originaal</button>
            </span>
            <span className={styles.r}><button type="button" className={styles.iconbtn} title="Peida paneel" onClick={() => toggleRail(false)}>✕</button></span>
          </div>

          {rtab === 'sum' && (
            <div className={styles.rbody}>
              <div className={styles.sec}>
                <div className={styles.sech}>Tarnija<span className={styles.r}><Link href="/accounting/partners">Partneri kaart</Link></span></div>
                <div className={styles.kv}><span>Registrikood</span><b className={styles.mono}>{partner?.reg_code || '—'}</b></div>
                <div className={styles.kv}><span>Vaikimisi kulukonto</span><b>{expenseDefault && accountMap.get(expenseDefault) ? `${accountMap.get(expenseDefault)!.code} ${accountMap.get(expenseDefault)!.name}` : '—'}</b></div>
                <div className={styles.kv}><span>Varasemad arved</span><b className={styles.mono}>{(() => { const prev = purchases.filter((p) => p.partner_id === hdr.partnerId && p.id !== id); return prev.length ? `${prev.length} · keskm. ${money(r2(prev.reduce((s, p) => s + Number(p.total || 0), 0) / prev.length), hdr.currency)}` : '—'; })()}</b></div>
                <div className={styles.kv}><span>Avatud kokku</span><b className={styles.mono}>{balance != null ? money(balance, hdr.currency) : '—'}</b></div>
              </div>
              <div className={styles.sec}>
                <div className={styles.sech}>Kokku tasuda<span className={`${styles.r} ${styles.mono}`}>tähtaeg {hdr.due || '—'}</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><div className={`${styles.bigTotal} ${styles.mono}`}>{money(totals.tot, hdr.currency)}</div><span style={{ marginLeft: 'auto' }}><OcrChip variant="panel" /></span></div>
                <div className={styles.sub}>{lines.length} rida · {vat.label} · kinnitab {approverShort || '—'}</div>
              </div>
              <div className={styles.sec}>
                <div className={styles.sech}>Kontroll</div>
                {checks.map((c, i) => <div key={i} className={`${styles.chk} ${c.s === 'ok' ? '' : c.s === 'warn' ? styles.warn : styles.err}`}><span className={styles.m}>{c.s === 'ok' ? '✓' : '!'}</span><span>{c.t}</span></div>)}
              </div>
              <div className={styles.sec}>
                <div className={styles.sech}>Konteering
                  <span className={styles.r}>
                    {glChanged && <><span className={styles.chg} style={{ fontWeight: 600 }}>muudetud</span> · <button type="button" className={styles.link} onClick={resetGl}>Taasta</button> · </>}
                    <button type="button" className={styles.link} onClick={() => setGledit((v) => !v)}>{gledit ? 'Valmis' : glChanged ? 'Muuda' : 'Muuda kontosid'}</button>
                  </span>
                </div>
                <div className={styles.jt}>
                  <div className={styles.jh}><div>Konto</div><div>Nimetus</div><div className={styles.r}>Deebet</div><div className={styles.r}>Kreedit</div></div>
                  {journal.expense.map((r) => (
                    <div key={r.accountId || 'none'} className={`${styles.jr} ${styles.jl}`} title="Rea kulukonto — muuda ridadel" onClick={() => jumpToAccount(r.accountId)}>
                      <div className={styles.mono}>{r.code}</div><div className={styles.n}>{r.name}{journal.vatN ? <span style={{ color: 'var(--a-text-3)' }}> + KM</span> : null}</div><div className={styles.a}>{fmtNum(r.d)}</div><div className={`${styles.a} ${styles.z}`}>—</div>
                    </div>
                  ))}
                  {journal.vatD > 0 && (gledit ? (
                    <div className={`${styles.jr} ${styles.jrEdit}`}><div><select className={`${styles.glsel} ${styles.mono}`} value={gl.vat} onChange={(e) => setGl({ vat: e.target.value })}>{glVatOptions.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}</select></div><div className={styles.a}>{fmtNum(journal.vatD)}</div><div className={`${styles.a} ${styles.z}`}>—</div></div>
                  ) : (
                    <div className={styles.jr}><div className={`${styles.mono} ${gl.vat !== glDefault.vat ? styles.chg : ''}`}>{journal.vatAcc.code}</div><div className={styles.n}>{journal.vatAcc.name}</div><div className={styles.a}>{fmtNum(journal.vatD)}</div><div className={`${styles.a} ${styles.z}`}>—</div></div>
                  ))}
                  {gledit ? (
                    <div className={`${styles.jr} ${styles.jrEdit}`}><div><select className={`${styles.glsel} ${styles.mono}`} value={gl.ap} onChange={(e) => setGl({ ap: e.target.value })}>{glApOptions.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}</select></div><div className={`${styles.a} ${styles.z}`}>—</div><div className={styles.a}>{fmtNum(totals.tot)}</div></div>
                  ) : (
                    <div className={styles.jr}><div className={`${styles.mono} ${gl.ap !== glDefault.ap ? styles.chg : ''}`}>{journal.apAcc.code}</div><div className={styles.n}>{journal.apAcc.name}</div><div className={`${styles.a} ${styles.z}`}>—</div><div className={styles.a}>{fmtNum(totals.tot)}</div></div>
                  )}
                </div>
                {gledit && totals.vat > 0 && (
                  <div className={styles.glbox}>KM mahaarvamine<span className={styles.chips}>{DED_CHIPS.map((p) => <button key={p} type="button" className={`${styles.chip} ${gl.ded === p ? styles.chipOn : ''}`} onClick={() => setGl({ ded: p })}>{p}%</button>)}</span></div>
                )}
                <div className={styles.jnote}>{journal.vatN ? `Maha arvamata KM ${money(journal.vatN, hdr.currency)} lisatud kulukontodele. Kanne tekib arve kinnitamisel.` : 'Kanne tekib arve kinnitamisel.'}</div>
              </div>
              <div className={styles.sec} style={{ borderBottom: 'none' }}>
                <div className={styles.sech}>Ajalugu</div>
                {history.map((h, i) => <div key={i} className={`${styles.tlrow} ${h.s === 'done' ? styles.done : h.s === 'wait' ? styles.tlWait : h.s === 'bad' ? styles.tlBad : ''}`}><span className={styles.mono}>{h.d}</span><span className={styles.bul} /><span>{h.t}</span></div>)}
              </div>
            </div>
          )}

          {rtab === 'pdf' && (
            <div className={styles.rpdf}>
              {doc ? (
                <>
                  <div ref={setPdfBox} className={styles.pdf} onWheel={(e) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); stepZoom(e.deltaY < 0 ? 1 : -1); } }}>
                    {docUrl && docUrl.id === doc.document_id ? <PdfViewer url={docUrl.url} mimeType={doc.mime_type} zoom={zoomValue} onPages={setPdfPages} /> : <div style={{ padding: 20, fontSize: 12, color: 'var(--a-text-3)' }}><Loader2 size={16} className="animate-spin" /></div>}
                  </div>
                  <div className={styles.pdfbar}>
                    <span className={styles.fn} title={doc.file_name || ''}>{doc.file_name || 'originaal'}{pdfPages ? ` · ${pdfPages} lk` : ''}</span>
                    <span className={styles.r}>
                      <span className={styles.zoom}>
                        <button type="button" title="Vähenda (− · Ctrl+rullik)" onClick={() => stepZoom(-1)}>−</button><span className={styles.zv}>{Math.round(zoomValue * 100)}%</span><button type="button" title="Suurenda (+)" onClick={() => stepZoom(1)}>+</button>
                        <button type="button" className={zoom === 'fit' ? styles.zoomOn : ''} title="Mahuta laiusele (0)" onClick={() => setZoom('fit')}>↔</button><button type="button" className={zoom === 1 ? styles.zoomOn : ''} title="Tegelik suurus" onClick={() => setZoom(1)}>1:1</button>
                      </span>
                      <button type="button" className={styles.iconb} title="Laadi alla" disabled={!docUrl} onClick={downloadDoc}>↓</button>
                      <button type="button" className={styles.iconb} title="Asenda fail" disabled={!!busy} onClick={() => fileRef.current?.click()}>↻</button>
                    </span>
                  </div>
                </>
              ) : (
                <div className={styles.noorig}>
                  <div className={styles.noorigIcon}><svg className={styles.icon} viewBox="0 0 24 24" style={{ width: 18, height: 18 }}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6" /></svg></div>
                  <div><h4>Originaal puudub</h4><p>{bankDraft ? <>Mustand loodi pangatehingust {dateText(invoice?.invoice_date)}. Kviitungi või arve küsimiseks saadetakse automaatselt meeldetuletusi.</> : 'Arvel pole originaali. Lisa PDF või pilt, et arvet saaks kinnitada.'}</p></div>
                  <div className={styles.noorigActs}>
                    <button type="button" className={`${styles.btn} ${styles.primary}`} disabled={!!busy} onClick={() => fileRef.current?.click()}>{busy === 'upload' && <Loader2 size={13} className="animate-spin" />}Laadi originaal üles</button>
                    {bankDraft && id && <button type="button" className={styles.btn} disabled={!!busy} onClick={() => void invoicesApi.sendReceiptReminder(id).then((r) => showToast.success(`Meeldetuletus ${r.reminder_number} saadetud · ${r.sent_to}`)).catch((e) => showToast.error(getErrorMessage(e)))}>Saada meeldetuletus kohe</button>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog open={confirmCancel} onOpenChange={setConfirmCancel} title="Jäta muudatused salvestamata?" description="Arvel on salvestamata muudatusi. Loobumisel lähevad need kaduma." confirmLabel="Loobu muudatustest" variant="warning"
        onConfirm={() => { setDirty(false); router.push('/invoices/purchase'); }} />
      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title="Kustuta mustand?" description={`Mustand ${hdr.sinv || ''} kustutatakse jäädavalt. Kinnitatud arveid ei saa kustutada.`} confirmLabel="Kustuta mustand"
        onConfirm={deleteDraft} />
    </div>
  );
}

function Cell({ k, v, cls = '' }: { k: string; v: string; cls?: string }) {
  return <div className={`${styles.cell} ${cls}`}><div className={styles.k}>{k}</div><div className={`${styles.v} ${styles.mono}`}>{v}</div></div>;
}
