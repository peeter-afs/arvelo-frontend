'use client';

/**
 * "Uus maksepakett" — pick the purchase invoices to pay (plus optional manual lines) in one
 * modal. Payee, IBAN and reference come from the invoices via the prefill endpoint, which runs
 * in the background; there is no separate "fill lines" step. Also used to rebuild a draft
 * ("Muuda ridu") or a batch the bank rejected ("Paranda ja koosta uuesti"): the new batch is
 * created first and the old one voided after.
 */

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Loader2, Plus, Send, X } from 'lucide-react';
import { getErrorMessage } from '@/lib/api/client';
import type { AccountOption } from '@/lib/api/accounting.api';
import { bankingApi, type BankAccountRecord, type PaymentBatchLine, type PaymentBatchListItem, type PaymentBatchPrefillLine } from '@/lib/api/banking.api';
import type { InvoiceListItem } from '@/lib/api/invoices.api';
import { showToast } from '@/components/ui/Toast';
import styles from './Payments.module.css';
import { DAY, amount, dateText, daysBetween, ibanShort, isoDate, money, parseAmount, startOfDay } from './shared';

type OpenLine = { batch: PaymentBatchListItem; line: PaymentBatchLine };
type ManualLine = { payee: string; iban: string; account: string; amount: string };
export type BatchSeed = { batch: PaymentBatchListItem; lines: PaymentBatchLine[]; mode: 'edit' | 'redo' };

const STATUS: Record<string, string> = { approved: 'Kinnitatud', confirmed: 'Kinnitatud', payable: 'Maksmisele', partially_paid: 'Osaliselt tasutud', overdue: 'Üle tähtaja' };
const openOf = (inv: InvoiceListItem) => Number(inv.open_amount ?? Number(inv.total || 0) - Number(inv.paid_amount || 0));
function isoWeek(d: Date) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  return Math.ceil(((t.getTime() - Date.UTC(t.getUTCFullYear(), 0, 1)) / DAY + 1) / 7);
}

export function NewPaymentBatchModal({ invoices, openLines, bankAccounts, accounts, seed, onClose, onCreated }: {
  invoices: InvoiceListItem[]; openLines: OpenLine[]; bankAccounts: BankAccountRecord[]; accounts: AccountOption[];
  seed?: BatchSeed | null; onClose: () => void; onCreated: (batchId: string) => void | Promise<void>;
}) {
  const today = startOfDay(new Date());
  const tomorrow = isoDate(new Date(today.getTime() + DAY));
  const [bankId, setBankId] = useState(seed?.batch.bank_account_id || bankAccounts[0]?.id || '');
  const [name, setName] = useState(seed?.batch.batch_name || `Ostuarved nädal ${isoWeek(today)}`);
  const [execDate, setExecDate] = useState(seed?.batch.execution_date && seed.batch.execution_date >= isoDate(today) ? seed.batch.execution_date.slice(0, 10) : tomorrow);
  const [prefill, setPrefill] = useState<Map<string, PaymentBatchPrefillLine> | null>(null);
  const [noIban, setNoIban] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [manual, setManual] = useState<ManualLine[]>(() => (seed?.lines || []).filter((l) => !l.invoice_id).map((l) => ({ payee: l.payee_name, iban: l.payee_iban, account: l.counterpart_account_id || '', amount: amount(l.amount).replace(/\s/g, '') })));
  const [saving, setSaving] = useState<'draft' | 'send' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Same rules as the prefill endpoint: approved/payable/partially paid, posted, with an open amount.
  const rows = useMemo(() => invoices
    .filter((inv) => inv.type === 'purchase_invoice' && ['approved', 'payable', 'partially_paid'].includes(inv.status) && !!inv.journal_entry_id && openOf(inv) > 0.004)
    .sort((a, b) => +new Date(a.due_date || a.invoice_date) - +new Date(b.due_date || b.invoice_date)), [invoices]);
  const blockedBy = useMemo(() => {
    const map = new Map<string, string>();
    openLines.forEach(({ batch, line }) => { if (line.invoice_id && batch.id !== seed?.batch.id && !map.has(line.invoice_id)) map.set(line.invoice_id, batch.batch_name || 'Maksepakett'); });
    return map;
  }, [openLines, seed]);
  const flagged = useMemo(() => new Set((seed?.mode === 'redo' ? seed.lines : []).filter((l) => l.status === 'failed' && l.invoice_id).map((l) => l.invoice_id as string)), [seed]);
  const ibanOf = (id: string) => (noIban.has(id) ? '' : prefill?.get(id)?.payee_iban || '');
  const eligible = (inv: InvoiceListItem) => !blockedBy.has(inv.id) && !!ibanOf(inv.id);

  // Payee, IBAN and reference for every candidate, once; this also decides the preselection.
  useEffect(() => {
    if (!rows.length) { setPrefill(new Map()); return; }
    let live = true;
    // The endpoint takes at most 100 invoices per call.
    const ids = rows.map((r) => r.id);
    const chunks = Array.from({ length: Math.ceil(ids.length / 100) }, (_, i) => ids.slice(i * 100, i * 100 + 100));
    Promise.all(chunks.map((invoice_ids) => bankingApi.getPaymentBatchPrefillLines({ invoice_ids })))
      .then((parts) => ({ lines: parts.flatMap((p) => p.lines), missing_supplier_bank_account_invoice_ids: parts.flatMap((p) => p.missing_supplier_bank_account_invoice_ids || []) }))
      .then((res) => {
        if (!live) return;
        const map = new Map(res.lines.filter((l) => l.invoice_id).map((l) => [l.invoice_id as string, l]));
        const missing = new Set(res.missing_supplier_bank_account_invoice_ids || []);
        setPrefill(map); setNoIban(missing);
        const ok = (inv: InvoiceListItem) => !blockedBy.has(inv.id) && !missing.has(inv.id) && !!map.get(inv.id)?.payee_iban;
        const soon = new Date(today.getTime() + 7 * DAY);
        setSelected(new Set(seed
          ? seed.lines.map((l) => l.invoice_id).filter((id): id is string => !!id && rows.some((r) => r.id === id && ok(r)))
          : rows.filter((r) => ok(r) && new Date(r.due_date || r.invoice_date) <= soon).map((r) => r.id)));
      })
      .catch((e) => { if (live) { setPrefill(new Map()); setError(getErrorMessage(e)); } });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per candidate list
  }, [rows]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape' && !saving) onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose, saving]);

  const chosen = rows.filter((r) => selected.has(r.id));
  const total = chosen.reduce((n, r) => n + openOf(r), 0) + manual.reduce((n, m) => n + parseAmount(m.amount), 0);
  const noRef = chosen.filter((r) => !prefill?.get(r.id)?.reference).length;
  const allEligible = rows.filter(eligible);
  const toggle = (inv: InvoiceListItem) => { if (!eligible(inv)) return; setSelected((s) => { const n = new Set(s); if (n.has(inv.id)) n.delete(inv.id); else n.add(inv.id); return n; }); };
  const setMan = (i: number, patch: Partial<ManualLine>) => setManual((m) => m.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const accountOptions = useMemo(() => accounts.filter((a) => a.is_active).sort((a, b) => a.code.localeCompare(b.code)), [accounts]);

  const create = async (send: boolean) => {
    setError(null);
    const bad = manual.findIndex((m) => !m.payee.trim() || !m.iban.trim() || !m.account || !(parseAmount(m.amount) > 0));
    if (bad >= 0) { setError(`Käsirida ${bad + 1}: täida saaja, IBAN, vastaskonto ja summa.`); return; }
    if (!bankId) { setError('Vali pangakonto.'); return; }
    setSaving(send ? 'send' : 'draft');
    try {
      const result = await bankingApi.createPaymentBatch({
        bank_account_id: bankId, batch_name: name.trim() || undefined, execution_date: execDate || undefined, currency: 'EUR',
        lines: [
          ...chosen.map((inv) => { const p = prefill?.get(inv.id); return { invoice_id: inv.id, amount: openOf(inv), payee_name: p?.payee_name || undefined, payee_iban: p?.payee_iban || undefined, payee_bic: p?.payee_bic || undefined, reference: p?.reference || undefined, description: p?.description || undefined }; }),
          ...manual.map((m) => ({ invoice_id: null, amount: parseAmount(m.amount), payee_name: m.payee.trim(), payee_iban: m.iban.replace(/\s+/g, '').toUpperCase(), counterpart_account_id: m.account })),
        ],
      });
      const id = result.batch.id;
      if (seed) await bankingApi.voidPaymentBatch(seed.batch.id, { reason: `Asendatud paketiga „${result.batch.batch_name || name}“` }).catch(() => {});
      if (send) {
        try {
          const sent = await bankingApi.submitPaymentBatchToBank(id);
          showToast.success(`Pakett saadeti panka (${sent.provider === 'lhv_connect' ? 'LHV Connect' : 'Swedbank Gateway'})`);
        } catch (e) {
          showToast.error(`Pakett loodi, kuid panka saatmine ebaõnnestus: ${getErrorMessage(e)}`);
        }
      } else {
        showToast.success('Mustand salvestatud');
      }
      await onCreated(id);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSaving(null);
    }
  };

  const nothing = !chosen.length && !manual.length;
  return (
    <div className={styles.modal} onPointerDown={(e) => { if (e.target === e.currentTarget && !saving) onClose(); }}>
      <div className={styles.mbox}>
        <div className={styles.mhead}>
          <div><h3>{seed ? (seed.mode === 'redo' ? 'Paranda ja koosta uuesti' : 'Muuda paketi ridu') : 'Uus maksepakett'}</h3><div className={styles.line}>{seed ? `Luuakse uus pakett ja „${seed.batch.batch_name || 'Maksepakett'}“ tühistatakse.` : 'Vali makstavad ostuarved. Summad, saaja ja viitenumber tulevad arvelt.'}</div></div>
          <button className={`${styles.btn} ${styles.ghost}`} onClick={onClose} disabled={!!saving}><X size={14} /></button>
        </div>
        <div className={styles.mfields}>
          <label className={styles.flbl}>Pangakonto<select className={styles.inp} value={bankId} onChange={(e) => setBankId(e.target.value)}>{bankAccounts.length === 0 && <option value="">Pangakonto puudub (Seaded → Pangakontod)</option>}{bankAccounts.map((b) => <option key={b.id} value={b.id}>{b.name}{b.iban ? ` · ${ibanShort(b.iban)}` : ''}</option>)}</select></label>
          <label className={styles.flbl}>Nimi<input className={styles.inp} value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className={styles.flbl}>Täitmise kuupäev<input type="date" className={`${styles.inp} ${styles.mono}`} value={execDate} min={isoDate(today)} onChange={(e) => setExecDate(e.target.value)} /></label>
        </div>
        <div className={styles.mbody}>
          <div className={styles.pbh}>
            <div><input type="checkbox" className={styles.check} checked={allEligible.length > 0 && allEligible.every((r) => selected.has(r.id))} onChange={(e) => setSelected(e.target.checked ? new Set(allEligible.map((r) => r.id)) : new Set())} disabled={!prefill} aria-label="Vali kõik" /></div>
            <div>Saaja · arve</div><div>IBAN</div><div>Tähtaeg</div><div>Viide</div><div className={styles.r}>Tasumata</div>
          </div>
          {prefill === null ? <div className={styles.empty}><Loader2 size={18} className="animate-spin" /></div>
            : rows.length === 0 ? <div className={styles.empty}>Maksmist ootavaid ostuarveid pole. Lisa vajadusel käsirida.</div>
            : rows.map((inv) => {
              const p = prefill.get(inv.id); const iban = ibanOf(inv.id); const blocked = blockedBy.get(inv.id); const off = !eligible(inv); const on = selected.has(inv.id);
              const od = inv.due_date ? daysBetween(today, inv.due_date) : 0;
              return (
                <div key={inv.id} className={`${styles.pbr} ${on ? styles.pbrOn : ''} ${off ? styles.pbrOff : ''} ${flagged.has(inv.id) ? styles.pbrFlag : ''}`} onClick={() => toggle(inv)}>
                  <div><input type="checkbox" className={styles.check} checked={on} disabled={off} onChange={() => toggle(inv)} onClick={(e) => e.stopPropagation()} /></div>
                  <div>{p?.payee_name || inv.partner_name || 'Tundmatu tarnija'}<span className={styles.s}><span className={styles.mono}>{inv.invoice_number}</span> · {STATUS[inv.status] || inv.status}{blocked ? ` · juba paketis „${blocked}“` : ''}{flagged.has(inv.id) ? ' · pank lükkas selle rea tagasi' : ''}</span></div>
                  <div className={styles.mono}>{iban ? ibanShort(iban) : <span className={styles.wf}>IBAN puudub</span>}</div>
                  <div className={`${styles.mono} ${od > 0 ? styles.late : ''}`}>{dateText(inv.due_date)}{od > 0 && <span style={{ fontWeight: 500 }}> +{od} p</span>}</div>
                  <div>{p?.reference ? <span className={styles.okc}><Check size={13} /></span> : <span className={styles.wf}>puudub</span>}</div>
                  <div className={`${styles.r} ${styles.mono}`} style={{ fontWeight: 600 }}>{amount(openOf(inv))}</div>
                </div>
              );
            })}
          {manual.map((m, i) => (
            <div key={i} className={`${styles.pbr} ${styles.pbrMan}`}>
              <div />
              <div><input className={styles.inp} value={m.payee} onChange={(e) => setMan(i, { payee: e.target.value })} placeholder="Saaja nimi" /></div>
              <div><input className={`${styles.inp} ${styles.mono}`} value={m.iban} onChange={(e) => setMan(i, { iban: e.target.value })} placeholder="IBAN" /></div>
              <div>
                <select className={styles.inp} value={m.account} onChange={(e) => setMan(i, { account: e.target.value })} title="Vastaskonto">
                  <option value="">Vastaskonto…</option>
                  {accountOptions.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}
                </select>
              </div>
              <div><button className={`${styles.btn} ${styles.sm} ${styles.ghost}`} title="Eemalda" onClick={() => setManual((all) => all.filter((_, j) => j !== i))}><X size={13} /></button></div>
              <div><input className={`${styles.inp} ${styles.inpR}`} value={m.amount} onChange={(e) => setMan(i, { amount: e.target.value })} placeholder="0,00" inputMode="decimal" /></div>
            </div>
          ))}
          <div style={{ padding: '8px 14px' }}><button className={`${styles.btn} ${styles.sm} ${styles.ghost}`} onClick={() => setManual((m) => [...m, { payee: '', iban: '', account: '', amount: '' }])}><Plus size={13} />Lisa käsirida (maks, palk, rent)</button></div>
          {error && <div className={`${styles.note} ${styles.noteBad}`} style={{ margin: '0 14px 12px' }}><AlertTriangle size={12} /><span>{error}</span></div>}
        </div>
        <div className={styles.mfootbar}>
          <span className={styles.sum}>Valitud <b>{chosen.length + manual.length}</b> · <b className={styles.mono}>{money(total)}</b></span>
          {noRef > 0 && <span className={`${styles.sum} ${styles.warnText}`}><AlertTriangle size={12} />{noRef} ilma viitenumbrita – kasutatakse selgitust</span>}
          <div className={styles.mfootR}>
            <button className={styles.btn} onClick={onClose} disabled={!!saving}>Loobu</button>
            <button className={styles.btn} disabled={nothing || !!saving} onClick={() => void create(false)}>{saving === 'draft' && <Loader2 size={13} className="animate-spin" />}Salvesta mustandina</button>
            <button className={`${styles.btn} ${styles.primary}`} disabled={nothing || !!saving} onClick={() => void create(true)}>{saving === 'send' ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}Loo ja saada panka</button>
          </div>
        </div>
      </div>
    </div>
  );
}
