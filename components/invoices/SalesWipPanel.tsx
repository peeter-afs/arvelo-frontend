'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { getErrorMessage } from '@/lib/api/client';
import { projectWipApi, type InvoiceWipPlan, type WipPreview, type WipRelease, type WipReleaseMode } from '@/lib/api/projectWip.api';
import { showToast } from '@/components/ui/Toast';
import own from './SalesWipPanel.module.css';

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const fmt = (n: number) => new Intl.NumberFormat('et-EE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const parseNum = (v: string) => Number(String(v).replace(/\s/g, '').replace(',', '.'));
const pctText = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');

type Props = {
  /** Editor styles (sec/sech/kv/btn…) so the panel looks like the rest of the rail. */
  styles: Record<string, string>;
  projectId: string;
  projectLabel: string;
  invoiceId: string | null;
  locked: boolean;
  /** Invoice net (without VAT): the margin preview is net − released cost. */
  net: number;
  currency: string;
  plan: InvoiceWipPlan | null;
  onPlanChange: (plan: InvoiceWipPlan | null, userChange: boolean) => void;
};

/**
 * Sales invoice rail: "Projekti lõpetamata tööd". The project's WIP balance (purchase lines booked to
 * the WIP account) is released to cost when the invoice is confirmed. Default = the whole balance,
 * every source line 100 %; a percent applies to every line; an amount is turned into one percent.
 * Source lines stay folded until asked for; a line's own percent overrides the common one.
 */
export function SalesWipPanel({ styles: s, projectId, projectLabel, invoiceId, locked, net, currency, plan, onPlanChange }: Props) {
  const [preview, setPreview] = useState<WipPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [releases, setReleases] = useState<WipRelease[] | null>(null);
  const [busy, setBusy] = useState(false);
  // text the user is typing in the value field; the plan keeps the parsed number
  const [valueText, setValueText] = useState<string>('');
  const [lineText, setLineText] = useState<Record<string, string>>({});

  const enabled = !!plan && plan.enabled !== false && plan.project_id === projectId;
  const mode: WipReleaseMode = enabled ? plan!.mode : 'all';
  const overrides = useMemo(() => (enabled ? plan!.line_overrides || {} : {}), [enabled, plan]);

  /* ── locked invoice: show what was booked ── */
  useEffect(() => {
    if (!locked || !invoiceId) return;
    projectWipApi.invoiceReleases(invoiceId).then(setReleases).catch(() => setReleases([]));
  }, [locked, invoiceId]);

  /* ── draft: preview against the current balances ── */
  const reqId = useRef(0);
  const planKey = JSON.stringify(enabled ? { m: plan!.mode, p: plan!.percent, a: plan!.amount, o: plan!.line_overrides } : { m: 'all' });
  useEffect(() => {
    if (locked || !projectId) return;
    const id = ++reqId.current;
    setLoading(true);
    const body = enabled ? { mode: plan!.mode, percent: plan!.percent ?? null, amount: plan!.amount ?? null, line_overrides: plan!.line_overrides ?? null } : { mode: 'all' as const };
    const t = setTimeout(() => {
      projectWipApi.preview(projectId, body)
        .then((p) => { if (id === reqId.current) { setPreview(p); setError(null); } })
        .catch((e) => {
          if (id !== reqId.current) return;
          setError(getErrorMessage(e));
          // keep the balance visible even when the typed plan is invalid
          projectWipApi.preview(projectId, { mode: 'all' }).then((p) => id === reqId.current && setPreview((cur) => cur || p)).catch(() => {});
        })
        .finally(() => id === reqId.current && setLoading(false));
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked, projectId, planKey]);

  /* ── a project with WIP and no stored plan: default to the whole balance ── */
  useEffect(() => {
    if (locked || !preview || plan?.project_id === projectId) return;
    if (preview.remaining_total > 0) onPlanChange({ project_id: projectId, mode: 'all', enabled: true }, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked, preview, projectId]);

  if (locked) {
    if (!releases || releases.length === 0) return null;
    const retry = async (r: WipRelease) => {
      setBusy(true);
      try { const next = await projectWipApi.retry(r.id); setReleases((rs) => (rs || []).map((x) => (x.id === r.id ? next : x))); showToast.success('Lõpetamata tööd kanti kuluks'); }
      catch (e) { showToast.error(getErrorMessage(e)); }
      finally { setBusy(false); }
    };
    return (
      <div className={s.sec}>
        <div className={s.sech}>Lõpetamata tööd<span className={s.r}><Link href={`/accounting/projects/wip?project=${projectId || releases[0].project_id}`}>Projekt</Link></span></div>
        {releases.map((r) => (
          <div key={r.id}>
            <div className={s.kv}><span>{r.status === 'posted' ? 'Kantud kuluks' : r.status === 'reversed' ? 'Tühistatud' : 'Ebaõnnestus'}</span><b className={`${s.mono} ${r.status === 'failed' ? s.neg : ''}`}>{fmt(r.amount)} {currency}</b></div>
            {r.percent != null && r.status === 'posted' && <div className={s.kv}><span>Jäägist</span><b>{pctText(r.percent)}%</b></div>}
            {r.status === 'failed' && (
              <>
                <div className={own.err}>{r.error_message}</div>
                <button type="button" className={`${s.btn} ${s.sm}`} disabled={busy} onClick={() => void retry(r)}>Proovi uuesti</button>
              </>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (!projectId || !preview || (preview.remaining_total === 0 && preview.sources.every((x) => x.remaining === 0))) return null;

  const setPlan = (patch: Partial<InvoiceWipPlan>) =>
    onPlanChange({ project_id: projectId, mode, percent: plan?.percent ?? null, amount: plan?.amount ?? null, line_overrides: plan?.line_overrides ?? null, enabled: true, ...patch }, true);
  const setMode = (m: WipReleaseMode) => {
    setValueText(m === 'percent' ? pctText(preview.percent || 100) : m === 'amount' ? fmt(preview.amount).replace(/\s/g, '') : '');
    setPlan({ mode: m, percent: m === 'percent' ? preview.percent || 100 : null, amount: m === 'amount' ? preview.amount : null, line_overrides: null });
    setLineText({});
  };
  const setValue = (text: string) => {
    setValueText(text);
    const n = parseNum(text);
    if (!Number.isFinite(n)) return;
    setPlan(mode === 'percent' ? { percent: n } : { amount: n });
  };
  const setLine = (sourceId: string, text: string) => {
    setLineText((m) => ({ ...m, [sourceId]: text }));
    const n = parseNum(text);
    if (!Number.isFinite(n)) return;
    setPlan({ line_overrides: { ...overrides, [sourceId]: n } });
  };
  const resetLines = () => { setLineText({}); setPlan({ line_overrides: null }); };

  const allocation = new Map((preview.lines || []).map((l) => [l.source_id, l]));
  const releaseAmount = enabled ? preview.amount : 0;
  const margin = r2(net - releaseAmount);
  const openSources = preview.sources.filter((x) => x.remaining !== 0);
  const shownValue = valueText || (mode === 'percent' ? pctText(plan?.percent ?? 100) : mode === 'amount' ? String(plan?.amount ?? '') : '');

  return (
    <div className={s.sec}>
      <div className={s.sech}>Lõpetamata tööd<span className={s.r}><Link href={`/accounting/projects/wip?project=${projectId}`} title={projectLabel}>{projectLabel}</Link></span></div>
      <label className={own.toggle}>
        <input type="checkbox" checked={enabled} onChange={(e) => onPlanChange(e.target.checked ? { project_id: projectId, mode: 'all', enabled: true } : { project_id: projectId, mode: 'all', enabled: false }, true)} />
        <span>Kanna arve kinnitamisel kuluks</span>
      </label>
      <div className={s.kv}><span>Projekti jääk</span><b className={s.mono}>{fmt(preview.remaining_total)} {currency}</b></div>
      {enabled && (
        <>
          <div className={own.row}>
            <select className={own.select} value={mode} onChange={(e) => setMode(e.target.value as WipReleaseMode)} aria-label="Mahakandmise viis">
              <option value="all">Kogu jääk</option>
              <option value="percent">Protsent</option>
              <option value="amount">Summa</option>
            </select>
            {mode !== 'all' && (
              <span className={own.valueWrap}>
                <input className={own.value} inputMode="decimal" value={shownValue} onChange={(e) => setValue(e.target.value)} aria-label={mode === 'percent' ? 'Protsent' : 'Summa'} />
                <span className={own.unit}>{mode === 'percent' ? '%' : currency}</span>
              </span>
            )}
          </div>
          {error && <div className={own.err}>{error}</div>}
          <div className={s.kv}><span>Kuluks{loading ? ' …' : ''}</span><b className={s.mono}>{fmt(releaseAmount)} {currency}{preview.remaining_total ? ` · ${pctText(preview.percent)}%` : ''}</b></div>
          <div className={s.kv}><span>Marginaal (neto − kulu)</span><b className={`${s.mono} ${margin < 0 ? s.neg : ''}`}>{fmt(margin)} {currency}</b></div>
          <button type="button" className={own.linkBtn} onClick={() => setOpen((o) => !o)}>{open ? 'Peida read' : `Näita ridu (${openSources.length})`}</button>
          {open && (
            <div className={own.lines}>
              {openSources.map((x) => {
                const a = allocation.get(x.id);
                const pinned = overrides[x.id] !== undefined;
                return (
                  <div key={x.id} className={own.line}>
                    <div className={own.desc} title={[x.description, x.partner_name, x.invoice_number].filter(Boolean).join(' · ')}>
                      <span>{x.description || '—'}</span>
                      <small>{[x.partner_name, x.invoice_number].filter(Boolean).join(' · ')} · jääk {fmt(x.remaining)}</small>
                    </div>
                    <span className={own.valueWrap}>
                      <input className={`${own.value} ${own.pct} ${pinned ? own.pinned : ''}`} inputMode="decimal" value={lineText[x.id] ?? pctText(a?.percent ?? 0)} onChange={(e) => setLine(x.id, e.target.value)} aria-label="Rea protsent" />
                      <span className={own.unit}>%</span>
                    </span>
                    <span className={`${own.amt} ${s.mono}`}>{fmt(a?.amount ?? 0)}</span>
                  </div>
                );
              })}
              {Object.keys(overrides).length > 0 && <button type="button" className={own.linkBtn} onClick={resetLines}>Kõigile ridadele sama protsent</button>}
            </div>
          )}
          <div className={s.jnote}>Kanne Dr kulu / Kr lõpetamata tööd tehakse arve kinnitamisel arve kuupäevaga.</div>
        </>
      )}
    </div>
  );
}
