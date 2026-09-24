'use client';

/**
 * Korduva arve mall — template editor laid out like a sales invoice
 * (docs2/design_handoff_korduvad_arved, "Korduva arve mall.html" + kogused.js).
 */

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { accountingApi, type AccountOption, type AccountingSettings, type PartnerRecord } from '@/lib/api/accounting.api';
import { getErrorMessage } from '@/lib/api/client';
import { productsApi, type Product } from '@/lib/api/products.api';
import { tenantsApi, type TenantMember } from '@/lib/api/tenants.api';
import {
  recurringInvoicesApi,
  type ClientChannel,
  type Delivery,
  type RecurringTemplate,
  type TemplateInput,
  type TemplateRun,
} from '@/lib/api/recurringInvoices.api';
import { useAuthStore } from '@/lib/stores/auth.store';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { showToast } from '@/components/ui/Toast';
import { eur, frequencyMonths, initials, isoToEt, nextRun, num, periodFor, r2, toFrequency, todayIso } from './shared';
import s from './RecurringTemplateEditor.module.css';

type VatCode = { key: string; label: string; short: string; rate: number };
// Same keys as the sales editor; the template's code sets every line's rate.
const VAT_CODES: VatCode[] = [
  { key: 'd24', label: 'Siseriiklik 24%', short: '24%', rate: 24 },
  { key: 'd22', label: 'Siseriiklik 22%', short: '22%', rate: 22 },
  { key: 'd9', label: 'Siseriiklik 9%', short: '9%', rate: 9 },
  { key: 'eug', label: 'EU kauba müük 0%', short: 'EU kaup', rate: 0 },
  { key: 'eus', label: 'EU teenus 0% (pöördmaks)', short: 'EU teenus', rate: 0 },
  { key: 'exp', label: 'Eksport 0%', short: 'Eksport', rate: 0 },
  { key: 'ex', label: 'Maksuvaba käive', short: 'Maksuvaba', rate: 0 },
];
const UNITS = ['tk', 'h', 'kuu', 'km', 'kmpl', 'GB'];
const CURRENCIES = ['EUR', 'USD', 'SEK'];
const FREQ = [
  { m: 1, l: 'Igakuine', s: 'kuu' },
  { m: 2, l: 'Iga 2 kuu järel', s: '2 kuud' },
  { m: 3, l: 'Kvartaalne', s: 'kvartal' },
  { m: 6, l: 'Poolaastane', s: 'poolaasta' },
  { m: 12, l: 'Aastane', s: 'aasta' },
];
const TERMS = [7, 14, 30];
const CHANNELS: Array<[ClientChannel, string]> = [['einvoice', 'E-arve'], ['email', 'E-post'], ['none', 'Ei saada']];
const PERIODS: Array<[number, string]> = [[0, 'Jooksev periood'], [-1, 'Eelmine periood'], [1, 'Järgmine periood']];
const KEYS = { pw: 'arvelo.rec.edit.pw', rail: 'arvelo.rec.edit.rail', coll: 'arvelo.rec.edit.coll' };
const DEFAULT_PW = 330, MIN_PW = 260, MIN_EDITOR = 640, SHELL_MIN = 1180, GUTTER = 9;

let seq = 0;
const nextKey = () => ++seq;

type Line = {
  key: number;
  id?: string;
  code: string;
  description: string;
  account_id: string;
  product_id: string | null;
  unit: string;
  quantity: string;
  unit_price: string;
  discount: string;
  variable: boolean;
};

type Client = {
  key: number;
  partner_id: string;
  name: string;
  reg: string;
  email: string;
  channel: ClientChannel;
  active: boolean;
  einvoiceIban: string | null;
};

type Header = {
  name: string;
  description: string;
  currency: string;
  months: number;
  day: number;
  start: string; // dd.mm.yyyy — next invoice date
  end: string;
  term: number;
  delivery: Delivery;
  offset: number;
  note: string;
  vatc: string;
  authorId: string;
  active: boolean;
};

type CheckState = 'ok' | 'warn' | 'err';
type Check = { s: CheckState; t: ReactNode };

const pn = (v: string) => {
  const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
const fmtNum = (n: number) => n.toLocaleString('et-EE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/ /g, ' ');
const isoToEtStrict = (iso?: string | null) => (iso ? isoToEt(iso) : '');
const etToIso = (v: string): string | null => {
  const m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(v.trim());
  if (!m) return null;
  const iso = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return Number.isNaN(new Date(iso + 'T00:00:00Z').getTime()) ? null : iso;
};
const addDaysIso = (iso: string, days: number) => {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

function monthsOf(t: RecurringTemplate) {
  return frequencyMonths(t) ?? 1;
}

function headerFrom(t: RecurringTemplate): Header {
  const m = monthsOf(t);
  return {
    name: t.name,
    description: t.description || '',
    currency: t.currency,
    months: FREQ.some((f) => f.m === m) ? m : 1,
    day: t.day_of_month || Number(t.next_invoice_date.slice(8, 10)),
    start: isoToEtStrict(t.next_invoice_date),
    end: isoToEtStrict(t.end_date),
    term: t.payment_terms_days,
    delivery: t.delivery,
    offset: t.billing_period_offset || 0,
    note: t.notes || '',
    vatc: t.vat_code && VAT_CODES.some((c) => c.key === t.vat_code) ? t.vat_code : rateToCode(t.lines?.[0]?.tax_rate ?? 24),
    authorId: t.author_user_id || '',
    active: t.is_active,
  };
}

function rateToCode(rate: number) {
  return VAT_CODES.find((c) => c.rate === Number(rate))?.key || 'd24';
}

function firstRunFor(day: number): string {
  const today = todayIso();
  const [y, m] = today.split('-').map(Number);
  for (let i = 0; i < 2; i++) {
    const last = new Date(Date.UTC(y, m - 1 + i + 1, 0)).getUTCDate();
    const iso = new Date(Date.UTC(y, m - 1 + i, Math.min(day, last))).toISOString().slice(0, 10);
    if (iso >= today) return iso;
  }
  return today;
}

const emptyHeader = (authorId: string): Header => ({
  name: '', description: '', currency: 'EUR', months: 1, day: 1, start: isoToEt(firstRunFor(1)), end: '', term: 14,
  delivery: 'review', offset: 0, note: '', vatc: 'd24', authorId, active: true,
});

const emptyLine = (account_id = '', unit = 'kuu'): Line => ({
  key: nextKey(), code: '', description: '', account_id, product_id: null, unit, quantity: '1', unit_price: '', discount: '0', variable: false,
});

type Props = { templateId?: string };

export default function RecurringTemplateEditor({ templateId }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const { tenant, user } = useAuthStore();
  const [id, setId] = useState<string | null>(templateId || null);
  const [loaded, setLoaded] = useState<RecurringTemplate | null>(null);
  const [loading, setLoading] = useState(!!templateId);
  const [hdr, setHdr] = useState<Header>(() => emptyHeader(user?.id || ''));
  const [lines, setLines] = useState<Line[]>(() => [emptyLine()]);
  const [clients, setClients] = useState<Client[]>([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'lines' | 'cli'>('lines');
  const [menu, setMenu] = useState<'copy' | 'freq' | null>(null);
  const [cmenu, setCmenu] = useState<{ style: CSSProperties } | null>(null);
  const [csearch, setCsearch] = useState('');
  const [confirm, setConfirm] = useState<'delete' | 'leave' | null>(null);
  const [partners, setPartners] = useState<PartnerRecord[]>([]);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [settings, setSettings] = useState<AccountingSettings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [members, setMembers] = useState<TenantMember[]>([]);
  const [productRow, setProductRow] = useState<number | null>(null);
  const [rail, setRail] = useState(true);
  const [pw, setPw] = useState(DEFAULT_PW);
  const [coll, setColl] = useState(false);
  const [dragging, setDragging] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const addFormBtn = useRef<HTMLButtonElement>(null);
  const addTabBtn = useRef<HTMLButtonElement>(null);
  const csearchRef = useRef<HTMLInputElement>(null);
  const descRefs = useRef(new Map<number, HTMLInputElement>());

  /* ── persisted chrome ── */
  useEffect(() => {
    setPw(Number(localStorage.getItem(KEYS.pw)) || DEFAULT_PW);
    setRail(localStorage.getItem(KEYS.rail) !== '0');
    setColl(localStorage.getItem(KEYS.coll) === '1');
  }, []);

  /* ── reference data ── */
  useEffect(() => {
    accountingApi.listPartners({ is_active: true }).then((rows) => setPartners(rows.filter((p) => p.type !== 'supplier'))).catch(() => {});
    accountingApi.getAccounts().then(setAccounts).catch(() => {});
    accountingApi.getAccountingSettings().then(setSettings).catch(() => {});
    productsApi.list().then(setProducts).catch(() => {});
    if (tenant?.id) tenantsApi.getMembers(tenant.id).then(setMembers).catch(() => {});
  }, [tenant?.id]);

  const applyTemplate = useCallback((t: RecurringTemplate) => {
    setLoaded(t);
    setHdr(headerFrom(t));
    setLines((t.lines || []).map((l) => ({
      key: nextKey(), id: l.id, code: l.code || '', description: l.description, account_id: l.account_id || '',
      product_id: l.product_id, unit: l.unit || 'tk', quantity: String(l.quantity).replace('.', ','),
      unit_price: fmtNum(l.unit_price), discount: String(l.discount_percent || 0).replace('.', ','), variable: l.variable_quantity,
    })));
    setClients((t.clients || []).map((c) => ({
      key: nextKey(), partner_id: c.partner_id, name: c.partner?.name || '—', reg: c.partner?.reg_code || '',
      email: c.email || '', channel: c.channel, active: c.is_active, einvoiceIban: c.partner?.einvoice_iban || null,
    })));
    setDirty(false);
  }, []);

  useEffect(() => {
    if (!templateId) return;
    setLoading(true);
    recurringInvoicesApi.get(templateId)
      .then(applyTemplate)
      .catch((e) => showToast.error(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [templateId, applyTemplate]);

  // ?clients=1 → open the client search (after "copy without clients").
  useEffect(() => {
    if (!loading && params.get('clients') === '1') setTimeout(() => openClientMenu('form'), 60);
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── derived ── */
  const vat = VAT_CODES.find((c) => c.key === hdr.vatc) || VAT_CODES[0];
  const revenueAccounts = useMemo(() => accounts.filter((a) => a.is_active && a.type === 'revenue'), [accounts]);
  const salesDefault = settings?.sales_revenue_account_id || '';
  const freq = FREQ.find((f) => f.m === hdr.months) || FREQ[0];
  const variableCount = lines.filter((l) => l.variable).length;
  const activeClients = clients.filter((c) => c.active);
  const netOf = (l: Line) => (l.variable ? 0 : r2(pn(l.quantity) * pn(l.unit_price) * (1 - pn(l.discount) / 100)));
  const totals = useMemo(() => {
    const net = r2(lines.reduce((sum, l) => sum + netOf(l), 0));
    const vatAmt = r2(lines.reduce((sum, l) => sum + r2(netOf(l) * vat.rate / 100), 0));
    return { net, vat: vatAmt, tot: r2(net + vatAmt) };
  }, [lines, vat.rate]);

  useEffect(() => {
    if (!salesDefault) return;
    setLines((ls) => ls.map((l) => (l.account_id || l.id ? l : { ...l, account_id: salesDefault })));
  }, [salesDefault]);

  const startIso = etToIso(hdr.start);
  const endIso = hdr.end.trim() ? etToIso(hdr.end) : null;
  const schedule = { frequency: toFrequency(hdr.months).frequency, interval_count: toFrequency(hdr.months).interval_count, day_of_month: hdr.day, billing_period_offset: hdr.offset };
  const upcoming = useMemo(() => {
    if (!startIso) return [] as string[];
    const out: string[] = [];
    let cur = startIso;
    for (let i = 0; i < 4; i++) {
      if (endIso && cur > endIso) break;
      out.push(cur);
      cur = nextRun(schedule, cur);
    }
    return out;
  }, [startIso, endIso, hdr.months, hdr.day]); // eslint-disable-line react-hooks/exhaustive-deps

  const authorName = useMemo(() => {
    const m = members.find((x) => x.user.id === hdr.authorId);
    if (m) return m.user.name || m.user.email;
    return user && hdr.authorId === user.id ? user.name || user.email : '—';
  }, [members, hdr.authorId, user]);

  const pendingCount = (loaded?.open_pending || []).filter((p) => p.status === 'awaiting_quantity' || p.status === 'ready').length;
  const pendingFirst = (loaded?.open_pending || []).find((p) => p.status === 'awaiting_quantity' || p.status === 'ready');
  const lastFailed = (loaded?.recent_runs || []).find((r) => r.status === 'failed' || r.delivery_status === 'failed');

  const checks: Check[] = useMemo(() => {
    const out: Check[] = [];
    const a = activeClients.length;
    if (!clients.length) out.push({ s: 'err', t: 'Mallil pole kliente' });
    else out.push({ s: a ? 'ok' : 'warn', t: <><b>{a}</b> aktiivset klienti {clients.length}-st</> });
    const noDesc = lines.filter((l) => !l.description.trim()).length;
    if (!lines.length) out.push({ s: 'err', t: 'Mallil pole ridu' });
    else if (noDesc) out.push({ s: 'err', t: <><b>{noDesc}</b> rida ilma kirjelduseta</> });
    else if (variableCount) out.push({ s: 'warn', t: <><b>{variableCount}</b> rida vajab igal perioodil kogust. Arved luuakse mustandina ja ootavad sisestamist</> });
    else out.push({ s: 'ok', t: <><b>{lines.length}</b> rida, kõik summad täidetud</> });
    const noAcc = lines.filter((l) => !l.account_id).length;
    if (noAcc) out.push({ s: 'warn', t: <><b>{noAcc}</b> real puudub tulukonto</> });
    if (!startIso) out.push({ s: 'err', t: 'Alguskuupäev vormis pp.kk.aaaa' });
    else if (hdr.end.trim() && !endIso) out.push({ s: 'err', t: 'Lõppkuupäev vormis pp.kk.aaaa' });
    else if (endIso && endIso < startIso) out.push({ s: 'err', t: 'Lõpp on enne algust' });
    else out.push({ s: 'ok', t: <>{freq.l}, <b>{hdr.day === 31 ? 'kuu viimasel päeval' : `${hdr.day}. kuupäeval`}</b></> });
    const noMail = activeClients.filter((c) => c.channel === 'email' && !c.email.includes('@')).length;
    if (noMail) out.push({ s: 'warn', t: <><b>{noMail}</b> kliendil puudub e-post</> });
    const noIban = activeClients.filter((c) => c.channel === 'einvoice' && !c.einvoiceIban).length;
    if (noIban) out.push({ s: 'warn', t: <><b>{noIban}</b> kliendil puudub e-arve IBAN (kliendikaardil)</> });
    if (hdr.delivery === 'auto' && !variableCount) out.push({ s: 'ok', t: 'Arved saadetakse ilma ülevaatuseta' });
    if (lastFailed) out.push({ s: 'warn', t: <>Eelmine jooks <b>{isoToEt(lastFailed.period_end)}</b> ebaõnnestus</> });
    return out;
  }, [clients, activeClients, lines, variableCount, startIso, endIso, hdr.end, hdr.day, hdr.delivery, freq.l, lastFailed]);

  /* ── mutations ── */
  const setH = (patch: Partial<Header>) => { setHdr((h) => ({ ...h, ...patch })); setDirty(true); };
  const updateLine = (i: number, patch: Partial<Line>) => { setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l))); setDirty(true); };
  const addLine = () => {
    const last = lines[lines.length - 1];
    const l = emptyLine(last?.account_id || salesDefault, last?.unit || 'kuu');
    setLines((ls) => [...ls, l]);
    setDirty(true);
    setTimeout(() => descRefs.current.get(l.key)?.focus(), 0);
  };
  const toggleVariable = (i: number) => {
    const l = lines[i];
    const on = !l.variable;
    updateLine(i, { variable: on, quantity: !on && !pn(l.quantity) ? '1' : l.quantity });
    showToast.info(on ? 'Kogus sisestatakse iga kord · automaatne saatmine peatub' : 'Rida on püsiva kogusega');
  };
  const applyProduct = (i: number, p: Product) => {
    const l = lines[i];
    updateLine(i, {
      description: p.description || p.name, code: p.code || l.code, unit: p.unit || l.unit, product_id: p.id,
      unit_price: p.unit_price != null ? fmtNum(Number(p.unit_price)) : l.unit_price, account_id: p.sales_account_id || l.account_id,
    });
    setProductRow(null);
  };
  const insertPlaceholder = (ph: string) => {
    if (!lines.length) return;
    const i = lines.length - 1;
    updateLine(i, { description: `${lines[i].description} ${ph}`.trim() });
    showToast.info(`${ph} lisatud viimasele reale`);
  };

  const addClient = (p: PartnerRecord) => {
    setClients((cs) => [...cs, {
      key: nextKey(), partner_id: p.id, name: p.name, reg: p.reg_code || '', email: p.email || '',
      channel: p.einvoice_iban ? 'einvoice' : 'email', active: true, einvoiceIban: p.einvoice_iban || null,
    }]);
    setDirty(true);
    setCsearch('');
    showToast.success(`${p.name} lisatud — saab järgmise jooksuga arve`);
    setTimeout(() => csearchRef.current?.focus(), 0);
  };
  const updateClient = (i: number, patch: Partial<Client>) => { setClients((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c))); setDirty(true); };

  const clientMatches = useMemo(() => {
    const used = new Set(clients.map((c) => c.partner_id));
    const q = csearch.trim().toLowerCase();
    return partners
      .filter((p) => !used.has(p.id) && (!q || p.name.toLowerCase().includes(q) || (p.reg_code || '').includes(q)))
      .slice(0, 40);
  }, [partners, clients, csearch]);

  const openClientMenu = (anchor: 'form' | 'tab') => {
    const btn = (anchor === 'form' ? addFormBtn : addTabBtn).current;
    if (!btn) return;
    const b = btn.getBoundingClientRect();
    const style: CSSProperties = anchor === 'form'
      ? { top: b.bottom + 4, left: Math.max(8, b.right - 280), maxHeight: window.innerHeight - b.bottom - 16 }
      : { bottom: window.innerHeight - b.top + 4, left: b.left, maxHeight: b.top - 16 };
    setMenu(null);
    setCsearch('');
    setCmenu({ style });
    setTimeout(() => csearchRef.current?.focus(), 0);
  };

  /* ── save ── */
  const buildInput = (activate?: boolean): TemplateInput | null => {
    if (!startIso) { showToast.error('Alguskuupäev vormis pp.kk.aaaa'); return null; }
    if (hdr.end.trim() && !endIso) { showToast.error('Lõppkuupäev vormis pp.kk.aaaa'); return null; }
    if (!hdr.name.trim()) { showToast.error('Sisesta malli nimi'); return null; }
    return {
      name: hdr.name.trim(),
      description: hdr.description.trim() || null,
      currency: hdr.currency,
      notes: hdr.note.trim() || null,
      payment_terms_days: hdr.term,
      ...toFrequency(hdr.months),
      day_of_month: hdr.day,
      billing_period_offset: hdr.offset,
      delivery: hdr.delivery,
      vat_code: vat.key,
      next_invoice_date: startIso,
      end_date: endIso,
      is_active: activate ? true : hdr.active,
      ...(hdr.authorId ? { author_user_id: hdr.authorId } : {}),
      lines: lines.map((l) => ({
        ...(l.id ? { id: l.id } : {}),
        code: l.code.trim() || null,
        description: l.description.trim(),
        account_id: l.account_id || null,
        product_id: l.product_id,
        unit: l.unit || null,
        quantity: l.variable ? 0 : pn(l.quantity),
        unit_price: pn(l.unit_price),
        discount_percent: pn(l.discount),
        tax_rate: vat.rate,
        variable_quantity: l.variable,
      })),
      clients: clients.map((c) => ({ partner_id: c.partner_id, email: c.email.trim() || null, channel: c.channel, is_active: c.active })),
    } as TemplateInput;
  };

  const save = async (activate = false): Promise<RecurringTemplate | null> => {
    if (activate && checks.some((c) => c.s === 'err')) {
      showToast.error('Paranda kontrolli vead enne aktiveerimist');
      return null;
    }
    const input = buildInput(activate);
    if (!input) return null;
    setSaving(true);
    try {
      const saved = id ? await recurringInvoicesApi.update(id, input) : await recurringInvoicesApi.create(input);
      applyTemplate(saved);
      if (!id) {
        setId(saved.id);
        router.replace(`/invoices/recurring/${saved.id}`);
      }
      showToast.success(activate ? 'Mall salvestatud ja aktiivne' : 'Mall salvestatud');
      return saved;
    } catch (e) {
      showToast.error(getErrorMessage(e));
      return null;
    } finally {
      setSaving(false);
    }
  };

  const copy = async (withClients: boolean) => {
    setMenu(null);
    if (!id) return;
    try {
      const created = await recurringInvoicesApi.copy(id, withClients);
      showToast.success(withClients ? 'Mall kopeeritud koos klientidega' : 'Mall kopeeritud — lisa kliendid');
      router.push(`/invoices/recurring/${created.id}${withClients ? '' : '?clients=1'}`);
    } catch (e) {
      showToast.error(getErrorMessage(e));
    }
  };

  const generateNow = async () => {
    const saved = dirty || !id ? await save() : loaded;
    if (!saved) return;
    try {
      const r = await recurringInvoicesApi.generateNow(saved.id);
      if (r.pending_created) showToast.info(`${r.pending_created} arvet ootab kogust`);
      else if (r.errors) showToast.error(`${r.generated} arvet loodud, ${r.errors} ebaõnnestus`);
      else showToast.success(`${r.generated} arvet loodud`);
      applyTemplate(await recurringInvoicesApi.get(saved.id));
    } catch (e) {
      showToast.error(getErrorMessage(e));
    }
  };

  const remove = async () => {
    if (!id) return router.push('/invoices/recurring');
    try {
      await recurringInvoicesApi.delete(id);
      showToast.success('Mall kustutatud');
      router.push('/invoices/recurring');
    } catch (e) {
      showToast.error(getErrorMessage(e));
    }
  };

  const cancel = () => (dirty ? setConfirm('leave') : router.push('/invoices/recurring'));

  /* ── keys ── */
  const saveRef = useRef(save);
  saveRef.current = save;
  const cancelRef = useRef(cancel);
  cancelRef.current = cancel;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 's') { e.preventDefault(); saveRef.current(); return; }
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (coll && tab !== 'cli') setTab('cli');
        setTimeout(() => openClientMenu(tab === 'cli' || coll ? 'tab' : 'form'), 0);
        return;
      }
      if (e.key === 'Escape') {
        if (cmenu || menu || productRow != null) { setCmenu(null); setMenu(null); setProductRow(null); return; }
        if (confirm) return;
        cancelRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [coll, tab, cmenu, menu, productRow, confirm]);

  // Close menus on outside click (document-level so row buttons' stopPropagation is respected).
  useEffect(() => {
    const close = () => { setMenu(null); setCmenu(null); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  /* ── rail resize ── */
  const clampPw = useCallback((v: number) => {
    const w = Math.max(SHELL_MIN, shellRef.current?.clientWidth || SHELL_MIN);
    return Math.max(MIN_PW, Math.min(v, w - GUTTER - MIN_EDITOR));
  }, []);
  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    const x0 = e.clientX, w0 = clampPw(pw);
    let last = w0;
    setDragging(true);
    const mv = (ev: MouseEvent) => { last = clampPw(w0 - (ev.clientX - x0)); setPw(last); };
    const up = () => {
      setDragging(false);
      localStorage.setItem(KEYS.pw, String(last));
      window.removeEventListener('mousemove', mv);
      window.removeEventListener('mouseup', up);
    };
    window.addEventListener('mousemove', mv);
    window.addEventListener('mouseup', up);
  };
  const toggleRail = (v: boolean) => { setRail(v); localStorage.setItem(KEYS.rail, v ? '1' : '0'); };
  const toggleColl = () => { const v = !coll; setColl(v); localStorage.setItem(KEYS.coll, v ? '1' : '0'); };

  if (loading) return <div className={s.loading}><Loader2 className="h-5 w-5 animate-spin" /></div>;

  const lcols = ['22px', '74px', 'minmax(180px,1fr)', '76px', '76px', '54px', '84px', '50px', '50px', '92px', '46px'];
  const lhead: Array<[string, boolean?]> = [['', false], ['Kood'], ['Kirjeldus'], ['Konto'], ['Kogus', true], ['Ühik'], ['Ühikuhind', true], ['Ale %', true], ['KM'], ['Rea summa', true], ['']];
  const nextRunIso = hdr.active ? upcoming[0] : undefined;
  const runTotal = r2(totals.tot * activeClients.length);
  const mrr = r2(totals.net * activeClients.length / hdr.months);
  const dayLabel = hdr.day === 31 ? 'kuu viimasel päeval' : `${hdr.day}. kuupäeval`;
  const delivText = variableCount ? 'Mustand · ootab kogust' : hdr.delivery === 'auto' ? 'Autosaatmine' : 'Ülevaatusele';
  const quantitiesHref = id ? `/invoices/recurring/quantities?mall=${id}` : '/invoices/recurring/quantities';

  return (
    <div ref={shellRef} className={s.shell} style={{ '--pw': `${clampPw(pw)}px`, '--lcols': lcols.join(' '), cursor: dragging ? 'col-resize' : undefined, userSelect: dragging ? 'none' : undefined } as CSSProperties}>
      <div className={s.topbar}>
        <div className={s.crumb}><Link href="/invoices/recurring">← Korduvad</Link><span className={s.sep}>/</span></div>
        <h1>{hdr.name || 'Nimetu mall'}</h1>
        <span className={`${s.tag} ${hdr.active ? s.tagOk : s.tagOff}`}><span className={s.dot} />{hdr.active ? 'Aktiivne' : 'Peatatud'}</span>
        <span className={`${s.tag} ${s.tagRec}`}><span className={s.dot} />Korduv mall</span>
        <span className={s.who}>{clients.length} klienti · järgmine {nextRunIso ? isoToEt(nextRunIso) : '—'}</span>
        <div className={s.acts}>
          <span className={`${s.dirty} ${dirty ? '' : s.clean}`}><span className={s.dot} />{dirty ? 'Salvestamata muudatused' : 'Salvestatud'}</span>
          <button className={`${s.btn} ${s.ghost}`} onClick={cancel}>Loobu <kbd className={s.kbd}>Esc</kbd></button>
          {id && (
            <span className={s.mwrap}>
              <button className={s.btn} onClick={(e) => { e.stopPropagation(); setMenu(menu === 'copy' ? null : 'copy'); }}>⧉ Kopeeri mall</button>
              {menu === 'copy' && (
                <div className={s.menu} style={{ width: 236 }} onClick={(e) => e.stopPropagation()}>
                  <div className={s.mh}>Uus mall samade ridadega</div>
                  <button className={s.mrow} onClick={() => copy(false)}><span>Ilma klientideta<span className={s.msub}>Lisad kliendid ise</span></span></button>
                  <button className={s.mrow} onClick={() => copy(true)}><span>Koos klientidega<span className={s.msub}>{clients.length} klienti kopeeritakse</span></span></button>
                </div>
              )}
            </span>
          )}
          <button className={s.btn} disabled={(!dirty && !!id) || saving} onClick={() => save()}>Salvesta <kbd className={s.kbd}>⌘S</kbd></button>
          <button className={`${s.btn} ${s.primary}`} disabled={saving} onClick={() => save(true)}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Salvesta ja aktiveeri
          </button>
          <button className={`${s.btn} ${s.ghost}`} onClick={() => toggleRail(!rail)}>▥ <span className={s.railLbl}>{rail ? 'Peida kokkuvõte' : 'Näita kokkuvõtet'}</span></button>
        </div>
      </div>

      <div className={`${s.body} ${s.card} ${rail ? '' : s.norail}`}>
        <div className={s.left}>
          <div className={s.lscroll}>
            <div className={`${s.sec} ${s.form} ${coll ? s.collapsed : ''}`}>
              <div className={s.fbar}><button className={s.collbtn} onClick={toggleColl} title={coll ? 'Näita malli andmeid' : 'Ahenda malli andmed'}>{coll ? '▸' : '▾'}</button></div>
              {coll && (
                <div className={s.csum}>
                  <b>{hdr.name || 'Nimetu mall'}</b><span className={s.s}>·</span>
                  {freq.l}, {hdr.day === 31 ? 'viimane päev' : `${hdr.day}.`}<span className={s.s}>·</span>
                  <span className={s.mono}>{hdr.start}</span> → <span className={s.mono}>{hdr.end || 'tähtajatu'}</span><span className={s.s}>·</span>
                  +{hdr.term}p<span className={s.s}>·</span>{hdr.delivery === 'auto' ? 'Autosaatmine' : 'Ülevaatusele'}<span className={s.s}>·</span>{vat.short}
                </div>
              )}
              <div className={s.fgrid}>
                <div className={`${s.fld} ${s.wide}`}>
                  <label>Malli nimi <span className={s.lblR}>ei ole arvel</span></label>
                  <input className={`${s.inp} ${hdr.name.trim() ? '' : s.inpErr}`} value={hdr.name} onChange={(e) => setH({ name: e.target.value })} placeholder="Näiteks Hooldus_kuutasu" autoFocus={!templateId} />
                </div>
                <div className={s.fld}>
                  <label>Kliendid</label>
                  <button ref={addFormBtn} className={s.btn} style={{ height: 29, width: '100%', justifyContent: 'center' }} onClick={(e) => { e.stopPropagation(); if (cmenu) setCmenu(null); else openClientMenu('form'); }}>
                    + Lisa klient <kbd className={s.kbd}>⌘K</kbd>
                  </button>
                </div>
                <div className={s.fld}>
                  <label>Valuuta</label>
                  <select className={s.inp} value={hdr.currency} onChange={(e) => setH({ currency: e.target.value })}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select>
                </div>
                <div className={s.fld}>
                  <label>Arve number</label>
                  <div className={s.ser} title="Number määratakse arve kinnitamisel"><span className={s.pre}>Seeria</span><span className={s.val}>auto</span></div>
                </div>
                <div className={`${s.fld} ${s.wide}`}>
                  <label>Kirjeldus <span className={s.lblR}>nimekirjas</span></label>
                  <input className={s.inp} value={hdr.description} onChange={(e) => setH({ description: e.target.value })} placeholder="Näiteks Tarkvara ja serverid" />
                </div>

                <div className={`${s.fld} ${s.mid} ${s.rec}`}>
                  <label>Sagedus</label>
                  <span className={`${s.chips} ${s.mwrap}`}>
                    {[1, 3, 12].map((m) => (
                      <button key={m} className={`${s.chip} ${hdr.months === m ? s.chipOn : ''}`} onClick={() => setH({ months: m })}>{m === 1 ? 'Kuu' : m === 3 ? 'Kvartal' : 'Aasta'}</button>
                    ))}
                    <button className={`${s.chip} ${[1, 3, 12].includes(hdr.months) ? '' : s.chipOn}`} onClick={(e) => { e.stopPropagation(); setMenu(menu === 'freq' ? null : 'freq'); }}>
                      {[1, 3, 12].includes(hdr.months) ? '···' : freq.s}
                    </button>
                    {menu === 'freq' && (
                      <div className={`${s.menu} ${s.menuL}`} onClick={(e) => e.stopPropagation()}>
                        <div className={s.mh}>Sagedus</div>
                        {FREQ.map((f) => (
                          <button key={f.m} className={`${s.mrow} ${f.m === hdr.months ? s.mrowOn : ''}`} onClick={() => { setH({ months: f.m }); setMenu(null); }}>
                            {f.l}<span className={s.mrowD}>{f.m} k</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </span>
                </div>
                <div className={`${s.fld} ${s.rec}`}>
                  <label>Väljastamise päev</label>
                  <select className={s.inp} value={hdr.day} onChange={(e) => setH({ day: Number(e.target.value) })}>
                    {Array.from({ length: 28 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}. kuupäev</option>)}
                    <option value={31}>Kuu viimane päev</option>
                  </select>
                </div>
                <div className={`${s.fld} ${s.rec}`}>
                  <label>{id ? 'Järgmine arve' : 'Alates'}</label>
                  <input className={`${s.inp} ${s.mono} ${startIso ? '' : s.inpErr}`} value={hdr.start} onChange={(e) => setH({ start: e.target.value })} placeholder="pp.kk.aaaa" />
                </div>
                <div className={`${s.fld} ${s.rec}`}>
                  <label>Kuni <span className={s.lblR}>valikuline</span></label>
                  <input className={`${s.inp} ${s.mono} ${hdr.end.trim() && !endIso ? s.inpErr : ''}`} value={hdr.end} onChange={(e) => setH({ end: e.target.value })} placeholder="tähtajatu" />
                </div>
                <div className={s.fld}>
                  <label>Maksetingimus</label>
                  <span className={s.chips}>
                    {TERMS.map((t) => <button key={t} className={`${s.chip} ${hdr.term === t ? s.chipOn : ''}`} onClick={() => setH({ term: t })}>{t}p</button>)}
                  </span>
                </div>

                <div className={`${s.fld} ${s.mid} ${s.rec}`}>
                  <label>Edastamine</label>
                  <div className={s.seg}>
                    <button className={hdr.delivery === 'auto' ? s.segOn : ''} onClick={() => setH({ delivery: 'auto' })}>Saada automaatselt</button>
                    <button className={hdr.delivery === 'review' ? s.segOn : ''} onClick={() => setH({ delivery: 'review' })}>Ülevaatusele</button>
                  </div>
                </div>
                <div className={`${s.fld} ${s.rec}`}>
                  <label>Arveldusperiood</label>
                  <select className={s.inp} value={hdr.offset} onChange={(e) => setH({ offset: Number(e.target.value) })}>
                    {PERIODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
                <div className={`${s.fld} ${s.wide}`}>
                  <label>Märkused <span className={s.lblR}>nähtav arvel</span></label>
                  <input className={s.inp} value={hdr.note} onChange={(e) => setH({ note: e.target.value })} placeholder="Näiteks „Arve perioodi {periood} eest”" />
                </div>
                <div className={s.fld}>
                  <label>KM kood</label>
                  <select className={s.inp} value={hdr.vatc} onChange={(e) => setH({ vatc: e.target.value })}>{VAT_CODES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select>
                </div>
                <div className={`${s.fld} ${s.mid}`}>
                  <label>Koostaja</label>
                  <select className={s.inp} value={hdr.authorId} onChange={(e) => setH({ authorId: e.target.value })}>
                    {!members.some((m) => m.user.id === hdr.authorId) && <option value={hdr.authorId}>{authorName}</option>}
                    {members.map((m) => <option key={m.user.id} value={m.user.id}>{m.user.name || m.user.email}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className={`${s.sec} ${s.linesec}`}>
              <div className={s.tabs}>
                <button className={`${s.tab} ${tab === 'lines' ? s.tabOn : ''}`} onClick={() => setTab('lines')}>Tooted <span className={s.n}>{lines.length}</span></button>
                <button className={`${s.tab} ${tab === 'cli' ? s.tabOn : ''}`} onClick={() => setTab('cli')}>Kliendid <span className={s.n}>{clients.length}</span></button>
                <span className={s.tabHint}>
                  {tab === 'lines' ? 'Samad read lähevad igale kliendile' : `${activeClients.length} aktiivset · järgmine arve ${nextRunIso ? isoToEt(nextRunIso) : '—'}`}
                </span>
              </div>

              {tab === 'lines' ? (
                <div className={s.tp}>
                  <div className={s.lines}>
                    <div className={s.lh}>{lhead.map(([l, r], i) => <div key={i} className={r ? s.lhR : ''}>{l}</div>)}</div>
                    <div className={s.rows}>
                      {!lines.length && <div className={s.empty}>Ridu pole — lisa esimene rida</div>}
                      {lines.map((l, i) => {
                        const q = l.description.trim().toLowerCase();
                        const prodMatches = productRow === i
                          ? products.filter((p) => p.is_active && (!q || p.name.toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q))).slice(0, 12)
                          : [];
                        return (
                          <div key={l.key} className={`${s.lr} ${l.variable ? s.vq : ''}`}>
                            <div className={s.ix}>{i + 1}</div>
                            <div><input className={s.in} value={l.code} placeholder="Kood" onChange={(e) => updateLine(i, { code: e.target.value })} /></div>
                            <div className={s.pwrap}>
                              <input
                                ref={(el) => { if (el) descRefs.current.set(l.key, el); else descRefs.current.delete(l.key); }}
                                className={`${s.in} ${l.description.trim() ? '' : s.miss}`}
                                value={l.description}
                                placeholder="Kirjeldus või toode"
                                onChange={(e) => { updateLine(i, { description: e.target.value }); setProductRow(i); }}
                                onFocus={() => setProductRow(i)}
                                onBlur={() => setTimeout(() => setProductRow((r) => (r === i ? null : r)), 120)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') { e.preventDefault(); if (prodMatches.length && productRow === i) applyProduct(i, prodMatches[0]); else if (i === lines.length - 1) addLine(); else descRefs.current.get(lines[i + 1].key)?.focus(); }
                                }}
                              />
                              {prodMatches.length > 0 && (
                                <div className={s.pdrop}>
                                  {prodMatches.map((p) => (
                                    <button key={p.id} type="button" className={s.pitem} onMouseDown={(e) => { e.preventDefault(); applyProduct(i, p); }}>
                                      <span>{p.name}{p.code ? ` · ${p.code}` : ''}</span><span className={s.mono}>{p.unit_price != null ? fmtNum(Number(p.unit_price)) : ''}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div>
                              <select className={`${s.in} ${s.inSel} ${l.account_id ? '' : s.miss}`} value={l.account_id} onChange={(e) => updateLine(i, { account_id: e.target.value })}>
                                <option value="">—</option>
                                {revenueAccounts.map((a) => <option key={a.id} value={a.id} title={a.name}>{a.code}</option>)}
                              </select>
                            </div>
                            <div className={s.qc}>
                              {l.variable
                                ? <span className={s.vqtag} title="Kogus sisestatakse igal perioodil enne arve väljastamist">iga kord</span>
                                : <input className={`${s.in} ${s.inR}`} value={l.quantity} onChange={(e) => updateLine(i, { quantity: e.target.value })} />}
                              <button className={`${s.vqb} ${l.variable ? s.vqbOn : ''}`} title={l.variable ? 'Muuda püsivaks koguseks' : 'Kogus sisestatakse iga kord (tunnid, tükid)'} onClick={() => toggleVariable(i)}>±</button>
                            </div>
                            <div>
                              <select className={`${s.in} ${s.inSel}`} value={l.unit} onChange={(e) => updateLine(i, { unit: e.target.value })}>
                                {[...new Set([...UNITS, l.unit].filter(Boolean))].map((u) => <option key={u}>{u}</option>)}
                              </select>
                            </div>
                            <div><input className={`${s.in} ${s.inR} ${s.mono}`} value={l.unit_price} onChange={(e) => updateLine(i, { unit_price: e.target.value })} onBlur={() => updateLine(i, { unit_price: fmtNum(pn(l.unit_price)) })} /></div>
                            <div><input className={`${s.in} ${s.inR}`} value={l.discount} onChange={(e) => updateLine(i, { discount: e.target.value })} /></div>
                            <div className={s.rate}>{vat.rate}%</div>
                            <div className={s.lsum}>{l.variable ? <span className={s.lsumVar}>muutuv</span> : num(netOf(l))}</div>
                            <div className={s.ra}>
                              <button className={s.iconbtn} title="Kopeeri rida" onClick={() => { setLines((ls) => [...ls.slice(0, i + 1), { ...l, key: nextKey(), id: undefined }, ...ls.slice(i + 1)]); setDirty(true); }}>⧉</button>
                              <button className={`${s.iconbtn} ${s.del}`} title="Kustuta rida" onClick={() => { setLines((ls) => ls.filter((_, j) => j !== i)); setDirty(true); }}>✕</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className={s.addrow}>
                      <button className={`${s.btn} ${s.sm} ${s.ghost}`} onClick={addLine}>+ Lisa rida</button>
                      <span className={s.hint}>
                        Kirjelduses <code onClick={() => insertPlaceholder('{periood}')}>{'{periood}'}</code> <code onClick={() => insertPlaceholder('{kuu}')}>{'{kuu}'}</code> asendatakse genereerimisel
                      </span>
                    </div>
                    <div className={s.ltot}>
                      <div className={`${s.lcount} ${s.mono}`}>{lines.length} rida · ühe kliendi arve</div>
                      <div className={s.ltotCells}>
                        <div className={s.cell}><div className={s.cellK}>Neto</div><div className={s.cellV}>{eur(totals.net)}</div></div>
                        <div className={s.cell}><div className={s.cellK}>KM {vat.rate}%</div><div className={s.cellV}>{eur(totals.vat)}</div></div>
                        <div className={`${s.cell} ${s.cellBig}`}><div className={s.cellK}>Arve kokku</div><div className={s.cellV}>{eur(totals.tot)}</div></div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={s.tp}>
                  <div className={s.ct}>
                    <div className={s.ch}><div /><div>Klient</div><div>Saaja</div><div>Kanal</div><div>Järgmine</div><div className={s.lhR}>Summa</div><div /></div>
                    <div className={s.crows}>
                      {!clients.length && <div className={s.empty}>Kliente pole — lisa esimene klient</div>}
                      {clients.map((c, i) => (
                        <div key={c.key} className={`${s.cr} ${c.active ? '' : s.crPaused}`}>
                          <div className={s.ix}>{i + 1}</div>
                          <div className={s.cnm}><span className={s.av}>{initials(c.name)}</span><div><b>{c.name}</b><span className={`${s.rg} ${s.mono}`}>{c.reg}</span></div></div>
                          <div>
                            <input
                              className={`${s.in} ${c.channel === 'email' && !c.email.includes('@') ? s.miss : ''}`}
                              value={c.channel === 'einvoice' ? c.einvoiceIban || '' : c.email}
                              disabled={c.channel === 'einvoice'}
                              title={c.channel === 'einvoice' ? 'E-arve saadetakse kliendikaardil olevale IBAN-ile' : undefined}
                              placeholder={c.channel === 'einvoice' ? 'IBAN puudub kliendikaardil' : 'e-post'}
                              onChange={(e) => updateClient(i, { email: e.target.value })}
                            />
                          </div>
                          <div>
                            <select className={`${s.in} ${s.inSel}`} value={c.channel} onChange={(e) => updateClient(i, { channel: e.target.value as ClientChannel })}>
                              {CHANNELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                            </select>
                          </div>
                          <div className={`${s.cnx} ${s.mono}`}>{c.active && nextRunIso ? isoToEt(nextRunIso) : '—'}</div>
                          <div className={s.csumc}>{variableCount ? `${num(totals.tot)} +` : num(totals.tot)}</div>
                          <div className={s.cra}>
                            <button className={`${s.stog} ${c.active ? '' : s.stogOff}`} title={c.active ? 'Peata see klient' : 'Aktiveeri'} onClick={() => updateClient(i, { active: !c.active })}>
                              <span className={s.dot} />{c.active ? 'Aktiivne' : 'Peatatud'}
                            </button>
                            <button className={`${s.iconbtn} ${s.del}`} title="Eemalda mallilt" onClick={() => { setClients((cs) => cs.filter((_, j) => j !== i)); setDirty(true); showToast.info(`${c.name} eemaldatud mallilt`); }}>✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className={s.cadd}>
                      <button ref={addTabBtn} className={`${s.btn} ${s.sm} ${s.ghost}`} onClick={(e) => { e.stopPropagation(); if (cmenu) setCmenu(null); else openClientMenu('tab'); }}>+ Lisa klient</button>
                      <span className={s.hint}><kbd className={s.kbd}>⌘K</kbd> lisa klient</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className={s.footbar}>
            <div className={s.footHint}>
              <span><kbd className={s.kbd}>⌘S</kbd> salvesta</span>
              <span><kbd className={s.kbd}>⌘K</kbd> lisa klient</span>
              <span><kbd className={s.kbd}>Esc</kbd> loobu</span>
            </div>
            <div className={s.footR}>
              {variableCount > 0 && id && <Link className={`${s.btn} ${s.sm}`} href={quantitiesHref}>Sisesta kogused</Link>}
              <button className={`${s.btn} ${s.sm} ${s.ghost}`} disabled={saving || !clients.length} onClick={generateNow}>Genereeri kohe</button>
              <button className={`${s.btn} ${s.sm} ${s.ghost}`} onClick={() => { setH({ active: !hdr.active }); showToast.info(hdr.active ? 'Mall peatatud — salvesta, et arveid ei genereeritaks' : 'Mall jätkub — salvesta muudatus'); }}>
                {hdr.active ? 'Peata mall' : 'Jätka malli'}
              </button>
              <button className={`${s.btn} ${s.sm} ${s.ghost} ${s.danger}`} onClick={() => setConfirm('delete')}>Kustuta mall</button>
            </div>
          </div>
        </div>

        <div className={`${s.gutter} ${dragging ? s.gutterOn : ''}`} title="Lohista paneeli laiust · topeltklikk lähtestab" onMouseDown={startDrag} onDoubleClick={() => { setPw(DEFAULT_PW); localStorage.setItem(KEYS.pw, String(DEFAULT_PW)); }} />

        <div className={s.right}>
          <div className={s.sec}>
            <div className={s.sech}>Kokkuvõte<span className={s.sechR}><button className={s.iconbtn} onClick={() => toggleRail(false)} title="Peida paneel">✕</button></span></div>
            <div className={`${s.big} ${s.mono}`}>{eur(runTotal)}<small> / {freq.s}</small></div>
            <div className={s.bigSub}>{activeClients.length} aktiivset klienti × {eur(totals.tot)}{variableCount ? ' + muutuv osa' : ''}</div>
            <div className={s.kv}><span>Neto arve kohta</span><b>{eur(totals.net)}</b></div>
            <div className={s.kv}><span>Käibemaks {vat.rate}%</span><b>{eur(totals.vat)}</b></div>
            <div className={s.kv}><span>Arve kokku</span><b>{eur(totals.tot)}</b></div>
            <div className={`${s.kv} ${s.tot}`}><span>Korduvtulu (neto) / kuu</span><b>{eur(mrr)}</b></div>
          </div>

          <div className={s.sec}>
            <div className={s.sech}>Perioodilisus</div>
            {([
              ['Sagedus', freq.l, ''],
              ['Väljastamine', dayLabel, ''],
              ['Arveldusperiood', PERIODS.find(([v]) => v === hdr.offset)?.[1] || '', ''],
              [id ? 'Järgmine arve' : 'Alates', hdr.start || '—', s.mono],
              ['Kuni', hdr.end || 'tähtajatu', hdr.end ? s.mono : ''],
              ['Maksetähtaeg', `+${hdr.term} päeva`, ''],
              ['Edastamine', delivText, variableCount ? s.warnc : hdr.delivery === 'auto' ? s.pos : ''],
            ] as Array<[string, string, string]>).map(([k, v, c]) => (
              <div key={k} className={s.kv}><span>{k}</span><b className={c}>{v}</b></div>
            ))}
          </div>

          <div className={s.sec}>
            <div className={s.sech}>Tulevased jooksud<span className={s.sechR}>{hdr.active ? `${activeClients.length} arvet jooksu kohta${variableCount ? ' · ootavad kogust' : ''}` : 'mall peatatud'}</span></div>
            {variableCount > 0 && id && (pendingCount > 0 || upcoming.length > 0) && (
              <div className={s.qban}>
                <span><b>{pendingCount || activeClients.length}</b> arvet ootab kogust · {isoToEt(pendingFirst?.run_date || upcoming[0])}</span>
                <Link className={`${s.btn} ${s.sm}`} href={quantitiesHref}>Sisesta kogused</Link>
              </div>
            )}
            {upcoming.length ? upcoming.map((d, i) => {
              const p = periodFor(schedule, d);
              return (
                <div key={d} className={`${s.run} ${i === 0 && hdr.active ? s.runNext : ''}`}>
                  <span className={s.bul} />
                  <span className={`${s.runD} ${s.mono}`}>{isoToEt(d)}</span>
                  <span className={`${s.runP} ${s.mono}`}>{isoToEt(p.from).slice(0, 5)}–{isoToEt(p.to)} · tähtaeg {isoToEt(addDaysIso(d, hdr.term)).slice(0, 5)}</span>
                  <span className={s.runA}>{num(runTotal)}</span>
                </div>
              );
            }) : <div className={s.none}>Tulevasi jookse pole</div>}
          </div>

          <div className={s.sec}>
            <div className={s.sech}>Kontroll</div>
            {checks.map((c, i) => (
              <div key={i} className={`${s.chk} ${c.s === 'warn' ? s.chkWarn : c.s === 'err' ? s.chkErr : ''}`}>
                <span className={s.m}>{c.s === 'ok' ? '✓' : '!'}</span><span>{c.t}</span>
              </div>
            ))}
          </div>

          <div className={s.sec} style={{ borderBottom: 'none' }}>
            <div className={s.sech}>Genereeritud<span className={s.sechR}>{loaded?.invoices_generated ?? 0}</span></div>
            {(loaded?.recent_runs || []).length ? (loaded?.recent_runs || []).map((run) => <GenRow key={run.id} run={run} clientName={loaded?.clients?.find((c) => c.partner_id === run.partner_id)?.partner?.name || ''} />)
              : <div className={s.none}>Arveid pole veel loodud</div>}
          </div>
        </div>
      </div>

      {cmenu && (
        <div className={s.cmenu} style={cmenu.style} onClick={(e) => e.stopPropagation()}>
          <input
            ref={csearchRef}
            className={s.inp}
            value={csearch}
            onChange={(e) => setCsearch(e.target.value)}
            placeholder="Otsi nime või registrikoodi"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && clientMatches[0]) addClient(clientMatches[0]);
              if (e.key === 'Escape') { e.stopPropagation(); setCmenu(null); }
            }}
          />
          {clientMatches.length ? clientMatches.map((p) => (
            <button key={p.id} className={s.mrow} onClick={() => addClient(p)}>
              <span>{p.name}<span className={`${s.msub} ${s.mono}`}>{p.reg_code || '—'} · {p.einvoice_iban ? 'E-arve' : 'E-post'}</span></span>
              <span className={s.mrowD}>Lisa</span>
            </button>
          )) : <div className={s.mrow} style={{ color: 'var(--a-text-3)' }}>{partners.length ? 'Kliente ei leitud' : 'Kliente pole'}</div>}
        </div>
      )}

      <ConfirmDialog
        open={confirm === 'delete'}
        onOpenChange={(v) => !v && setConfirm(null)}
        title="Kustuta mall?"
        description="Mall kustutatakse. Juba loodud arved jäävad alles."
        confirmLabel="Kustuta"
        variant="danger"
        onConfirm={remove}
      />
      <ConfirmDialog
        open={confirm === 'leave'}
        onOpenChange={(v) => !v && setConfirm(null)}
        title="Loobu muudatustest?"
        description="Salvestamata muudatused lähevad kaotsi."
        confirmLabel="Loobu"
        variant="warning"
        onConfirm={() => router.push('/invoices/recurring')}
      />
    </div>
  );
}

function GenRow({ run, clientName }: { run: TemplateRun; clientName: string }) {
  const failed = run.status === 'failed' || run.delivery_status === 'failed';
  const label = failed ? 'Ebaõnnestus' : run.status === 'pending' ? 'Töös' : run.delivery_status === 'sent' ? 'Saadetud' : run.delivery_status === 'confirmed' ? 'Kinnitatud' : 'Mustand';
  const cls = failed ? s.genBad : run.delivery_status === 'sent' || run.delivery_status === 'confirmed' ? s.genGood : '';
  const body = (
    <Fragment>
      <div style={{ minWidth: 0 }}>
        <span className={s.mono}>{isoToEt(run.period_start)} → {isoToEt(run.period_end)}</span>
        <div className={s.genSub} title={run.error || run.delivery_error || undefined}>{clientName}{run.error || run.delivery_error ? ` · ${run.error || run.delivery_error}` : ''}</div>
      </div>
      <span className={`${s.genSt} ${cls}`}><i />{label}</span>
    </Fragment>
  );
  return run.invoice_id
    ? <Link className={s.gen} href={`/invoices/${run.invoice_id}/edit`}>{body}</Link>
    : <div className={s.gen}>{body}</div>;
}
