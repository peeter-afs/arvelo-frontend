'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { costCentersApi, projectsApi, type CostCenter, type Project } from '@/lib/api/dimensions.api';
import { accountingApi, type PartnerRecord } from '@/lib/api/accounting.api';
import { getErrorMessage } from '@/lib/api/client';
import { showToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const inputClass = 'h-9 w-full rounded-lg border border-slate-200 px-2.5 text-sm text-slate-900 outline-none focus:border-[var(--primary)] disabled:bg-slate-50';
const smallButton = 'inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50';

type Kind = 'cost_center' | 'project';
type Row = Project | CostCenter;

/** Settings → Data management: maintain cost centres and projects (migration 089). */
export function DimensionsPanel() {
  const t = useTranslations('accounting');
  const tc = useTranslations('common');
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [partners, setPartners] = useState<PartnerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<{ kind: Kind; row: Row } | null>(null);

  const load = async () => {
    setError(null);
    try {
      const [cc, prj, partnerRows] = await Promise.all([
        costCentersApi.list({ include_inactive: true }),
        projectsApi.list({ include_inactive: true }),
        accountingApi.listPartners({ is_active: true }).catch(() => [] as PartnerRecord[]),
      ]);
      setCostCenters(cc); setProjects(prj); setPartners(partnerRows);
    } catch (e) { setError(getErrorMessage(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const apiFor = (kind: Kind) => (kind === 'cost_center' ? costCentersApi : projectsApi);
  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try { await fn(); await load(); }
    catch (e) { showToast.error(getErrorMessage(e)); }
    finally { setBusy(null); }
  };
  const save = (kind: Kind, id: string, patch: Record<string, unknown>) => run(`${kind}:${id}`, () => apiFor(kind).update(id, patch));

  return (
    <div className="rounded-xl border border-slate-200 p-6">
      <h3 className="text-base font-semibold text-slate-900">{t('dimensionsTitle')}</h3>
      <p className="mt-1 text-sm text-slate-500">{t('dimensionsDescription')}</p>
      {error && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /></div>
      ) : (
        <div className="mt-4 grid gap-6 xl:grid-cols-[2fr_3fr]">
          <DimensionList
            kind="cost_center" title={t('costCenters')} rows={costCenters} busy={busy}
            labels={{ code: t('dimensionCode'), name: t('dimensionName'), empty: t('noDimensions'), add: tc('add'), del: tc('delete'), activate: t('activate'), deactivate: t('deactivate'), nameRequired: t('dimensionNameRequired') }}
            onCreate={(input) => run('cost_center:new', () => costCentersApi.create(input))}
            onSave={(id, patch) => save('cost_center', id, patch)}
            onDelete={(row) => setDeleting({ kind: 'cost_center', row })}
          />
          <DimensionList
            kind="project" title={t('projects')} rows={projects} busy={busy}
            labels={{ code: t('dimensionCode'), name: t('dimensionName'), empty: t('noDimensions'), add: tc('add'), del: tc('delete'), activate: t('activate'), deactivate: t('deactivate'), nameRequired: t('dimensionNameRequired'), costCenter: t('parentCostCenter'), partner: t('dimensionPartner') }}
            costCenters={costCenters.filter((c) => c.is_active)} partners={partners}
            onCreate={(input) => run('project:new', () => projectsApi.create(input))}
            onSave={(id, patch) => save('project', id, patch)}
            onDelete={(row) => setDeleting({ kind: 'project', row })}
          />
        </div>
      )}
      <ConfirmDialog
        open={!!deleting} onOpenChange={(open) => { if (!open) setDeleting(null); }}
        title={t('dimensionDeleteTitle', { name: deleting?.row.name || '' })} description={t('dimensionDeleteDescription')} confirmLabel={tc('delete')}
        onConfirm={async () => { if (!deleting) return; const d = deleting; setDeleting(null); await run(`${d.kind}:${d.row.id}`, () => apiFor(d.kind).remove(d.row.id)); }}
      />
    </div>
  );
}

type Labels = { code: string; name: string; empty: string; add: string; del: string; activate: string; deactivate: string; nameRequired: string; costCenter?: string; partner?: string };

function DimensionList({ kind, title, rows, busy, labels, costCenters, partners, onCreate, onSave, onDelete }: {
  kind: Kind; title: string; rows: Row[]; busy: string | null; labels: Labels; costCenters?: CostCenter[]; partners?: PartnerRecord[];
  onCreate: (input: { code?: string; name: string; cost_center_id?: string | null; partner_id?: string | null }) => Promise<unknown>;
  onSave: (id: string, patch: Record<string, unknown>) => Promise<unknown>;
  onDelete: (row: Row) => void;
}) {
  const isProject = kind === 'project';
  const [draft, setDraft] = useState({ code: '', name: '', cost_center_id: '', partner_id: '' });
  const [edits, setEdits] = useState<Record<string, { code: string; name: string }>>({});
  const edit = (row: Row) => edits[row.id] || { code: row.code || '', name: row.name };
  const commit = (row: Row) => {
    const e = edits[row.id]; if (!e) return;
    if (!e.name.trim()) { showToast.error(labels.nameRequired); return; }
    if (e.code.trim() === (row.code || '') && e.name.trim() === row.name) { setEdits((m) => { const n = { ...m }; delete n[row.id]; return n; }); return; }
    void onSave(row.id, { code: e.code.trim() || null, name: e.name.trim() }).then(() => setEdits((m) => { const n = { ...m }; delete n[row.id]; return n; }));
  };
  const create = () => {
    if (!draft.name.trim()) { showToast.error(labels.nameRequired); return; }
    void onCreate({ code: draft.code.trim() || undefined, name: draft.name.trim(), ...(isProject ? { cost_center_id: draft.cost_center_id || null, partner_id: draft.partner_id || null } : {}) })
      .then(() => setDraft({ code: '', name: '', cost_center_id: '', partner_id: '' }));
  };
  const grid = isProject ? 'grid-cols-[84px_minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto]' : 'grid-cols-[84px_minmax(0,1fr)_auto]';

  return (
    <div>
      <div className="mb-2 text-sm font-semibold text-slate-800">{title}</div>
      <div className={`grid ${grid} items-center gap-2 px-1 text-[11px] font-medium uppercase tracking-wide text-slate-400`}>
        <span>{labels.code}</span><span>{labels.name}</span>{isProject && <><span>{labels.costCenter}</span><span>{labels.partner}</span></>}<span />
      </div>
      <div className="mt-1 space-y-1.5">
        {rows.length === 0 && <div className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-sm text-slate-400">{labels.empty}</div>}
        {rows.map((row) => {
          const e = edit(row); const p = row as Project; const rowBusy = busy === `${kind}:${row.id}`;
          return (
            <div key={row.id} className={`grid ${grid} items-center gap-2 ${row.is_active ? '' : 'opacity-60'}`}>
              <input className={inputClass} value={e.code} onChange={(ev) => setEdits((m) => ({ ...m, [row.id]: { ...e, code: ev.target.value } }))} onBlur={() => commit(row)} disabled={rowBusy} />
              <input className={inputClass} value={e.name} onChange={(ev) => setEdits((m) => ({ ...m, [row.id]: { ...e, name: ev.target.value } }))} onBlur={() => commit(row)} onKeyDown={(ev) => { if (ev.key === 'Enter') (ev.target as HTMLInputElement).blur(); }} disabled={rowBusy} />
              {isProject && (
                <>
                  <select className={inputClass} value={p.cost_center_id || ''} disabled={rowBusy} onChange={(ev) => void onSave(row.id, { cost_center_id: ev.target.value || null })}>
                    <option value="">—</option>
                    {(costCenters || []).map((c) => <option key={c.id} value={c.id}>{c.code ? `${c.code} · ${c.name}` : c.name}</option>)}
                    {p.cost_center_id && !(costCenters || []).some((c) => c.id === p.cost_center_id) && <option value={p.cost_center_id}>…</option>}
                  </select>
                  <select className={inputClass} value={p.partner_id || ''} disabled={rowBusy} onChange={(ev) => void onSave(row.id, { partner_id: ev.target.value || null })}>
                    <option value="">—</option>
                    {(partners || []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                    {p.partner_id && !(partners || []).some((x) => x.id === p.partner_id) && <option value={p.partner_id}>…</option>}
                  </select>
                </>
              )}
              <div className="flex items-center gap-1">
                <button type="button" className={smallButton} disabled={rowBusy} onClick={() => void onSave(row.id, { is_active: !row.is_active })}>{rowBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : row.is_active ? labels.deactivate : labels.activate}</button>
                <button type="button" className={`${smallButton} px-2 text-red-600 hover:bg-red-50`} title={labels.del} disabled={rowBusy} onClick={() => onDelete(row)}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          );
        })}
        <div className={`grid ${grid} items-center gap-2 border-t border-slate-100 pt-2`}>
          <input className={inputClass} placeholder={labels.code} value={draft.code} onChange={(ev) => setDraft((d) => ({ ...d, code: ev.target.value }))} />
          <input className={inputClass} placeholder={labels.name} value={draft.name} onChange={(ev) => setDraft((d) => ({ ...d, name: ev.target.value }))} onKeyDown={(ev) => { if (ev.key === 'Enter') create(); }} />
          {isProject && (
            <>
              <select className={inputClass} value={draft.cost_center_id} onChange={(ev) => setDraft((d) => ({ ...d, cost_center_id: ev.target.value }))}>
                <option value="">—</option>{(costCenters || []).map((c) => <option key={c.id} value={c.id}>{c.code ? `${c.code} · ${c.name}` : c.name}</option>)}
              </select>
              <select className={inputClass} value={draft.partner_id} onChange={(ev) => setDraft((d) => ({ ...d, partner_id: ev.target.value }))}>
                <option value="">—</option>{(partners || []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
              </select>
            </>
          )}
          <button type="button" className={`${smallButton} bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] border-transparent`} disabled={busy === `${kind}:new`} onClick={create}>
            {busy === `${kind}:new` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}{labels.add}
          </button>
        </div>
      </div>
    </div>
  );
}
