'use client';

/**
 * Sales invoice editor — implements docs2/design_handoff_sales_invoice_edit.
 * One screen for new sales invoices and for editing drafts (incl. Futursoft imports).
 * Copy is Estonian by design (the handoff's strings are final), matching SalesInvoiceWorkspace.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useCallback, useEffect, useMemo, useRef, useState,
  type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode,
} from 'react';
import { Loader2 } from 'lucide-react';
import { accountingApi, type AccountOption, type AccountingSettings, type PartnerRecord } from '@/lib/api/accounting.api';
import { getErrorMessage } from '@/lib/api/client';
import { invoicesApi, type InvoiceDetail, type InvoiceDraftPayload, type InvoiceLine, type InvoiceListItem, type InvoiceMeta } from '@/lib/api/invoices.api';
import { productsApi, type Product } from '@/lib/api/products.api';
import { tenantsApi, type TenantMember } from '@/lib/api/tenants.api';
import { useAuthStore } from '@/lib/stores/auth.store';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { showToast } from '@/components/ui/Toast';
import styles from './SalesInvoiceEditor.module.css';

type SupplyType = 'domestic' | 'intra_community' | 'reverse_charge' | 'third_country';
type VatCode = { key: string; label: string; short: string; rate: number; supply: SupplyType };
type Term = { d: number; l: string };
type Extra = { hinote: boolean; hcc: boolean; hprj: boolean; lcc: boolean; lprj: boolean };
type AddressTab = 'bill' | 'ship' | 'ct';
type Menu = 'fields' | 'terms' | 'partner' | null;
type CheckState = 'ok' | 'warn' | 'err';
type Check = { s: CheckState; t: ReactNode };

type Line = {
  key: number;
  code: string;
  description: string;
  account_id: string;
  cost_center: string;
  project: string;
  quantity: string;
  unit: string;
  unit_price: string;
  discount_percent: string;
};

type Header = {
  partnerId: string;
  partnerName: string;
  currency: string;
  billing: string;
  shipping: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  issued: string;
  due: string;
  note: string;
  inote: string;
  vatc: string;
  authorId: string;
  costCenter: string;
  project: string;
};

// Same codes as the sales-invoice list (SalesInvoiceWorkspace); the rate drives every line.
const VAT_CODES: VatCode[] = [
  { key: 'd24', label: 'Siseriiklik 24%', short: '24%', rate: 24, supply: 'domestic' },
  { key: 'd22', label: 'Siseriiklik 22%', short: '22%', rate: 22, supply: 'domestic' },
  { key: 'd9', label: 'Siseriiklik 9%', short: '9%', rate: 9, supply: 'domestic' },
  { key: 'eug', label: 'EU kauba müük 0%', short: 'EU kaup', rate: 0, supply: 'intra_community' },
  { key: 'eus', label: 'EU teenus 0% (pöördmaks)', short: 'EU teenus', rate: 0, supply: 'reverse_charge' },
  { key: 'exp', label: 'Eksport 0%', short: 'Eksport', rate: 0, supply: 'third_country' },
  { key: 'ex', label: 'Maksuvaba käive', short: 'Maksuvaba', rate: 0, supply: 'domestic' },
];
const UNITS = ['tk', 'h', 'kuu', 'km', 'kmpl'];
const CURRENCIES = ['EUR', 'USD', 'SEK'];
const TERM_CHIPS = [7, 14, 30];
const DEFAULT_TERMS: Term[] = [0, 7, 10, 14, 21, 30, 45, 60].map((d) => ({ d, l: d === 0 ? 'Kohe' : `${d} päeva` }));
const DEFAULT_EXTRA: Extra = { hinote: false, hcc: false, hprj: false, lcc: false, lprj: false };
const KEYS = { extra: 'arvelo.inv.edit.extra', coll: 'arvelo.inv.edit.coll', pw: 'arvelo.inv.edit.pw', rail: 'arvelo.inv.edit.rail', terms: 'arvelo.inv.terms' };
const DEFAULT_PW = 330, MIN_PW = 260, MIN_EDITOR = 620, SHELL_MIN = 1180, GUTTER = 9;
const COUNTRIES: Record<string, string> = { EE: 'Eesti', FI: 'Soome', LV: 'Läti', LT: 'Leedu', SE: 'Rootsi', DE: 'Saksamaa' };
const FUTURSOFT_NOTE = /^Imported from Futursoft\b/i;

let lineKeySeq = 0;
const nextKey = () => ++lineKeySeq;
const r2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: string | number) => { const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const fmtNum = (n: number) => n.toLocaleString('et-EE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = (n: number, currency: string) => {
  try { return new Intl.NumberFormat('et-EE', { style: 'currency', currency, minimumFractionDigits: 2 }).format(n); }
  catch { return `${fmtNum(n)} ${currency}`; }
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
const partnerAddress = (p?: PartnerRecord | null) => p
  ? [p.address, [p.postal_code, p.city].filter(Boolean).join(' '), p.country_code ? COUNTRIES[p.country_code] || p.country_code : '']
      .map((s) => String(s || '').trim()).filter(Boolean).join(', ')
  : '';
const splitNumber = (nr: string) => { const m = /^(.*?)(\d+)\s*$/.exec(nr); return m ? { pre: m[1].trim(), val: m[2] } : { pre: '', val: nr }; };
const readJson = <T,>(key: string, fallback: T): T => { try { const raw = localStorage.getItem(key); return raw ? { ...fallback, ...JSON.parse(raw) } : fallback; } catch { return fallback; } };
const memberName = (m?: TenantMember | null) => (m ? m.user.name || m.user.email : '');

function vatCodeFor(lines: InvoiceLine[], meta: InvoiceMeta | null | undefined, vatEnabled: boolean): string {
  if (!vatEnabled) return 'ex';
  if (meta?.vat_code && VAT_CODES.some((c) => c.key === meta.vat_code)) return meta.vat_code;
  const first = lines[0];
  if (!first) return 'd24';
  const rate = Number(first.tax_rate || 0), supply = (first.supply_type || 'domestic') as SupplyType;
  return VAT_CODES.find((c) => c.supply === supply && c.rate === rate)?.key || (rate === 0 ? 'ex' : 'd24');
}

function lineFrom(line: InvoiceLine): Line {
  const meta = (line.meta || {}) as Record<string, unknown>;
  return {
    key: nextKey(),
    code: String(meta.code || ''),
    description: line.description || '',
    account_id: line.account_id || '',
    cost_center: String(meta.cost_center || ''),
    project: String(meta.project || ''),
    quantity: String(Number(line.quantity ?? 1)),
    unit: String(meta.unit || 'tk'),
    unit_price: fmtNum(Number(line.unit_price || 0)),
    discount_percent: String(Number(line.discount_percent || 0)),
  };
}

function headerFrom(detail: InvoiceDetail, vatEnabled: boolean): { header: Header; movedImportNote: boolean } {
  const inv = detail.invoice, m = inv.meta || {};
  const notes = inv.notes || '';
  // Import rule: the Futursoft import text is an internal note, it must never print on the invoice.
  const movedImportNote = FUTURSOFT_NOTE.test(notes) && !m.internal_note;
  return {
    movedImportNote,
    header: {
      partnerId: inv.partner_id || '',
      partnerName: inv.partner_name || '',
      currency: inv.currency || 'EUR',
      billing: m.billing_address || '',
      shipping: m.delivery_address || '',
      contactName: m.contact_name || '',
      contactEmail: m.contact_email || '',
      contactPhone: m.contact_phone || '',
      issued: isoToEt(inv.invoice_date),
      due: isoToEt(inv.due_date),
      note: movedImportNote ? '' : notes,
      inote: movedImportNote ? notes : m.internal_note || '',
      vatc: vatCodeFor(detail.lines, m, vatEnabled),
      authorId: m.author_user_id || inv.created_by_user_id || '',
      costCenter: m.cost_center || '',
      project: m.project || '',
    },
  };
}

const emptyHeader = (vatEnabled: boolean, authorId: string): Header => ({
  partnerId: '', partnerName: '', currency: 'EUR', billing: '', shipping: '', contactName: '', contactEmail: '', contactPhone: '',
  issued: '', due: '', note: '', inote: '', vatc: vatEnabled ? 'd24' : 'ex', authorId, costCenter: '', project: '',
});

type Props = { mode: 'create' | 'edit'; invoiceId?: string; initial?: InvoiceDetail };

export default function SalesInvoiceEditor({ mode, invoiceId, initial }: Props) {
  const router = useRouter();
  const { tenant, user } = useAuthStore();
  const vatEnabled = tenant ? Boolean(tenant.is_vat_registered) : true;

  const [id, setId] = useState<string | null>(invoiceId || null);
  const [invoice, setInvoice] = useState<InvoiceListItem | null>(initial?.invoice || null);
  const [hdr, setHdr] = useState<Header>(() => (initial ? headerFrom(initial, vatEnabled).header : emptyHeader(vatEnabled, user?.id || '')));
  const [lines, setLines] = useState<Line[]>(() => (initial ? initial.lines.map(lineFrom) : []));
  const [loading, setLoading] = useState(mode === 'edit' && !initial);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [busy, setBusy] = useState<null | 'save' | 'confirm' | 'delete'>(null);

  const [partners, setPartners] = useState<PartnerRecord[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [settings, setSettings] = useState<AccountingSettings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [balances, setBalances] = useState<Map<string, number>>(new Map());
  const [members, setMembers] = useState<TenantMember[]>([]);

  const [extra, setExtra] = useState<Extra>(DEFAULT_EXTRA);
  const [coll, setColl] = useState(false);
  const [rail, setRail] = useState(true);
  const [pw, setPw] = useState(DEFAULT_PW);
  const [resizing, setResizing] = useState(false);
  const [menu, setMenu] = useState<Menu>(null);
  const [productRow, setProductRow] = useState<number | null>(null);
  const [catalogAll, setCatalogAll] = useState(false);
  const [atab, setAtab] = useState<AddressTab>('bill');
  const [terms, setTerms] = useState<Term[]>(DEFAULT_TERMS);
  const [newTerm, setNewTerm] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const shellRef = useRef<HTMLDivElement>(null);
  const partnerRef = useRef<HTMLInputElement>(null);
  const addrPaneRef = useRef<HTMLDivElement>(null);
  const descRefs = useRef(new Map<number, HTMLInputElement | null>());
  const pendingFocus = useRef<number | null>(null);
  const focusTab = useRef(false);
  const importMoved = useRef(initial ? headerFrom(initial, vatEnabled).movedImportNote : false);

  const touch = useCallback(() => setDirty(true), []);
  const setH = useCallback((patch: Partial<Header>) => { setHdr((h) => ({ ...h, ...patch })); setDirty(true); }, []);

  /* ── persisted UI prefs + defaults for a new invoice ── */
  useEffect(() => {
    setExtra(readJson(KEYS.extra, DEFAULT_EXTRA));
    setColl(localStorage.getItem(KEYS.coll) === '1');
    setRail(localStorage.getItem(KEYS.rail) !== '0');
    setPw(Number(localStorage.getItem(KEYS.pw)) || DEFAULT_PW);
    try { const saved = JSON.parse(localStorage.getItem(KEYS.terms) || 'null'); if (Array.isArray(saved) && saved.length) setTerms(saved); } catch {}
    if (mode === 'create') {
      const issued = todayEt();
      setHdr((h) => (h.issued ? h : { ...h, issued, due: addDaysEt(issued, 14) || issued }));
      setLines((current) => (current.length ? current : [{ key: nextKey(), code: '', description: '', account_id: '', cost_center: '', project: '', quantity: '1', unit: 'tk', unit_price: '', discount_percent: '0' }]));
    }
    if (importMoved.current) setDirty(true);
  }, [mode]);

  /* ── reference data ── */
  useEffect(() => {
    accountingApi.listPartners({ is_active: true }).then((rows) => setPartners(rows.filter((p) => p.type !== 'supplier'))).catch(() => {});
    accountingApi.getAccounts().then(setAccounts).catch(() => {});
    accountingApi.getAccountingSettings().then(setSettings).catch(() => {});
    productsApi.list().then(setProducts).catch(() => {});
    accountingApi.listPartnersWithBalances('customer').then((rows) => setBalances(new Map(rows.map((r) => [r.id, Number(r.balance || 0)])))).catch(() => {});
    if (tenant?.id) tenantsApi.getMembers(tenant.id).then(setMembers).catch(() => {});
  }, [tenant?.id]);

  /* ── load the draft when the page did not pass it in ── */
  useEffect(() => {
    if (mode !== 'edit' || !invoiceId || initial) return;
    let live = true;
    setLoading(true);
    invoicesApi.getInvoice(invoiceId).then((detail) => {
      if (!live) return;
      const { header, movedImportNote } = headerFrom(detail, vatEnabled);
      setInvoice(detail.invoice); setHdr(header); setLines(detail.lines.map(lineFrom));
      if (movedImportNote) setDirty(true);
    }).catch((e) => live && setLoadError(getErrorMessage(e))).finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [mode, invoiceId, initial, vatEnabled]);

  const partner = useMemo(() => partners.find((p) => p.id === hdr.partnerId) || null, [partners, hdr.partnerId]);

  /* ── fill what the draft does not carry yet from the partner card (not a user change) ── */
  useEffect(() => {
    if (!partner) return;
    setHdr((h) => {
      const patch: Partial<Header> = {};
      if (!h.partnerName) patch.partnerName = partner.name;
      if (!h.billing.trim()) patch.billing = partnerAddress(partner);
      if (!h.contactEmail && !h.contactPhone && !h.contactName) { patch.contactName = partner.contact_name || ''; patch.contactEmail = partner.email || ''; patch.contactPhone = partner.phone || ''; }
      return Object.keys(patch).length ? { ...h, ...patch } : h;
    });
  }, [partner]);

  /* ── focus management ── */
  useEffect(() => {
    if (pendingFocus.current === null) return;
    const el = descRefs.current.get(pendingFocus.current);
    pendingFocus.current = null;
    el?.focus();
  }, [lines]);
  useEffect(() => {
    if (!focusTab.current) return;
    focusTab.current = false;
    addrPaneRef.current?.querySelector<HTMLElement>('input,textarea')?.focus();
  }, [atab]);

  /* ── menus close on outside click; only one is open at a time ── */
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
  const revenueAccounts = useMemo(() => accounts.filter((a) => a.is_active && a.type === 'revenue'), [accounts]);
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const lineList = (l: Line) => r2(num(l.quantity) * num(l.unit_price));
  const lineNet = (l: Line) => r2(num(l.quantity) * num(l.unit_price) * (1 - num(l.discount_percent) / 100));
  const totals = useMemo(() => {
    const list = r2(lines.reduce((s, l) => s + lineList(l), 0));
    const net = r2(lines.reduce((s, l) => s + lineNet(l), 0));
    // VAT is rounded per line, exactly as the database computes it.
    const vatAmt = r2(lines.reduce((s, l) => s + r2(lineNet(l) * vat.rate / 100), 0));
    return { list, cut: r2(list - net), net, vat: vatAmt, tot: r2(net + vatAmt) };
  }, [lines, vat.rate]);
  const termDays = useMemo(() => daysBetweenEt(hdr.issued, hdr.due), [hdr.issued, hdr.due]);
  const nr = useMemo(() => splitNumber(invoice?.invoice_number || ''), [invoice?.invoice_number]);
  const numberText = invoice?.invoice_number || '';
  const imported = invoice?.source === 'futursoft' || FUTURSOFT_NOTE.test(hdr.inote) || FUTURSOFT_NOTE.test(invoice?.notes || '');
  const importTx = /tx (\d+)/.exec(hdr.inote || invoice?.notes || '')?.[1];
  const isDraft = !invoice || invoice.status === 'draft' || invoice.status === 'rejected';
  const authorName = useMemo(() => {
    const m = members.find((x) => x.user.id === hdr.authorId);
    if (m) return memberName(m);
    if (user && hdr.authorId === user.id) return user.name || user.email;
    return '';
  }, [members, hdr.authorId, user]);
  const balance = hdr.partnerId ? balances.get(hdr.partnerId) : undefined;
  const creditLimit = partner?.credit_limit != null && partner.credit_limit !== '' ? Number(partner.credit_limit) : null;
  const salesDefault = settings?.[`default_sales_account_id_${vat.supply}` as const] || settings?.sales_revenue_account_id || '';

  /* ── a pristine new line takes the default sales account once settings arrive ── */
  useEffect(() => {
    if (!salesDefault) return;
    setLines((ls) => (ls.some((l) => !l.account_id && !l.description.trim()) ? ls.map((l) => (!l.account_id && !l.description.trim() ? { ...l, account_id: salesDefault } : l)) : ls));
  }, [salesDefault]);


  const checks = useMemo<Check[]>(() => {
    const out: Check[] = [];
    out.push(partner ? { s: 'ok', t: <>Klient <b>{partner.name}</b> seotud</> } : { s: 'err', t: 'Klient on valimata' });
    out.push(numberText ? { s: 'ok', t: <>Number <b>{numberText}</b> seeriast</> } : { s: 'ok', t: 'Number antakse seeriast salvestamisel' });
    const noDesc = lines.filter((l) => !l.description.trim()).length;
    const zero = lines.filter((l) => lineNet(l) === 0).length;
    if (!lines.length) out.push({ s: 'err', t: 'Arvel pole ridu' });
    else if (noDesc) out.push({ s: 'err', t: <><b>{noDesc}</b> rida ilma kirjelduseta</> });
    else if (zero) out.push({ s: 'warn', t: <><b>{zero}</b> rida summaga {money(0, hdr.currency)}</> });
    else out.push({ s: 'ok', t: <><b>{lines.length}</b> rida, kõik summad täidetud</> });
    const noAcc = lines.filter((l) => !l.account_id).length;
    out.push(noAcc ? { s: 'warn', t: <><b>{noAcc}</b> rida ilma kontota</> } : { s: 'ok', t: 'Konto määratud kõigil ridadel' });
    const a = etToIso(hdr.issued), b = etToIso(hdr.due);
    if (!a || !b) out.push({ s: 'err', t: 'Kuupäev vormis pp.kk.aaaa' });
    else if (b < a) out.push({ s: 'err', t: 'Maksetähtaeg on enne arve kuupäeva' });
    else out.push({ s: 'ok', t: <>Maksetingimus <b>{termDays} päeva</b></> });
    if (extra.lcc) { const n = lines.filter((l) => !l.cost_center.trim()).length; if (n) out.push({ s: 'warn', t: <><b>{n}</b> rida ilma kulukohata</> }); }
    if (extra.lprj) { const n = lines.filter((l) => !l.project.trim()).length; if (n) out.push({ s: 'warn', t: <><b>{n}</b> rida ilma projektita</> }); }
    if (creditLimit && creditLimit > 0 && (balance ?? 0) + totals.tot > creditLimit) out.push({ s: 'warn', t: <>Kliendi krediidilimiit saab täis ({money(creditLimit, hdr.currency)})</> });
    if (vat.rate === 0 && vatEnabled) out.push({ s: 'warn', t: '0% käive — kontrolli KM koodi põhjendust' });
    return out;
  }, [partner, numberText, lines, hdr.issued, hdr.due, hdr.currency, termDays, extra.lcc, extra.lprj, vat.rate, vatEnabled, creditLimit, balance, totals.tot]);
  const hasErrors = checks.some((c) => c.s === 'err');

  const journalRows = useMemo(() => {
    const acc = (accountId: string | null | undefined, fallbackCode: string, fallbackName: string) => {
      const a = accountId ? accountMap.get(accountId) : null;
      return a ? { code: a.code, name: a.name } : { code: fallbackCode, name: fallbackName };
    };
    const byAcc = new Map<string, number>();
    lines.forEach((l) => byAcc.set(l.account_id, r2((byAcc.get(l.account_id) || 0) + lineNet(l))));
    const rows = [{ ...acc(settings?.accounts_receivable_account_id, '1210', 'Nõuded ostjate vastu'), d: totals.tot, c: 0 }];
    byAcc.forEach((v, accountId) => rows.push({ ...(accountId ? acc(accountId, '—', 'Konto määramata') : acc(salesDefault, '3110', 'Müügitulu')), d: 0, c: v }));
    if (totals.vat) rows.push({ ...acc(settings?.vat_output_account_id, '2130', 'Käibemaksukohustus'), d: 0, c: totals.vat });
    return rows;
  }, [lines, totals, settings, accountMap, salesDefault]);

  const lcols = useMemo(() => [
    { id: 'ix', w: '22px', l: '' }, { id: 'code', w: '74px', l: 'Kood' }, { id: 'desc', w: 'minmax(150px,1fr)', l: 'Kirjeldus' }, { id: 'acc', w: '76px', l: 'Konto' },
    ...(extra.lcc ? [{ id: 'cc', w: '76px', l: 'Kulukoht' }] : []), ...(extra.lprj ? [{ id: 'prj', w: '84px', l: 'Projekt' }] : []),
    { id: 'qty', w: '52px', l: 'Kogus', r: true }, { id: 'unit', w: '46px', l: 'Ühik' }, { id: 'price', w: '84px', l: 'Ühikuhind', r: true }, { id: 'disc', w: '50px', l: 'Ale %', r: true },
    { id: 'vat', w: '74px', l: 'KM' }, { id: 'sum', w: '92px', l: 'Rea summa', r: true }, { id: 'act', w: '46px', l: '' },
  ], [extra.lcc, extra.lprj]);

  const partnerMatches = useMemo(() => {
    const q = hdr.partnerName.trim().toLowerCase();
    const pool = !q || (partner && q === partner.name.toLowerCase()) ? partners : partners.filter((p) => `${p.name} ${p.reg_code || ''}`.toLowerCase().includes(q));
    return pool.slice(0, 40);
  }, [partners, partner, hdr.partnerName]);
  const productMatches = (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q && !catalogAll) return [];
    const pool = !q ? products : products.filter((p) => `${p.name} ${p.code || ''} ${p.description || ''}`.toLowerCase().includes(q));
    return pool.slice(0, 10);
  };

  /* ── UI prefs ── */
  const clampPw = useCallback((v: number) => Math.max(MIN_PW, Math.min(v, Math.max(SHELL_MIN, shellRef.current?.clientWidth || SHELL_MIN) - GUTTER - MIN_EDITOR)), []);
  useEffect(() => { const onResize = () => setPw((v) => clampPw(v)); window.addEventListener('resize', onResize); return () => window.removeEventListener('resize', onResize); }, [clampPw]);
  const toggleRail = (open: boolean) => { setRail(open); localStorage.setItem(KEYS.rail, open ? '1' : '0'); };
  const toggleColl = () => { setColl((v) => { localStorage.setItem(KEYS.coll, v ? '0' : '1'); return !v; }); };
  const setExtraKeys = (patch: Partial<Extra>, on: boolean) => {
    setExtra((e) => { const next = { ...e, ...patch }; localStorage.setItem(KEYS.extra, JSON.stringify(next)); return next; });
    showToast.info(on ? 'Väli lisatud' : 'Väli eemaldatud');
  };
  const resizePanel = (e: ReactPointerEvent) => {
    e.preventDefault();
    const x0 = e.clientX, w0 = clampPw(pw);
    setResizing(true);
    const move = (ev: PointerEvent) => setPw(clampPw(w0 - (ev.clientX - x0)));
    const up = (ev: PointerEvent) => {
      setResizing(false);
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
      const final = clampPw(w0 - (ev.clientX - x0)); setPw(final); localStorage.setItem(KEYS.pw, String(final));
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };

  /* ── header actions ── */
  const pickPartner = (p: PartnerRecord) => {
    const due = p.payment_terms_days != null ? addDaysEt(hdr.issued, p.payment_terms_days) : null;
    setH({ partnerId: p.id, partnerName: p.name, billing: partnerAddress(p), contactName: p.contact_name || '', contactEmail: p.email || '', contactPhone: p.phone || '', ...(due ? { due } : {}) });
    setMenu(null);
    partnerRef.current?.blur();
  };
  const restoreBilling = () => { if (!partner) return; setH({ billing: partnerAddress(partner) }); showToast.info('Aadress taastatud kliendikaardilt'); };
  const copyBilling = () => { setH({ shipping: hdr.billing }); showToast.info('Arve aadress kopeeritud'); };
  const restoreContact = () => { if (!partner) return; setH({ contactName: partner.contact_name || '', contactEmail: partner.email || '', contactPhone: partner.phone || '' }); showToast.info('Kontakt taastatud kliendikaardilt'); };
  const switchTab = (tab: AddressTab) => { focusTab.current = true; setAtab(tab); };
  const setDue = (days: number) => { const due = addDaysEt(hdr.issued, days); if (due) setH({ due }); };
  const addTerm = () => {
    const n = parseInt(newTerm, 10);
    if (Number.isNaN(n) || n < 0) return;
    setTerms((t) => { const next = t.some((x) => x.d === n) ? t : [...t, { d: n, l: n === 0 ? 'Kohe' : `${n} päeva` }].sort((a, b) => a.d - b.d); localStorage.setItem(KEYS.terms, JSON.stringify(next)); return next; });
    setDue(n); setNewTerm(''); setMenu(null); showToast.info('Maksetingimus lisatud');
  };
  const fitAddr = (el: HTMLTextAreaElement | null) => {
    if (!el || (typeof CSS !== 'undefined' && CSS.supports('field-sizing', 'content'))) return;
    el.style.height = '29px'; el.style.height = `${Math.min(el.scrollHeight + 2, 96)}px`;
  };

  /* ── line actions ── */
  const updateLine = (i: number, patch: Partial<Line>) => { setLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...patch } : l))); touch(); };
  const removeLine = (i: number) => {
    setLines((ls) => { const next = ls.filter((_, k) => k !== i); const target = next[Math.min(i, next.length - 1)]; pendingFocus.current = target ? target.key : null; return next; });
    touch(); showToast.info('Rida kustutatud');
  };
  const dupLine = (i: number) => { setLines((ls) => { const copy = { ...ls[i], key: nextKey() }; return [...ls.slice(0, i + 1), copy, ...ls.slice(i + 1)]; }); touch(); showToast.info('Rida kopeeritud'); };
  const addLine = (catalog = false) => {
    const last = lines[lines.length - 1];
    const line: Line = {
      key: nextKey(), code: '', description: '', account_id: last?.account_id || salesDefault, cost_center: last?.cost_center || hdr.costCenter, project: last?.project || hdr.project,
      quantity: '1', unit: last?.unit || 'tk', unit_price: '', discount_percent: '0',
    };
    pendingFocus.current = line.key;
    setLines((ls) => [...ls, line]); touch();
    setCatalogAll(catalog); setProductRow(catalog ? lines.length : null);
  };
  const moveLine = (from: number, to: number) => { if (from === to) return; setLines((ls) => { const next = [...ls]; const [m] = next.splice(from, 1); next.splice(to, 0, m); return next; }); touch(); };
  const applyProduct = (i: number, line: Line, p: Product) => {
    updateLine(i, {
      description: p.description || p.name, code: p.code || line.code, unit: p.unit || line.unit,
      unit_price: p.unit_price != null ? fmtNum(Number(p.unit_price)) : line.unit_price, account_id: p.sales_account_id || line.account_id,
    });
    setProductRow(null); setCatalogAll(false);
  };
  const rowKeys = (e: ReactKeyboardEvent<HTMLDivElement>, i: number) => {
    const target = e.target as HTMLElement;
    if (e.key === 'Enter' && target.tagName === 'INPUT') {
      e.preventDefault();
      if (i === lines.length - 1) addLine(); else descRefs.current.get(lines[i + 1].key)?.focus();
    }
    if (e.key === 'Backspace' && e.altKey) { e.preventDefault(); removeLine(i); }
  };

  /* ── persistence ── */
  const validationMessage = () => {
    if (!hdr.partnerId) return 'Vali klient enne salvestamist';
    if (!lines.length) return 'Lisa arvele vähemalt üks rida';
    if (lines.some((l) => !l.description.trim())) return 'Igal real peab olema kirjeldus';
    if (lines.some((l) => num(l.quantity) <= 0)) return 'Kogus peab olema suurem kui 0';
    if (!etToIso(hdr.issued) || !etToIso(hdr.due)) return 'Kuupäev vormis pp.kk.aaaa';
    return null;
  };
  const buildPayload = (): InvoiceDraftPayload => ({
    type: 'sales_invoice',
    partner_id: hdr.partnerId,
    invoice_number: invoice?.invoice_number || undefined,
    invoice_date: etToIso(hdr.issued)!,
    due_date: etToIso(hdr.due) || undefined,
    currency: hdr.currency,
    notes: hdr.note.trim() || undefined,
    payment_reference: invoice?.payment_reference || undefined,
    meta: {
      ...(invoice?.meta || {}),
      billing_address: hdr.billing.trim(), delivery_address: hdr.shipping.trim(), contact_name: hdr.contactName.trim(), contact_email: hdr.contactEmail.trim(), contact_phone: hdr.contactPhone.trim(),
      internal_note: hdr.inote.trim(), cost_center: hdr.costCenter.trim(), project: hdr.project.trim(), author_user_id: hdr.authorId || undefined, vat_code: vat.key,
    },
    lines: lines.map((l) => {
      const meta: Record<string, string> = {};
      if (l.code.trim()) meta.code = l.code.trim();
      if (l.unit.trim()) meta.unit = l.unit.trim();
      if (l.cost_center.trim()) meta.cost_center = l.cost_center.trim();
      if (l.project.trim()) meta.project = l.project.trim();
      return {
        description: l.description.trim(), account_id: l.account_id || undefined, quantity: num(l.quantity), unit_price: num(l.unit_price), discount_percent: num(l.discount_percent),
        tax_rate: vatEnabled ? vat.rate : 0, supply_type: vat.supply, meta: Object.keys(meta).length ? meta : undefined,
      };
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
  const confirmAndSend = async () => {
    if (hasErrors) { showToast.error('Paranda kontrolli vead enne kinnitamist'); return; }
    let currentId = id;
    if (dirty || !currentId) { const saved = await save(); if (!saved) return; currentId = saved.invoice.id; }
    setBusy('confirm');
    try {
      await invoicesApi.confirm(currentId!);
      try {
        const sent = await invoicesApi.sendInvoice(currentId!, { to: hdr.contactEmail.trim() || partner?.email || undefined });
        showToast.success(`Arve kinnitatud ja saadetud aadressile ${sent.sent_to}`);
      } catch (e) { showToast.error(`Arve kinnitati, kuid saatmine ebaõnnestus: ${getErrorMessage(e)}`); }
      setDirty(false);
      router.push('/invoices/sales');
    } catch (e) { showToast.error(getErrorMessage(e)); }
    finally { setBusy(null); }
  };
  const deleteDraft = async () => {
    if (!id) return;
    setBusy('delete');
    try { await invoicesApi.deleteInvoice(id); setDirty(false); showToast.success('Mustand kustutatud'); router.push('/invoices/sales'); }
    catch (e) { showToast.error(getErrorMessage(e)); }
    finally { setBusy(null); }
  };
  const cancel = () => { if (dirty) setConfirmCancel(true); else router.push('/invoices/sales'); };
  const preview = () => { if (!id || dirty) { showToast.info('Salvesta mustand enne eelvaadet'); return; } window.open(`/invoices/${id}/preview`, '_blank', 'noopener'); };

  /* ── keyboard: ⌘S save · ⌘K client · Esc cancel ── */
  const latest = useRef({ save, cancel, dirty, busy, menu, productRow, dialogOpen: confirmCancel || confirmDelete });
  latest.current = { save, cancel, dirty, busy, menu, productRow, dialogOpen: confirmCancel || confirmDelete };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = latest.current;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (s.dirty && !s.busy) void s.save(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); partnerRef.current?.select(); setMenu('partner'); return; }
      if (e.key === 'Escape') {
        if (s.dialogOpen) return;
        if (s.menu || s.productRow !== null) { setMenu(null); setProductRow(null); return; }
        s.cancel();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ── render ── */
  const savedText = savedAt ? `Salvestatud ${timeText(savedAt)}` : invoice ? `Salvestatud ${timeText(invoice.updated_at)}` : 'Uus mustand';
  const statusTag = !invoice || isDraft ? { l: 'Mustand', c: styles.draft } : invoice.status === 'paid' ? { l: 'Makstud', c: styles.paid } : { l: 'Saadetud', c: styles.sent };
  const avatarHue = hue(hdr.partnerName || 'A');
  const authorOptions = members.length ? members.map((m) => ({ id: m.user.id, name: memberName(m) })) : user ? [{ id: user.id, name: user.name || user.email }] : [];
  if (hdr.authorId && !authorOptions.some((o) => o.id === hdr.authorId)) authorOptions.push({ id: hdr.authorId, name: authorName || 'Tundmatu kasutaja' });
  const showInote = extra.hinote || !!hdr.inote.trim();
  const moreOn = termDays !== null && !TERM_CHIPS.includes(termDays);
  const unitOptions = (unit: string) => (UNITS.includes(unit) || !unit ? UNITS : [...UNITS, unit]);
  const Cell = ({ k, v, cls }: { k: string; v: string; cls?: string }) => <div className={`${styles.cell} ${cls || ''}`}><div className={styles.k}>{k}</div><div className={`${styles.v} ${styles.mono}`}>{v}</div></div>;

  return (
    <div ref={shellRef} className={`${styles.shell} ${resizing ? styles.resizing : ''}`}>
      <div className={styles.topbar}>
        <div className={styles.crumb}><Link href="/invoices/sales">← Müügiarved</Link><span className={styles.sep}>/</span></div>
        <h1 className={`${styles.title} ${styles.mono}`}>{numberText || 'Uus müügiarve'}</h1>
        <span className={`${styles.tag} ${statusTag.c}`}><span className={styles.dot} />{statusTag.l}</span>
        {imported && <span className={`${styles.tag} ${styles.info}`} title={`Imporditud Futursoftist${importTx ? ` · tx ${importTx}` : ''}`}><span className={styles.dot} />Futursofti import</span>}
        <div className={styles.acts}>
          <span className={`${styles.dirty} ${dirty ? '' : styles.clean}`}><span className={styles.dot} />{dirty ? 'Salvestamata muudatused' : savedText}</span>
          <button type="button" className={`${styles.btn} ${styles.ghost}`} onClick={cancel}>Loobu <kbd className={styles.kbd}>Esc</kbd></button>
          <button type="button" className={styles.btn} disabled={!dirty || !!busy || loading} onClick={() => void save()}>{busy === 'save' && <Loader2 size={13} className="animate-spin" />}Salvesta mustand <kbd className={styles.kbd}>⌘S</kbd></button>
          <button type="button" className={`${styles.btn} ${styles.primary}`} disabled={!!busy || loading || !isDraft} onClick={() => void confirmAndSend()}>{busy === 'confirm' && <Loader2 size={13} className="animate-spin" />}Kinnita ja saada</button>
          <button type="button" className={`${styles.btn} ${styles.ghost}`} title={rail ? 'Peida kokkuvõtte paneel' : 'Näita kokkuvõtte paneeli'} onClick={() => toggleRail(!rail)}>
            <svg className={styles.icon} viewBox="0 0 24 24"><path d="M3 5h18v14H3zM15 5v14" /></svg> <span className={styles.raillbl}>{rail ? 'Peida kokkuvõte' : 'Näita kokkuvõtet'}</span>
          </button>
        </div>
      </div>

      <div className={`${styles.body} ${rail ? '' : styles.norail}`} style={{ '--pw': `${clampPw(pw)}px` } as CSSProperties}>
        <div className={styles.left}>
          {loading ? <div className={styles.loading}><Loader2 size={20} className="animate-spin" /></div> : (
            <div className={styles.lscroll}>
              {loadError && <div className={styles.notice} style={{ marginTop: 10 }}>{loadError}</div>}
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
                  <b>{hdr.partnerName || 'Klient valimata'}</b><span className={styles.s}>·</span><span className={styles.mono}>{numberText || 'uus'}</span><span className={styles.s}>·</span>
                  <span className={styles.mono}>{hdr.issued || '—'}</span> → <span className={styles.mono}>{hdr.due || '—'}</span><span className={styles.s}>·</span>{vat.short}<span className={styles.s}>·</span>{authorName || '—'}
                </div>
                <div className={styles.fgrid}>
                  <div className={`${styles.fld} ${styles.wide}`}>
                    <div className={styles.lbl}>Klient <span className={styles.r}>{partner ? `Reg ${partner.reg_code || '—'} · avatud saldo ${money(balance ?? 0, hdr.currency)}` : 'vali klient'}</span></div>
                    <div className={styles.partner} onClick={(e) => e.stopPropagation()}>
                      <span className={styles.av} style={{ background: `oklch(0.92 0.045 ${avatarHue})`, color: `oklch(0.36 0.09 ${avatarHue})` }}>{initials(hdr.partnerName || '?')}</span>
                      <input ref={partnerRef} value={hdr.partnerName} placeholder="Otsi klienti…" onChange={(e) => { setHdr((h) => ({ ...h, partnerName: e.target.value })); setMenu('partner'); }} onFocus={() => setMenu('partner')}
                        onBlur={() => { setMenu((m) => (m === 'partner' ? null : m)); if (partner) setHdr((h) => ({ ...h, partnerName: partner.name })); }}
                        onKeyDown={(e) => { if (e.key === 'Enter' && partnerMatches[0]) { e.preventDefault(); pickPartner(partnerMatches[0]); } }} />
                      <button type="button" className={styles.pmeta} tabIndex={-1} onMouseDown={(e) => { e.preventDefault(); partnerRef.current?.focus(); partnerRef.current?.select(); setMenu('partner'); }}>Vaheta ⌘K</button>
                      {menu === 'partner' && (
                        <div className={styles.plist}>
                          {partnerMatches.length ? partnerMatches.map((p) => (
                            <button key={p.id} type="button" className={`${styles.pitem} ${p.id === hdr.partnerId ? styles.pitemOn : ''}`} onMouseDown={(e) => { e.preventDefault(); pickPartner(p); }}>
                              <span className={styles.n}>{p.name}</span><span className={`${styles.d} ${styles.mono}`}>{p.reg_code ? `Reg ${p.reg_code}` : ''}</span>
                            </button>
                          )) : <div className={styles.pempty}>Klienti ei leitud</div>}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={`${styles.fld} ${styles.mid}`}>
                    <div className={styles.lbl}>Arve number <span className={styles.r}>{invoice?.invoice_number ? 'seeriast' : 'tekib salvestamisel'}</span></div>
                    <div className={styles.ser}>
                      {invoice?.invoice_number ? <>{nr.pre && <span className={styles.pre}>{nr.pre}</span>}<span className={`${styles.val} ${styles.mono}`}>{nr.val}</span></> : <span className={styles.pending}>Number antakse seeriast salvestamisel</span>}
                    </div>
                  </div>
                  <div className={styles.fld}>
                    <div className={styles.lbl} style={{ paddingRight: 46 }}>Valuuta</div>
                    <select className={styles.inp} value={hdr.currency} onChange={(e) => setH({ currency: e.target.value })}>{(CURRENCIES.includes(hdr.currency) ? CURRENCIES : [...CURRENCIES, hdr.currency]).map((c) => <option key={c}>{c}</option>)}</select>
                  </div>

                  <div className={`${styles.fld} ${styles.wide}`}>
                    <div className={`${styles.lbl} ${styles.atabs}`}>
                      <button type="button" className={`${styles.atab} ${atab === 'bill' ? styles.atabOn : ''}`} onClick={() => switchTab('bill')}>Arve aadress</button>
                      <button type="button" className={`${styles.atab} ${atab === 'ship' ? styles.atabOn : ''}`} onClick={() => switchTab('ship')}>Tarne aadress{hdr.shipping.trim() && <span className={styles.adot} />}</button>
                      <button type="button" className={`${styles.atab} ${atab === 'ct' ? styles.atabOn : ''}`} onClick={() => switchTab('ct')}>Kontakt</button>
                      <span className={styles.r}>
                        {atab === 'bill' && <button type="button" className={styles.link} title="Taasta kliendikaardilt" onClick={restoreBilling}>Taasta</button>}
                        {atab === 'ship' && <button type="button" className={styles.link} title="Kopeeri arve aadress" onClick={copyBilling}>Kopeeri arve aadress</button>}
                        {atab === 'ct' && <button type="button" className={styles.link} title="Taasta kliendikaardilt" onClick={restoreContact}>Taasta</button>}
                      </span>
                    </div>
                    <div ref={addrPaneRef}>
                      {atab === 'bill' && <textarea ref={fitAddr} className={`${styles.inp} ${styles.addr}`} rows={1} value={hdr.billing} onChange={(e) => { setH({ billing: e.target.value }); fitAddr(e.target); }} />}
                      {atab === 'ship' && <textarea ref={fitAddr} className={`${styles.inp} ${styles.addr}`} rows={1} value={hdr.shipping} placeholder="Sama mis arve aadress" onChange={(e) => { setH({ shipping: e.target.value }); fitAddr(e.target); }} />}
                      {atab === 'ct' && (
                        <div className={styles.cgrid}>
                          <input className={styles.inp} value={hdr.contactName} placeholder="Kontaktisik" onChange={(e) => setH({ contactName: e.target.value })} />
                          <input className={styles.inp} value={hdr.contactEmail} placeholder="E-post" onChange={(e) => setH({ contactEmail: e.target.value })} />
                          <input className={`${styles.inp} ${styles.mono}`} value={hdr.contactPhone} placeholder="Telefon" onChange={(e) => setH({ contactPhone: e.target.value })} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className={styles.fld}><div className={styles.lbl}>Arve kuupäev</div><input className={`${styles.inp} ${styles.mono}`} value={hdr.issued} placeholder="pp.kk.aaaa" onChange={(e) => setH({ issued: e.target.value })} /></div>
                  <div className={styles.fld}><div className={styles.lbl}>Maksetähtaeg</div><input className={`${styles.inp} ${styles.mono}`} value={hdr.due} placeholder="pp.kk.aaaa" onChange={(e) => setH({ due: e.target.value })} /></div>
                  <div className={styles.fld}>
                    <div className={styles.lbl}>Maksetingimus</div>
                    <div className={styles.chips} onClick={(e) => e.stopPropagation()}>
                      {TERM_CHIPS.map((d) => <button key={d} type="button" className={`${styles.chip} ${termDays === d ? styles.chipOn : ''}`} onClick={() => setDue(d)}>{d}p</button>)}
                      <button type="button" className={`${styles.chip} ${moreOn ? styles.chipOn : ''}`} title="Kõik maksetingimused" onClick={() => setMenu(menu === 'terms' ? null : 'terms')}>{moreOn ? `${termDays}p` : '···'}</button>
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

                  <div className={`${styles.fld} ${styles.wide}`}><div className={styles.lbl}>Märkused <span className={styles.r}>nähtav arvel</span></div><input className={styles.inp} value={hdr.note} placeholder="Näiteks tänusõnad või tellimuse viide" onChange={(e) => setH({ note: e.target.value })} /></div>
                  <div className={styles.fld}>
                    <div className={styles.lbl}>KM kood</div>
                    <select className={styles.inp} value={hdr.vatc} disabled={!vatEnabled} onChange={(e) => setH({ vatc: e.target.value })}>{VAT_CODES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select>
                  </div>
                  <div className={`${styles.fld} ${styles.mid}`}>
                    <div className={styles.lbl}>Koostaja <span className={styles.r}>arvel</span></div>
                    <select className={styles.inp} value={hdr.authorId} onChange={(e) => setH({ authorId: e.target.value })}><option value="">—</option>{authorOptions.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
                  </div>
                  {showInote && <div className={`${styles.fld} ${styles.wide}`}><div className={styles.lbl}>Sisemärkus <span className={styles.r}>ei ole arvel</span></div><input className={styles.inp} value={hdr.inote} placeholder="Nähtav ainult raamatupidajale" onChange={(e) => setH({ inote: e.target.value })} /></div>}
                  {extra.hcc && <div className={styles.fld}><div className={styles.lbl}>Kulukoht <span className={styles.r}>ridadel</span></div><input className={styles.inp} value={hdr.costCenter} placeholder="Kulukoht" onChange={(e) => setH({ costCenter: e.target.value })} /></div>}
                  {extra.hprj && <div className={styles.fld}><div className={styles.lbl}>Projekt <span className={styles.r}>ridadel</span></div><input className={styles.inp} value={hdr.project} placeholder="Projekt" onChange={(e) => setH({ project: e.target.value })} /></div>}
                </div>
              </div>

              <div className={`${styles.sec} ${styles.linesec}`}>
                <div className={styles.lines} style={{ '--lcols': lcols.map((c) => c.w).join(' ') } as CSSProperties}>
                  <div className={styles.lh}>{lcols.map((c) => <div key={c.id} className={c.r ? styles.r : ''}>{c.l}</div>)}</div>
                  <div className={styles.rows}>
                    {lines.length === 0 && <div className={styles.empty}>Ridu pole — lisa esimene rida</div>}
                    {lines.map((l, i) => {
                      const net = lineNet(l), cut = r2(lineList(l) - net);
                      const matches = productRow === i ? productMatches(l.description) : [];
                      return (
                        <div key={l.key} className={`${styles.lr} ${dragIndex === i ? styles.dragging : ''} ${overIndex === i ? styles.over : ''}`}
                          onDragOver={(e) => { e.preventDefault(); if (overIndex !== i) setOverIndex(i); }} onDrop={(e) => { e.preventDefault(); if (dragIndex !== null) moveLine(dragIndex, i); setDragIndex(null); setOverIndex(null); }}
                          onKeyDown={(e) => rowKeys(e, i)}>
                          <div className={`${styles.ix} ${styles.mono}`} title="Lohista järjestamiseks" draggable onDragStart={() => setDragIndex(i)} onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}>{i + 1}</div>
                          <div><input className={styles.in} value={l.code} placeholder="Kood" onChange={(e) => updateLine(i, { code: e.target.value })} /></div>
                          <div>
                            <input ref={(el) => { descRefs.current.set(l.key, el); }} className={`${styles.in} ${l.description.trim() ? '' : styles.miss}`} value={l.description} placeholder="Kirjeldus"
                              onChange={(e) => { updateLine(i, { description: e.target.value }); setCatalogAll(false); setProductRow(i); }} onFocus={() => setProductRow(i)}
                              onBlur={() => setTimeout(() => setProductRow((r) => (r === i ? null : r)), 150)} />
                            {matches.length > 0 && (
                              <div className={styles.plist2}>
                                {matches.map((p) => (
                                  <button key={p.id} type="button" className={styles.pitem} onMouseDown={(e) => { e.preventDefault(); applyProduct(i, l, p); }}>
                                    <span className={styles.n}>{p.name}{p.code ? ` · ${p.code}` : ''}</span><span className={`${styles.d} ${styles.mono}`}>{p.unit_price != null ? fmtNum(Number(p.unit_price)) : ''}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <div>
                            <select className={`${styles.in} ${styles.sel} ${l.account_id ? '' : styles.miss}`} value={l.account_id} title={l.account_id ? `${accountMap.get(l.account_id)?.code || ''} ${accountMap.get(l.account_id)?.name || ''}` : 'Konto määramata'} onChange={(e) => updateLine(i, { account_id: e.target.value })}>
                              <option value="">—</option>{revenueAccounts.map((a) => <option key={a.id} value={a.id} title={a.name}>{a.code}</option>)}
                            </select>
                          </div>
                          {extra.lcc && <div><input className={styles.in} value={l.cost_center} placeholder="Kulukoht" onChange={(e) => updateLine(i, { cost_center: e.target.value })} /></div>}
                          {extra.lprj && <div><input className={styles.in} value={l.project} placeholder="Projekt" onChange={(e) => updateLine(i, { project: e.target.value })} /></div>}
                          <div><input className={`${styles.in} ${styles.r}`} inputMode="decimal" value={l.quantity} onChange={(e) => updateLine(i, { quantity: e.target.value })} /></div>
                          <div><select className={`${styles.in} ${styles.sel}`} value={l.unit} onChange={(e) => updateLine(i, { unit: e.target.value })}>{unitOptions(l.unit).map((u) => <option key={u}>{u}</option>)}</select></div>
                          <div><input className={`${styles.in} ${styles.r} ${styles.mono}`} inputMode="decimal" value={l.unit_price} placeholder="0,00" onChange={(e) => updateLine(i, { unit_price: e.target.value })} onBlur={(e) => { if (e.target.value.trim()) updateLine(i, { unit_price: fmtNum(num(e.target.value)) }); }} /></div>
                          <div><input className={`${styles.in} ${styles.r}`} inputMode="decimal" value={l.discount_percent} onChange={(e) => updateLine(i, { discount_percent: e.target.value })} /></div>
                          <div className={styles.rate}>{vatEnabled ? vat.rate : 0}%</div>
                          <div className={styles.sum}>{fmtNum(net)}{cut > 0 && <span className={styles.cut}>−{fmtNum(cut)}</span>}</div>
                          <div className={styles.ra}>
                            <button type="button" className={styles.iconbtn} title="Kopeeri rida" tabIndex={-1} onClick={() => dupLine(i)}>⧉</button>
                            <button type="button" className={`${styles.iconbtn} ${styles.del}`} title="Kustuta rida" tabIndex={-1} onClick={() => removeLine(i)}>✕</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className={styles.addrow}>
                    <button type="button" className={`${styles.btn} ${styles.sm} ${styles.ghost}`} onClick={() => addLine()}><svg className={styles.icon} viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg> Lisa rida</button>
                    <button type="button" className={`${styles.btn} ${styles.sm} ${styles.ghost}`} disabled={!products.length} title={products.length ? 'Otsi teenust kataloogist' : 'Tootekataloog on tühi'} onClick={() => addLine(true)}><svg className={styles.icon} viewBox="0 0 24 24"><path d="M21 21l-4.3-4.3M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" /></svg> Otsi teenust</button>
                    <span className={styles.hint}><kbd className={styles.kbd}>⏎</kbd> viimasel real lisab uue · <kbd className={styles.kbd}>⌥⌫</kbd> kustutab rea</span>
                  </div>
                  <div className={styles.ltot}>
                    <div className={`${styles.lcount} ${styles.mono}`}>{lines.length} rida</div>
                    <div className={styles.cells}>
                      <Cell k="Neto" v={money(totals.net, hdr.currency)} />
                      {totals.cut > 0 && <Cell k="Allahindlus" v={`−${money(totals.cut, hdr.currency)}`} cls={styles.cutCell} />}
                      <Cell k={`KM ${vatEnabled ? vat.rate : 0}%`} v={money(totals.vat, hdr.currency)} />
                      <Cell k="Kokku" v={money(totals.tot, hdr.currency)} cls={styles.big} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className={styles.footbar}>
            <div className={styles.fhint}><span><kbd className={styles.kbd}>⌘S</kbd> salvesta</span><span><kbd className={styles.kbd}>⏎</kbd> uus rida</span><span><kbd className={styles.kbd}>Esc</kbd> loobu</span></div>
            <div className={styles.fr}>
              <button type="button" className={`${styles.btn} ${styles.sm} ${styles.ghost}`} onClick={preview}>Eelvaade</button>
              <button type="button" className={`${styles.btn} ${styles.sm} ${styles.ghost} ${styles.danger}`} disabled={!id || !!busy || !isDraft} onClick={() => setConfirmDelete(true)}>Kustuta mustand</button>
            </div>
          </div>
        </div>

        <div className={`${styles.gutter} ${resizing ? styles.gutterActive : ''}`} title="Lohista paneeli laiust · topeltklikk lähtestab" onPointerDown={resizePanel} onDoubleClick={() => { setPw(DEFAULT_PW); localStorage.setItem(KEYS.pw, String(DEFAULT_PW)); }} />

        <div className={styles.right}>
          <div className={styles.sec}>
            <div className={styles.sech}>Kokkuvõte<span className={styles.r}><button type="button" className={styles.iconbtn} title="Peida paneel" onClick={() => toggleRail(false)}>✕</button></span></div>
            <div className={`${styles.bigTotal} ${styles.mono}`}>{money(totals.tot, hdr.currency)}</div>
            <div className={styles.sub}>{lines.length} rida · {vat.label}</div>
            <div className={styles.sub} style={{ margin: '-6px 0 9px' }}>Koostaja <b style={{ fontWeight: 600, color: 'var(--a-text-2)' }}>{authorName || '—'}</b></div>
            <div className={styles.kv}><span>Ridade summa</span><b>{money(totals.list, hdr.currency)}</b></div>
            {totals.cut > 0 && <div className={styles.kv}><span>Allahindlus</span><b className={styles.neg}>−{money(totals.cut, hdr.currency)}</b></div>}
            <div className={styles.kv}><span>Maksustatav käive</span><b>{money(totals.net, hdr.currency)}</b></div>
            <div className={styles.kv}><span>Käibemaks {vatEnabled ? vat.rate : 0}%</span><b>{money(totals.vat, hdr.currency)}</b></div>
            <div className={`${styles.kv} ${styles.tot}`}><span>Kokku tasumisele</span><b>{money(totals.tot, hdr.currency)}</b></div>
            <div className={styles.kv} style={{ marginTop: 7, borderTop: '1px solid var(--a-border)', paddingTop: 6 }}><span>Makseviide</span><b className={styles.mono}>{invoice?.payment_reference || '—'}</b></div>
          </div>
          <div className={styles.sec}>
            <div className={styles.sech}>Kontroll</div>
            {checks.map((c, i) => <div key={i} className={`${styles.chk} ${c.s === 'ok' ? '' : c.s === 'warn' ? styles.warn : styles.err}`}><span className={styles.m}>{c.s === 'ok' ? '✓' : '!'}</span><span>{c.t}</span></div>)}
          </div>
          <div className={styles.sec}>
            <div className={styles.sech}>Konteering<span className={styles.r}>eelvaade</span></div>
            <div className={styles.jt}>
              <div className={styles.jh}><div>Konto</div><div>Nimetus</div><div className={styles.r}>Deebet</div><div className={styles.r}>Kreedit</div></div>
              {journalRows.map((r, i) => <div key={i} className={styles.jr}><div className={styles.mono}>{r.code}</div><div className={styles.n}>{r.name}</div><div className={`${styles.a} ${r.d ? '' : styles.z}`}>{r.d ? fmtNum(r.d) : '—'}</div><div className={`${styles.a} ${r.c ? '' : styles.z}`}>{r.c ? fmtNum(r.c) : '—'}</div></div>)}
            </div>
            <div className={styles.jnote}>Kanne tekib arve kinnitamisel.</div>
          </div>
          <div className={styles.sec}>
            <div className={styles.sech}>Klient<span className={styles.r}><Link href="/accounting/partners">Kliendikaart</Link></span></div>
            <div className={styles.kv}><span>Registrikood</span><b className={styles.mono}>{partner?.reg_code || '—'}</b></div>
            <div className={`${styles.kv} ${styles.kvWrap}`}><span>Aadress</span><b>{hdr.billing.trim() || '—'}</b></div>
            <div className={styles.kv}><span>E-post</span><b>{hdr.contactEmail.trim() || partner?.email || '—'}</b></div>
            <div className={styles.kv}><span>Avatud saldo</span><b className={styles.mono}>{balance != null ? money(balance, hdr.currency) : '—'}</b></div>
            <div className={styles.kv}><span>Krediidilimiit</span><b className={`${styles.mono} ${creditLimit && (balance ?? 0) + totals.tot > creditLimit ? styles.neg : ''}`}>{creditLimit ? money(creditLimit, hdr.currency) : '—'}</b></div>
            <div className={styles.kv}><span>Keskm. laekumisaeg</span><b>—</b></div>
          </div>
          <div className={styles.sec} style={{ borderBottom: 'none' }}>
            <div className={styles.sech}>Ajalugu</div>
            {imported && <div className={`${styles.tlrow} ${styles.done}`}><span className={styles.mono}>{dateText(invoice?.created_at)}</span><span className={styles.bul} /><span>Imporditud Futursoftist</span></div>}
            <div className={`${styles.tlrow} ${invoice ? styles.done : ''}`}><span className={styles.mono}>{dateText(invoice?.created_at)}</span><span className={styles.bul} /><span>{invoice ? `Mustand loodud · ${authorName || '—'}` : 'Mustand loomata'}</span></div>
            <div className={`${styles.tlrow} ${!dirty && (savedAt || invoice) ? styles.done : ''}`}><span className={styles.mono}>{dirty ? '—' : dateText(savedAt || invoice?.updated_at)}</span><span className={styles.bul} /><span>{dirty ? 'Salvestamata muudatused' : savedAt || invoice ? `Mustand salvestatud ${timeText(savedAt || invoice!.updated_at)}` : 'Salvestamata'}</span></div>
            <div className={styles.tlrow}><span className={styles.mono}>—</span><span className={styles.bul} /><span>Ootab kinnitamist</span></div>
          </div>
        </div>
      </div>

      <ConfirmDialog open={confirmCancel} onOpenChange={setConfirmCancel} title="Jäta muudatused salvestamata?" description="Arvel on salvestamata muudatusi. Loobumisel lähevad need kaduma." confirmLabel="Loobu muudatustest" variant="warning"
        onConfirm={() => { setDirty(false); router.push('/invoices/sales'); }} />
      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title="Kustuta mustand?" description={`Mustand ${numberText || ''} kustutatakse jäädavalt. Kinnitatud arveid ei saa kustutada, neid saab ainult krediteerida.`} confirmLabel="Kustuta mustand"
        onConfirm={deleteDraft} />
    </div>
  );
}
