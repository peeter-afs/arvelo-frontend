'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Loader2, X } from 'lucide-react';
import { costCentersApi, projectsApi, dimensionLabel, dimensionPolicyApi, type CostCenter, type Project } from '@/lib/api/dimensions.api';
import { getErrorMessage } from '@/lib/api/client';
import { showToast } from '@/components/ui/Toast';

type Kind = 'cost_center' | 'project';
const NEW: Record<Kind, string> = { cost_center: '__new_cost_center__', project: '__new_project__' };

type Pending = { kind: Kind; apply: (id: string, created?: CostCenter | Project) => void; costCenterId?: string };

/**
 * Create a cost centre or project straight from an invoice: a "+ Lisa uus …" option at the end of
 * the select opens a small form, and the new item is picked right away. Shown only when the
 * company's create policy allows it on invoices (Settings → Data management).
 */
export function useDimensionCreator(opts: {
  costCenters: CostCenter[];
  setCostCenters: (fn: (rows: CostCenter[]) => CostCenter[]) => void;
  setProjects: (fn: (rows: Project[]) => Project[]) => void;
  partnerId?: string | null;
  partnerName?: string | null;
}) {
  const [canCreate, setCanCreate] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  useEffect(() => { void dimensionPolicyApi.get().then((p) => setCanCreate(p.can_create_on_invoice)); }, []);

  const newOption = (kind: Kind): ReactNode =>
    canCreate ? <option value={NEW[kind]}>{kind === 'cost_center' ? '+ Lisa uus kulukoht…' : '+ Lisa uus projekt…'}</option> : null;

  /** onChange helper: the "new" option opens the form, anything else goes straight to apply. */
  const pick = (kind: Kind, value: string, apply: (id: string, created?: CostCenter | Project) => void, costCenterId?: string) => {
    if (value === NEW[kind]) setPending({ kind, apply, costCenterId });
    else apply(value);
  };

  const dialog = pending ? (
    <DimensionCreateDialog
      kind={pending.kind}
      costCenters={opts.costCenters}
      defaultCostCenterId={pending.costCenterId}
      partnerId={opts.partnerId}
      partnerName={opts.partnerName}
      onClose={() => setPending(null)}
      onCreated={(row) => {
        if (pending.kind === 'cost_center') opts.setCostCenters((rows) => [...rows, row as CostCenter]);
        else opts.setProjects((rows) => [...rows, row as Project]);
        pending.apply(row.id, row);
        setPending(null);
        showToast.success(pending.kind === 'cost_center' ? 'Kulukoht lisatud' : 'Projekt lisatud');
      }}
    />
  ) : null;

  return { canCreate, newOption, pick, dialog };
}

export type DimensionCreator = ReturnType<typeof useDimensionCreator>;

const input = 'h-9 w-full rounded-lg border border-slate-200 px-2.5 text-sm text-slate-900 outline-none focus:border-[var(--primary)]';

function DimensionCreateDialog({ kind, costCenters, defaultCostCenterId, partnerId, partnerName, onClose, onCreated }: {
  kind: Kind; costCenters: CostCenter[]; defaultCostCenterId?: string; partnerId?: string | null; partnerName?: string | null;
  onClose: () => void; onCreated: (row: CostCenter | Project) => void;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [costCenterId, setCostCenterId] = useState(defaultCostCenterId || '');
  const [linkPartner, setLinkPartner] = useState(Boolean(partnerId));
  const [wip, setWip] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => { nameRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const save = async () => {
    if (!name.trim()) { setError('Nimi on kohustuslik'); return; }
    setBusy(true); setError(null);
    try {
      const row = kind === 'cost_center'
        ? await costCentersApi.create({ name: name.trim(), code: code.trim() || null, context: 'invoice' })
        : await projectsApi.create({
          name: name.trim(), code: code.trim() || null, context: 'invoice',
          cost_center_id: costCenterId || null, partner_id: linkPartner && partnerId ? partnerId : null, ...(wip ? { wip_enabled: true } : {}),
        });
      onCreated(row);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/30 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-label={kind === 'cost_center' ? 'Uus kulukoht' : 'Uus projekt'} className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">{kind === 'cost_center' ? 'Uus kulukoht' : 'Uus projekt'}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Sulge"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); void save(); }} className="space-y-3">
          <div className="grid grid-cols-[96px_1fr] gap-2">
            <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600">Kood</span><input className={input} value={code} onChange={(e) => setCode(e.target.value)} /></label>
            <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600">Nimi</span><input ref={nameRef} className={input} value={name} onChange={(e) => setName(e.target.value)} /></label>
          </div>
          {kind === 'project' && (
            <>
              <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600">Kulukoht</span>
                <select className={input} value={costCenterId} onChange={(e) => setCostCenterId(e.target.value)}>
                  <option value="">—</option>
                  {costCenters.filter((c) => c.is_active).map((c) => <option key={c.id} value={c.id}>{dimensionLabel(c)}</option>)}
                </select>
              </label>
              {partnerId && (
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={linkPartner} onChange={(e) => setLinkPartner(e.target.checked)} />
                  <span>Seo partneriga {partnerName ? <b>{partnerName}</b> : ''}</span>
                </label>
              )}
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={wip} onChange={(e) => setWip(e.target.checked)} />
                <span>Lõpetamata tööd (ostud bilansikontole, kuluks müügiarvega)</span>
              </label>
            </>
          )}
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 hover:bg-slate-50">Loobu</button>
            <button type="submit" disabled={busy} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-50">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}Lisa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
