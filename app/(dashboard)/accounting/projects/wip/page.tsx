'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Hammer, Loader2, RotateCcw, Undo2 } from 'lucide-react';
import { projectWipApi, type WipPreview, type WipProjectBalance, type WipRelease, type WipReleaseMode, type WipSourceLine } from '@/lib/api/projectWip.api';
import { getErrorMessage } from '@/lib/api/client';
import { getIsoToday } from '@/lib/utils/date';
import { showToast } from '@/components/ui/Toast';
import { PageSkeleton } from '@/components/ui/LoadingSkeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const fmt = (n: number) => n.toLocaleString('et-EE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pctText = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');
const parseNum = (v: string) => Number(String(v).replace(/\s/g, '').replace(',', '.'));
const dateText = (iso: string) => { const [y, m, d] = iso.slice(0, 10).split('-'); return `${d}.${m}.${y}`; };
const th = 'px-3 py-2 text-[11px] font-medium uppercase tracking-wider';
const td = 'px-3 py-2 text-sm whitespace-nowrap';
const inputCls = 'h-9 rounded-lg border px-2.5 text-sm';
const inputStyle = { borderColor: 'var(--border)', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' };

type Detail = { project: { id: string; code: string | null; name: string }; sources: WipSourceLine[]; releases: WipRelease[]; remaining: number };

/** Lõpetamata tööd per project: balances, source purchase lines, releases to cost and their reversal. */
export default function ProjectWipPage() {
  const t = useTranslations('accounting');
  const tc = useTranslations('common');

  const [summary, setSummary] = useState<WipProjectBalance[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [onlyOpen, setOnlyOpen] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // release form
  const [mode, setMode] = useState<WipReleaseMode>('all');
  const [value, setValue] = useState('');
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [date, setDate] = useState(getIsoToday());
  const [description, setDescription] = useState('');
  const [preview, setPreview] = useState<WipPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [reversing, setReversing] = useState<WipRelease | null>(null);

  const loadSummary = useCallback(async () => {
    try { setSummary(await projectWipApi.summary()); setError(null); }
    catch (e) { setError(getErrorMessage(e)); }
  }, []);
  const loadDetail = useCallback(async (projectId: string) => {
    setDetailLoading(true);
    try { setDetail(await projectWipApi.detail(projectId)); }
    catch (e) { showToast.error(getErrorMessage(e)); setDetail(null); }
    finally { setDetailLoading(false); }
  }, []);

  useEffect(() => {
    void loadSummary();
    const fromUrl = new URLSearchParams(window.location.search).get('project');
    if (fromUrl) setSelected(fromUrl);
  }, [loadSummary]);
  useEffect(() => {
    if (!selected) { setDetail(null); return; }
    setMode('all'); setValue(''); setOverrides({}); setDescription(''); setPreview(null);
    void loadDetail(selected);
    window.history.replaceState(null, '', `/accounting/projects/wip?project=${selected}`);
  }, [selected, loadDetail]);

  const plan = useMemo(() => {
    const lineOverrides: Record<string, number> = {};
    for (const [id, text] of Object.entries(overrides)) { const n = parseNum(text); if (Number.isFinite(n)) lineOverrides[id] = n; }
    const n = parseNum(value);
    return {
      mode,
      percent: mode === 'percent' && Number.isFinite(n) ? n : null,
      amount: mode === 'amount' && Number.isFinite(n) ? n : null,
      line_overrides: Object.keys(lineOverrides).length ? lineOverrides : null,
    };
  }, [mode, value, overrides]);

  useEffect(() => {
    if (!selected || !detail || detail.remaining === 0) { setPreview(null); return; }
    const timer = setTimeout(() => {
      projectWipApi.preview(selected, plan).then((p) => { setPreview(p); setPreviewError(null); }).catch((e) => setPreviewError(getErrorMessage(e)));
    }, 250);
    return () => clearTimeout(timer);
  }, [selected, detail, plan]);

  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try {
      await fn();
      showToast.success(ok);
      if (selected) await loadDetail(selected);
      await loadSummary();
      setOverrides({}); setValue(''); setMode('all');
    } catch (e) { showToast.error(getErrorMessage(e)); }
    finally { setBusy(null); }
  };

  if (!summary && !error) return <PageSkeleton tableRows={6} tableColumns={4} />;

  const header = (
    <div className="mb-6">
      <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('projectWip')}</h1>
      <p className="mt-1 max-w-3xl" style={{ color: 'var(--text-secondary)' }}>{t('projectWipDescription')}</p>
    </div>
  );
  if (error) return <div>{header}<ErrorState message={error} onRetry={loadSummary} /></div>;

  const rows = (summary || []).filter((r) => !onlyOpen || r.balance !== 0 || r.project_id === selected);
  const total = (summary || []).reduce((s, r) => s + r.balance, 0);
  const allocation = new Map((preview?.lines || []).map((l) => [l.source_id, l]));
  const openSources = (detail?.sources || []).filter((s) => s.remaining !== 0);
  const doneSources = (detail?.sources || []).filter((s) => s.remaining === 0);

  return (
    <div>
      {header}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        {/* projects */}
        <div className="card overflow-hidden self-start">
          <div className="flex items-center justify-between gap-2 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('projects')}</div>
            <label className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />{t('wipOnlyOpen')}
            </label>
          </div>
          {rows.length === 0 ? (
            <div className="px-4 py-6 text-sm" style={{ color: 'var(--text-muted)' }}>{t('wipNoProjects')}</div>
          ) : (
            <ul>
              {rows.map((r) => (
                <li key={r.project_id}>
                  <button type="button" onClick={() => setSelected(r.project_id)} className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-[var(--surface-elevated)]"
                    style={{ borderBottom: '1px solid var(--border)', backgroundColor: selected === r.project_id ? 'var(--surface-elevated)' : undefined, opacity: r.is_active ? 1 : 0.6 }}>
                    <span className="min-w-0 truncate" style={{ color: 'var(--text-primary)' }}>
                      {r.code && <span className="mr-1.5 font-mono font-semibold" style={{ color: 'var(--primary)' }}>{r.code}</span>}{r.name}
                      {r.wip_enabled && <span className="ml-1.5 rounded px-1 text-[10px] font-semibold" style={{ backgroundColor: '#fff4dc', color: '#8a5a00' }}>{t('wipShort')}</span>}
                    </span>
                    <span className="font-mono tabular-nums" style={{ color: r.balance ? 'var(--text-primary)' : 'var(--text-muted)' }}>{fmt(r.balance)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center justify-between px-4 py-3 text-sm font-semibold" style={{ backgroundColor: 'var(--surface-elevated)', color: 'var(--text-primary)' }}>
            <span>{tc('total')}</span><span className="font-mono tabular-nums">{fmt(total)}</span>
          </div>
        </div>

        {/* detail */}
        <div className="min-w-0">
          {!selected ? (
            <EmptyState icon={Hammer} title={t('projectWip')} message={t('wipPickProject')} />
          ) : detailLoading && !detail ? (
            <div className="card p-6"><Loader2 className="h-5 w-5 animate-spin" style={{ color: 'var(--text-muted)' }} /></div>
          ) : detail ? (
            <div className="space-y-6">
              <div className="card p-4 sm:p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{detail.project.code ? `${detail.project.code} · ` : ''}{detail.project.name}</h2>
                  <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('wipRemaining')} <b className="font-mono tabular-nums" style={{ color: 'var(--text-primary)' }}>{fmt(detail.remaining)}</b></div>
                </div>

                {openSources.length === 0 ? (
                  <div className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>{t('wipNothingOpen')}</div>
                ) : (
                  <>
                    <div className="mt-4 flex flex-wrap items-end gap-3">
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{t('wipMode')}</span>
                        <select className={inputCls} style={inputStyle} value={mode} onChange={(e) => { setMode(e.target.value as WipReleaseMode); setValue(''); setOverrides({}); }}>
                          <option value="all">{t('wipModeAll')}</option>
                          <option value="percent">{t('wipModePercent')}</option>
                          <option value="amount">{t('wipModeAmount')}</option>
                        </select>
                      </label>
                      {mode !== 'all' && (
                        <label className="block">
                          <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{mode === 'percent' ? '%' : t('wipModeAmount')}</span>
                          <input className={`${inputCls} w-28 text-right font-mono`} style={inputStyle} inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
                        </label>
                      )}
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{t('wipDate')}</span>
                        <input type="date" className={inputCls} style={inputStyle} value={date} onChange={(e) => setDate(e.target.value)} />
                      </label>
                      <label className="block min-w-[200px] flex-1">
                        <span className="mb-1 block text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{t('wipDescriptionField')}</span>
                        <input className={`${inputCls} w-full`} style={inputStyle} value={description} placeholder={t('wipDescriptionPlaceholder')} onChange={(e) => setDescription(e.target.value)} />
                      </label>
                      <button type="button" disabled={!!busy || !preview || !!previewError || !preview.amount}
                        onClick={() => void run('release', () => projectWipApi.release(selected, { ...plan, date, description: description || null }), t('wipReleased'))}
                        className="inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium text-white disabled:opacity-50" style={{ backgroundColor: 'var(--primary)' }}>
                        {busy === 'release' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Hammer className="h-4 w-4" />}
                        {t('wipRelease')} {preview ? fmt(preview.amount) : ''}
                      </button>
                    </div>
                    {previewError && <div className="mt-2 text-sm" style={{ color: 'var(--danger, #c0392b)' }}>{previewError}</div>}
                  </>
                )}

                {(detail.sources.length > 0) && (
                  <div className="mt-5 overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                          <th className={`${th} text-left`}>{t('wipSourceDate')}</th>
                          <th className={`${th} text-left`}>{t('wipSourceDocument')}</th>
                          <th className={`${th} text-left`}>{t('wipSourcePartner')}</th>
                          <th className={`${th} text-left`}>{t('wipSourceDescription')}</th>
                          <th className={`${th} text-right`}>{t('wipSourceAmount')}</th>
                          <th className={`${th} text-right`}>{t('wipSourceReleased')}</th>
                          <th className={`${th} text-right`}>{t('wipRemaining')}</th>
                          {openSources.length > 0 && <th className={`${th} text-right`}>%</th>}
                          {openSources.length > 0 && <th className={`${th} text-right`}>{t('wipToCost')}</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {[...openSources, ...doneSources].map((s) => {
                          const a = allocation.get(s.id);
                          const done = s.remaining === 0;
                          return (
                            <tr key={s.id} style={{ borderBottom: '1px dashed var(--border)', opacity: done ? 0.55 : 1 }}>
                              <td className={`${td} font-mono tabular-nums`} style={{ color: 'var(--text-secondary)' }}>{dateText(s.entry_date)}</td>
                              <td className={`${td} font-mono`}>
                                {s.source_document_schema === 'invoicing.invoices' && s.source_document_id
                                  ? <Link href={`/invoices/${s.source_document_id}/edit`} className="hover:underline" style={{ color: 'var(--primary)' }}>{s.invoice_number || s.source_document_id.slice(0, 8)}</Link>
                                  : <span style={{ color: 'var(--text-secondary)' }}>{s.entry_number ? `#${s.entry_number}` : '—'}</span>}
                              </td>
                              <td className={td} style={{ color: 'var(--text-secondary)' }}>{s.partner_name || '—'}</td>
                              <td className={`${td} max-w-[280px] truncate`} style={{ color: 'var(--text-primary)' }} title={s.description}>{s.description || '—'}</td>
                              <td className={`${td} text-right font-mono tabular-nums`} style={{ color: 'var(--text-primary)' }}>{fmt(s.amount)}</td>
                              <td className={`${td} text-right font-mono tabular-nums`} style={{ color: 'var(--text-secondary)' }}>{s.released ? fmt(s.released) : '-'}</td>
                              <td className={`${td} text-right font-mono tabular-nums`} style={{ color: 'var(--text-primary)' }}>{fmt(s.remaining)}</td>
                              {openSources.length > 0 && (
                                <td className={`${td} text-right`}>
                                  {!done && (
                                    <input className={`${inputCls} h-8 w-16 text-right font-mono`} inputMode="decimal"
                                      style={{ ...inputStyle, ...(overrides[s.id] !== undefined ? { borderColor: '#d9a441', backgroundColor: '#fff8e8' } : {}) }}
                                      value={overrides[s.id] ?? pctText(a?.percent ?? 0)} onChange={(e) => setOverrides((m) => ({ ...m, [s.id]: e.target.value }))} aria-label={t('wipLinePercent')} />
                                  )}
                                </td>
                              )}
                              {openSources.length > 0 && <td className={`${td} text-right font-mono tabular-nums`} style={{ color: 'var(--text-primary)' }}>{done ? '' : fmt(a?.amount ?? 0)}</td>}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {Object.keys(overrides).length > 0 && (
                      <button type="button" className="mt-2 text-xs font-medium hover:underline" style={{ color: 'var(--primary)' }} onClick={() => setOverrides({})}>{t('wipResetLines')}</button>
                    )}
                  </div>
                )}
              </div>

              <div className="card overflow-hidden">
                <div className="px-4 py-3 text-sm font-semibold" style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>{t('wipReleases')}</div>
                {detail.releases.length === 0 ? (
                  <div className="px-4 py-4 text-sm" style={{ color: 'var(--text-muted)' }}>{t('wipNoReleases')}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
                          <th className={`${th} text-left`}>{t('wipDate')}</th>
                          <th className={`${th} text-left`}>{t('wipSourceDocument')}</th>
                          <th className={`${th} text-left`}>{t('wipSourceDescription')}</th>
                          <th className={`${th} text-right`}>{t('wipSourceAmount')}</th>
                          <th className={`${th} text-right`}>%</th>
                          <th className={`${th} text-left`}>{t('wipStatus')}</th>
                          <th className={th} />
                        </tr>
                      </thead>
                      <tbody>
                        {detail.releases.map((r) => (
                          <tr key={r.id} style={{ borderBottom: '1px dashed var(--border)', opacity: r.status === 'reversed' ? 0.55 : 1 }}>
                            <td className={`${td} font-mono tabular-nums`} style={{ color: 'var(--text-secondary)' }}>{dateText(r.release_date)}</td>
                            <td className={`${td} font-mono`}>
                              {r.sales_invoice_id
                                ? <Link href={`/invoices/${r.sales_invoice_id}/edit`} className="hover:underline" style={{ color: 'var(--primary)' }}>{t('wipSalesInvoice')}</Link>
                                : <span style={{ color: 'var(--text-secondary)' }}>{t('wipManual')}</span>}
                            </td>
                            <td className={`${td} max-w-[280px] truncate`} style={{ color: 'var(--text-primary)' }} title={r.error_message || r.description || ''}>{r.status === 'failed' ? r.error_message : r.description}</td>
                            <td className={`${td} text-right font-mono tabular-nums`} style={{ color: 'var(--text-primary)' }}>{fmt(r.amount)}</td>
                            <td className={`${td} text-right font-mono tabular-nums`} style={{ color: 'var(--text-secondary)' }}>{r.percent != null ? pctText(r.percent) : '—'}</td>
                            <td className={td} style={{ color: r.status === 'failed' ? 'var(--danger, #c0392b)' : 'var(--text-secondary)' }}>{t(`wipStatus_${r.status}`)}</td>
                            <td className={`${td} text-right`}>
                              {(r.status === 'failed' || r.status === 'pending') && (
                                <button type="button" disabled={!!busy} onClick={() => void run(`retry:${r.id}`, () => projectWipApi.retry(r.id), t('wipReleased'))}
                                  className="mr-2 inline-flex items-center gap-1 text-xs font-medium hover:underline disabled:opacity-50" style={{ color: 'var(--primary)' }}>
                                  <RotateCcw className="h-3.5 w-3.5" />{t('wipRetry')}
                                </button>
                              )}
                              {r.status !== 'reversed' && (
                                <button type="button" disabled={!!busy} onClick={() => setReversing(r)}
                                  className="inline-flex items-center gap-1 text-xs font-medium hover:underline disabled:opacity-50" style={{ color: 'var(--danger, #c0392b)' }}>
                                  <Undo2 className="h-3.5 w-3.5" />{t('wipReverse')}
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={!!reversing} onOpenChange={(o) => { if (!o) setReversing(null); }}
        title={t('wipReverseTitle')} description={t('wipReverseDescription', { amount: reversing ? fmt(reversing.amount) : '' })} confirmLabel={t('wipReverse')} variant="warning"
        onConfirm={async () => { const r = reversing; setReversing(null); if (r) await run(`reverse:${r.id}`, () => projectWipApi.reverse(r.id, { date }), t('wipReversed')); }}
      />
    </div>
  );
}
