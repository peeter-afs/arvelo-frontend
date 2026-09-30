'use client';

import { useEffect, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

/**
 * "Jaga kontodele" in the purchase invoice editor: splits one line's net amount (or a typed
 * amount when there are no lines yet) across several expense accounts by share or by amount.
 * The last part absorbs the rounding so the parts always add up to the original.
 */

export type SplitSourceLine = { key: number; description: string; account_id: string; net: number };
export type SplitAccount = { id: string; code: string; name: string; group?: string };
export type SplitPart = { account_id: string; amount: number };

type Mode = 'pct' | 'eur';
type Row = { account_id: string; value: string };

const r2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: string) => { const n = parseFloat(v.replace(/\s/g, '').replace(',', '.')); return Number.isFinite(n) ? n : 0; };
const fmt = (n: number) => n.toLocaleString('et-EE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (n: number) => String(r2(n)).replace('.', ',');

/** Amounts for each row; in % mode the last row gets whatever rounding left over. */
export function splitAmounts(total: number, mode: Mode, values: number[]): number[] {
  if (mode === 'eur') return values.map(r2);
  const out = values.map((p) => r2((total * p) / 100));
  if (out.length) out[out.length - 1] = r2(total - out.slice(0, -1).reduce((s, a) => s + a, 0));
  return out;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lines: SplitSourceLine[];
  accounts: SplitAccount[];
  currency: string;
  defaultAccountId: string;
  onApply: (sourceKey: number | null, parts: SplitPart[], description: string) => void;
};

export function SplitAccountsDialog({ open, onOpenChange, lines, accounts, currency, defaultAccountId, onApply }: Props) {
  const candidates = useMemo(() => lines.filter((l) => l.net !== 0), [lines]);
  const [sourceKey, setSourceKey] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<Mode>('pct');
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!open) return;
    const biggest = candidates.reduce<SplitSourceLine | null>((b, l) => (!b || Math.abs(l.net) > Math.abs(b.net) ? l : b), null);
    setSourceKey(biggest?.key ?? null);
    setAmount('');
    setDescription('');
    setMode('pct');
    setRows([{ account_id: biggest?.account_id || defaultAccountId, value: '50' }, { account_id: '', value: '50' }]);
    // Reset only when the dialog opens — `lines` is a fresh array on every editor render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const source = candidates.find((l) => l.key === sourceKey) || null;
  const total = source ? source.net : r2(num(amount));
  const values = rows.map((r) => num(r.value));
  const target = mode === 'pct' ? 100 : total;
  const left = r2(target - values.reduce((s, v) => s + v, 0));
  const parts = splitAmounts(total, mode, values);

  const problem =
    total === 0 ? 'Sisesta jagatav summa'
      : rows.some((r) => !r.account_id) ? 'Vali igale osale konto'
        : parts.some((a) => a === 0) ? 'Igal osal peab olema summa'
          : Math.abs(left) > (mode === 'pct' ? 0.001 : 0.005) ? `Jaotamata ${mode === 'pct' ? `${fmtPct(left)}%` : `${fmt(left)} ${currency}`}`
            : null;

  const setRow = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  const switchMode = (next: Mode) => {
    if (next === mode) return;
    // Keep the split the user already typed, just shown in the other unit.
    setRows((rs) => rs.map((r, i) => ({ ...r, value: next === 'eur' ? fmt(parts[i] ?? 0) : total ? fmtPct((num(r.value) / total) * 100) : '' })));
    setMode(next);
  };
  const evenly = () => {
    const n = rows.length;
    if (mode === 'pct') setRows((rs) => rs.map((r, i) => ({ ...r, value: fmtPct(i === n - 1 ? 100 - r2(100 / n) * (n - 1) : r2(100 / n)) })));
    else { const even = splitAmounts(total, 'pct', rows.map(() => 100 / n)); setRows((rs) => rs.map((r, i) => ({ ...r, value: fmt(even[i]) }))); }
  };
  const apply = () => {
    if (problem) return;
    onApply(source?.key ?? null, rows.map((r, i) => ({ account_id: r.account_id, amount: parts[i] })), source ? source.description : description.trim());
    onOpenChange(false);
  };

  const groups = useMemo(() => {
    const map = new Map<string, SplitAccount[]>();
    for (const a of accounts) { const g = a.group || ''; map.set(g, [...(map.get(g) || []), a]); }
    return [...map.entries()];
  }, [accounts]);

  const input = 'h-8 rounded-md border px-2 text-sm bg-[var(--surface)] border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[var(--surface)] p-5 shadow-xl"
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); apply(); } }}
        >
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-base font-semibold text-[var(--text-primary)]">Jaga kontodele</Dialog.Title>
              <Dialog.Description className="mt-0.5 text-xs text-[var(--text-secondary)]">
                Rida asendatakse osadega — igast osast saab eraldi rida oma kulukontoga. Neto summa jääb samaks.
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--a-bg)]" aria-label="Sulge"><X size={16} /></Dialog.Close>
          </div>

          <div className="space-y-3 text-sm">
            {candidates.length > 0 ? (
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Jagatav rida</span>
                <select className={`${input} w-full`} value={sourceKey ?? ''} onChange={(e) => setSourceKey(Number(e.target.value))}>
                  {candidates.map((l, i) => <option key={l.key} value={l.key}>{i + 1}. {l.description || 'Kirjelduseta rida'} — {fmt(l.net)} {currency}</option>)}
                </select>
              </label>
            ) : (
              <div className="grid grid-cols-[1fr_8rem] gap-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Kirjeldus</span>
                  <input className={`${input} w-full`} value={description} placeholder="Nt kontorikulud" onChange={(e) => setDescription(e.target.value)} />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Summa (neto)</span>
                  <input className={`${input} w-full text-right font-mono`} inputMode="decimal" value={amount} placeholder="0,00" autoFocus onChange={(e) => setAmount(e.target.value)} />
                </label>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="inline-flex rounded-md border border-[var(--border)] p-0.5 text-xs">
                {(['pct', 'eur'] as Mode[]).map((m) => (
                  <button key={m} type="button" onClick={() => switchMode(m)}
                    className={`rounded px-2.5 py-1 font-medium ${mode === m ? 'bg-[var(--primary)] text-white' : 'text-[var(--text-secondary)]'}`}>
                    {m === 'pct' ? 'Osakaal %' : `Summa ${currency}`}
                  </button>
                ))}
              </div>
              <button type="button" className="text-xs font-medium text-[var(--primary)] hover:underline" onClick={evenly}>Jaga võrdselt</button>
            </div>

            <div className="space-y-1.5">
              {rows.map((r, i) => (
                <div key={i} className="grid grid-cols-[1fr_6.5rem_5.5rem_1.5rem] items-center gap-2">
                  <select className={`${input} min-w-0 ${r.account_id ? '' : 'border-[var(--warning)]'}`} value={r.account_id} aria-label={`Osa ${i + 1} konto`} onChange={(e) => setRow(i, { account_id: e.target.value })}>
                    <option value="">Vali konto…</option>
                    {groups.map(([g, list]) => (g
                      ? <optgroup key={g} label={g}>{list.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)}</optgroup>
                      : list.map((a) => <option key={a.id} value={a.id}>{a.code} {a.name}</option>)))}
                  </select>
                  <div className="relative">
                    <input className={`${input} w-full pr-6 text-right font-mono`} inputMode="decimal" value={r.value} aria-label={`Osa ${i + 1} ${mode === 'pct' ? 'osakaal' : 'summa'}`} onChange={(e) => setRow(i, { value: e.target.value })} />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">{mode === 'pct' ? '%' : '€'}</span>
                  </div>
                  <span className="text-right font-mono text-xs text-[var(--text-secondary)]">{mode === 'pct' ? fmt(parts[i] ?? 0) : total ? `${fmtPct(((parts[i] ?? 0) / total) * 100)}%` : ''}</span>
                  <button type="button" className="rounded p-0.5 text-[var(--text-muted)] hover:text-[var(--danger)] disabled:opacity-30" disabled={rows.length <= 2} title="Eemalda osa" onClick={() => setRows((rs) => rs.filter((_, k) => k !== i))}><X size={14} /></button>
                </div>
              ))}
              <button type="button" className="text-xs font-medium text-[var(--primary)] hover:underline" onClick={() => setRows((rs) => [...rs, { account_id: '', value: left > 0 ? (mode === 'pct' ? fmtPct(left) : fmt(left)) : '' }])}>+ Lisa konto</button>
            </div>

            <div className="flex items-center justify-between border-t border-[var(--border)] pt-2 text-xs">
              <span className="text-[var(--text-secondary)]">Kokku <span className="font-mono font-semibold text-[var(--text-primary)]">{fmt(total)} {currency}</span></span>
              <span className={problem ? 'text-[var(--warning)]' : 'text-[var(--success)]'}>{problem || '✓ osad klapivad'}</span>
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Dialog.Close className="h-8 rounded-md px-3 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--a-bg)]">Loobu</Dialog.Close>
            <button type="button" disabled={!!problem} onClick={apply} className="h-8 rounded-md bg-[var(--primary)] px-3 text-sm font-medium text-white disabled:opacity-50">
              Jaga {rows.length} reaks
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
