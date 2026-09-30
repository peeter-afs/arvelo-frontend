'use client';

/**
 * Arve mallid — saved PDF templates, their design/brand/content, assignment to
 * clients, and a live PDF / e-mail preview rendered by the backend (the same
 * HTML the PDF is made from). docs2/design_handoff_arve_mallid/Arve mallid.html
 */
import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { accountingApi, type PartnerRecord } from '@/lib/api/accounting.api';
import { getErrorMessage } from '@/lib/api/client';
import {
  ACCENTS,
  DOC_KINDS,
  FLAG_APPLIES,
  invoiceTemplatesApi,
  type DocKind,
  type DocLang,
  type InvoiceTemplate,
  type PreviewFlags,
  type PreviewRequest,
  type PreviewResponse,
  type TemplateLayout,
} from '@/lib/api/invoiceTemplates.api';
import { useAuthStore } from '@/lib/stores/auth.store';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { showToast } from '@/components/ui/Toast';
import DocPreviewFrame, { PAGE_W } from '@/components/documents/DocPreviewFrame';
import s from './InvoiceTemplatesSettings.module.css';

type Draft = {
  key: string;
  id: string | null;
  name: string;
  is_default: boolean;
  layout: TemplateLayout;
  accent_color: string;
  logo_document_id: string | null;
  logo_uri: string | null;
  show_unpaid: boolean;
  show_note: boolean;
  clients: Array<{ id: string; name: string }>;
  recurring: Array<{ id: string; name: string }>;
};

type PreviewPrefs = { doc: DocKind; lang: DocLang; flags: PreviewFlags; tab: 'pdf' | 'mail' };

const PREFS_KEY = 'arvelo.tpl.preview';
const LANGS: DocLang[] = ['et', 'en', 'fi', 'sv'];
const LAYOUTS: Array<{ key: TemplateLayout; name: string; desc: string }> = [
  { key: 'standard', name: 'Standard', desc: 'Selge ja neutraalne, rekvisiidid jaluses' },
  { key: 'modern', name: 'Modernne', desc: 'Värviline päis, rõhutatud kogusumma' },
];
const SAMPLE_FLAGS: Array<{ key: keyof PreviewFlags; label: string }> = [
  { key: 'disc', label: 'Allahindlus rea kaupa' },
  { key: 'multivat', label: 'Mitu KM määra: 24% ja 9%' },
  { key: 'rc', label: 'Pöördkäibemaks: EL ostja, KM 0%' },
  { key: 'multipage', label: 'Mitu lehekülge: 30 rida' },
];

let keySeq = 0;
const newKey = () => `new-${++keySeq}`;

function toDraft(t: InvoiceTemplate): Draft {
  return {
    key: t.id,
    id: t.id,
    name: t.name,
    is_default: t.is_default,
    layout: t.layout,
    accent_color: t.accent_color,
    logo_document_id: t.logo_document_id,
    logo_uri: null,
    show_unpaid: t.show_unpaid,
    show_note: t.show_note,
    clients: t.clients,
    recurring: t.recurring,
  };
}

const comparable = (list: Draft[]) =>
  JSON.stringify(list.map((d) => [d.id, d.name, d.layout, d.accent_color, d.logo_document_id, d.show_unpaid, d.show_note, d.clients.map((c) => c.id).sort()]));

function usageLine(d: Draft): string {
  const layout = d.layout === 'modern' ? 'Modernne' : 'Standard';
  if (d.is_default) return `${layout} · kõik teised`;
  const parts = [layout];
  if (d.clients.length) parts.push(`${d.clients.length} ${d.clients.length === 1 ? 'klient' : 'klienti'}`);
  if (d.recurring.length) parts.push(`${d.recurring.length} korduv${d.recurring.length === 1 ? ' arve' : 'at arvet'}`);
  return parts.length > 1 ? parts.join(' · ') : 'kasutamata';
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export default function InvoiceTemplatesSettings() {
  const { user } = useAuthStore();
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [saved, setSaved] = useState<Draft[]>([]);
  const [deleted, setDeleted] = useState<string[]>([]);
  const [selKey, setSelKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [partners, setPartners] = useState<PartnerRecord[]>([]);
  const [prefs, setPrefs] = useState<PreviewPrefs>({ doc: 'invoice', lang: 'et', flags: {}, tab: 'pdf' });
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [pages, setPages] = useState(1);
  const [zoom, setZoom] = useState(0.7);
  const [autoZoom, setAutoZoom] = useState(true);
  const [clientMenu, setClientMenu] = useState(false);
  const [clientQ, setClientQ] = useState('');
  const [moved, setMoved] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [link, setLink] = useState<{ href: string; no: string; x: number; y: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cache = useRef(new Map<string, PreviewResponse>());

  /* ── load ── */
  const load = useCallback(async () => {
    try {
      const list = (await invoiceTemplatesApi.list()).map(toDraft);
      setDrafts(list);
      setSaved(list);
      setDeleted([]);
      setSelKey((k) => (k && list.some((d) => d.key === k) ? k : list[0]?.key || null));
    } catch (e) {
      showToast.error(getErrorMessage(e));
      setDrafts([]);
    }
  }, []);

  useEffect(() => {
    load();
    accountingApi.listPartners({ is_active: true }).then((rows) => setPartners(rows.filter((p) => p.type !== 'supplier'))).catch(() => {});
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) setPrefs((p) => ({ ...p, ...JSON.parse(raw) }));
    } catch { /* ignore */ }
  }, [load]);

  useEffect(() => { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); }, [prefs]);

  const sel = drafts?.find((d) => d.key === selKey) || null;
  const dirty = !!drafts && (comparable(drafts) !== comparable(saved) || deleted.length > 0);

  const update = (patch: Partial<Draft>) => {
    if (!sel) return;
    setDrafts((list) => (list || []).map((d) => (d.key === sel.key ? { ...d, ...patch } : d)));
  };

  /* ── preview (debounced, cached) ── */
  const previewReq = useMemo<PreviewRequest | null>(() => {
    if (!sel) return null;
    return {
      template: { layout: sel.layout, accent_color: sel.accent_color, logo_document_id: sel.logo_document_id, show_unpaid: sel.show_unpaid, show_note: sel.show_note },
      doc: prefs.doc,
      lang: prefs.lang,
      flags: prefs.flags,
    };
  }, [sel, prefs.doc, prefs.lang, prefs.flags]);

  useEffect(() => {
    if (!previewReq) return;
    const k = JSON.stringify(previewReq);
    const hit = cache.current.get(k);
    if (hit) { setPreview(hit); return; }
    setLoadingPreview(true);
    const t = setTimeout(() => {
      invoiceTemplatesApi
        .preview(previewReq)
        .then((r) => { cache.current.set(k, r); setPreview(r); })
        .catch((e) => showToast.error(getErrorMessage(e)))
        .finally(() => setLoadingPreview(false));
    }, 350);
    return () => clearTimeout(t);
  }, [previewReq]);

  // Layout thumbnails: first page of an invoice in both designs with the current colour/logo.
  const thumbKey = sel ? `${sel.accent_color}|${sel.logo_document_id || ''}|${prefs.lang}` : '';
  useEffect(() => {
    if (!sel) return;
    let live = true;
    const t = setTimeout(() => {
      LAYOUTS.forEach((l) => {
        const req: PreviewRequest = {
          template: { layout: l.key, accent_color: sel.accent_color, logo_document_id: sel.logo_document_id, show_unpaid: true, show_note: true },
          doc: 'invoice', lang: prefs.lang, flags: {}, max_pages: 1,
        };
        const k = JSON.stringify(req);
        const hit = cache.current.get(k);
        if (hit) { setThumbs((m) => ({ ...m, [l.key]: hit.html })); return; }
        invoiceTemplatesApi.preview(req).then((r) => {
          cache.current.set(k, r);
          if (live) setThumbs((m) => ({ ...m, [l.key]: r.html }));
        }).catch(() => {});
      });
    }, 600);
    return () => { live = false; clearTimeout(t); };
  }, [thumbKey]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── zoom: fit width until the user zooms by hand ── */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !autoZoom) return;
    const fit = () => {
      const z = Math.min(1, Math.max(0.3, Math.floor(((el.clientWidth - 48) / PAGE_W) * 20) / 20));
      setZoom(z);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [autoZoom, prefs.tab]);

  const stepZoom = (d: number) => { setAutoZoom(false); setZoom((z) => Math.min(1, Math.max(0.3, Math.round((z + d * 0.05) * 20) / 20))); };

  /* ── actions ── */
  const addTemplate = () => {
    if (!drafts || !sel) return;
    const names = new Set(drafts.map((d) => d.name));
    let name = 'Uus mall';
    for (let i = 2; names.has(name); i++) name = `Uus mall ${i}`;
    const d: Draft = { ...sel, key: newKey(), id: null, name, is_default: false, clients: [], recurring: [] };
    setDrafts([...drafts, d]);
    setSelKey(d.key);
    setTimeout(() => { nameRef.current?.focus(); nameRef.current?.select(); }, 0);
  };

  const removeTemplate = () => {
    if (!sel || sel.is_default || !drafts) return;
    if (sel.id) setDeleted((x) => [...x, sel.id!]);
    const rest = drafts.filter((d) => d.key !== sel.key);
    setDrafts(rest);
    setSelKey(rest[0]?.key || null);
    setConfirmDelete(false);
  };

  const addClient = (p: PartnerRecord) => {
    if (!drafts || !sel) return;
    const prev = drafts.find((d) => d.key !== sel.key && d.clients.some((c) => c.id === p.id));
    setDrafts(drafts.map((d) => {
      if (d.key === sel.key) return { ...d, clients: [...d.clients, { id: p.id, name: p.name }] };
      if (prev && d.key === prev.key) return { ...d, clients: d.clients.filter((c) => c.id !== p.id) };
      return d;
    }));
    setMoved(prev ? `${p.name} tõsteti mallist „${prev.name}“.` : null);
    setClientMenu(false);
    setClientQ('');
  };

  const onLogo = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast.error('Vali pildifail'); return; }
    try {
      const r = await invoiceTemplatesApi.uploadLogo(file);
      update({ logo_document_id: r.document_id, logo_uri: r.data_uri });
    } catch (e) {
      showToast.error(getErrorMessage(e));
    }
  };

  const save = async () => {
    if (!drafts) return;
    setSaving(true);
    try {
      const res = await invoiceTemplatesApi.saveAll({
        templates: drafts.map((d) => ({
          id: d.id,
          key: d.key,
          name: d.name,
          layout: d.layout,
          accent_color: d.accent_color,
          logo_document_id: d.logo_document_id,
          show_unpaid: d.show_unpaid,
          show_note: d.show_note,
          client_ids: d.is_default ? undefined : d.clients.map((c) => c.id),
        })),
        deleted_ids: deleted,
      });
      const nextSel = selKey ? res.ids[selKey] || selKey : null;
      const list = res.templates.map(toDraft);
      setDrafts(list);
      setSaved(list);
      setDeleted([]);
      setSelKey(nextSel && list.some((d) => d.key === nextSel) ? nextSel : list[0]?.key || null);
      setMoved(null);
      showToast.success('Mallid salvestatud');
    } catch (e) {
      showToast.error(getErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const revert = () => { setDrafts(saved); setDeleted([]); setMoved(null); if (!saved.some((d) => d.key === selKey)) setSelKey(saved[0]?.key || null); };

  const downloadPdf = async () => {
    if (!previewReq) return;
    try {
      downloadBlob(await invoiceTemplatesApi.previewPdf(previewReq), preview?.file_name || 'dokument.pdf');
    } catch (e) {
      showToast.error(getErrorMessage(e));
    }
  };

  const setFlag = (k: keyof PreviewFlags) => setPrefs((p) => ({ ...p, flags: { ...p.flags, [k]: !p.flags[k] } }));

  // Close popovers on outside click.
  useEffect(() => {
    const close = () => { setLink(null); setClientMenu(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  if (!drafts) return <div className={s.center}><Loader2 className="h-5 w-5 animate-spin" /></div>;

  const accentName = ACCENTS.find((a) => a.hex.toLowerCase() === sel?.accent_color.toLowerCase())?.name || sel?.accent_color;
  const docLabel = DOC_KINDS.find((d) => d.key === prefs.doc)?.label || '';
  const clientMatches = partners
    .filter((p) => !sel?.clients.some((c) => c.id === p.id))
    .filter((p) => !clientQ.trim() || p.name.toLowerCase().includes(clientQ.toLowerCase()) || (p.reg_code || '').includes(clientQ))
    .slice(0, 40);
  const ownerOf = (pid: string) => drafts.find((d) => d.clients.some((c) => c.id === pid));

  return (
    <div className={s.shell}>
      <div className={s.topbar}>
        <div className={s.crumb}><Link href="/settings">Seaded</Link><span className={s.sep}>/</span><span>Dokumendid</span></div>
        <h1>Arve mallid</h1>
        <div className={s.acts}>
          <span className={`${s.dirty} ${dirty ? '' : s.clean}`}><span className={s.dot} />{dirty ? 'Salvestamata muudatused' : 'Salvestatud'}</span>
          <button className={`${s.btn} ${s.ghost}`} disabled={!dirty || saving} onClick={revert}>Tühista muudatused</button>
          <button className={`${s.btn} ${s.primary}`} disabled={!dirty || saving} onClick={save}>
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Salvesta
          </button>
        </div>
      </div>

      <div className={`${s.main} ${s.card}`}>
        <aside className={s.left}>
          <div className={s.sec}>
            <div className={s.sech}>Salvestatud mallid <span className={s.sechR}>{drafts.length}</span></div>
            <div className={s.lib}>
              {drafts.map((d) => (
                <button key={d.key} className={`${s.lrow} ${d.key === selKey ? s.lrowOn : ''}`} onClick={() => { setSelKey(d.key); setMoved(null); }}>
                  <span className={s.ldot} style={{ background: d.accent_color }} />
                  <span style={{ minWidth: 0 }}><div className={s.ln}>{d.name}</div><div className={s.lm}>{usageLine(d)}</div></span>
                  {d.is_default ? <span className={s.badge}>Vaikimisi</span> : <span />}
                </button>
              ))}
            </div>
            <button className={`${s.btn} ${s.addbtn}`} onClick={addTemplate}>+ Uus mall</button>
          </div>

          {sel && (
            <>
              <div className={s.sec}>
                <div className={s.fl}>Malli nimi <span className={s.flR}>{sel.is_default ? 'vaikemall' : 'ei ole arvel'}</span></div>
                <input ref={nameRef} className={s.inp} value={sel.name} disabled={sel.is_default} maxLength={120} onChange={(e) => update({ name: e.target.value })} />
              </div>

              <div className={s.sec}>
                <div className={s.sech}>Kujundus</div>
                <div className={s.tpls}>
                  {LAYOUTS.map((l) => {
                    const inUse = saved.find((d) => d.key === sel.key)?.layout === l.key;
                    return (
                      <button key={l.key} className={`${s.tpl} ${sel.layout === l.key ? s.tplOn : ''}`} onClick={() => update({ layout: l.key })}>
                        <div className={s.tthumb}>{thumbs[l.key] && <DocPreviewFrame html={thumbs[l.key]} zoom={0.1058} firstPageOnly title={l.name} />}</div>
                        <div>
                          <div className={s.tn}>{l.name}{inUse && <span className={s.badge}>Kasutusel</span>}</div>
                          <div className={s.td}>{l.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className={s.hint}>Kujundus kehtib kõigile dokumenditüüpidele: arved, kreeditarved, ettemaksuarved, pakkumised ja meeldetuletused.</div>
              </div>

              <div className={s.sec}>
                <div className={s.sech}>Bränd</div>
                <div className={s.logoRow}>
                  <label
                    className={`${s.drop} ${dragOver ? s.dropOver : ''}`}
                    onDragOver={(e: DragEvent) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e: DragEvent) => { e.preventDefault(); setDragOver(false); onLogo(e.dataTransfer.files?.[0]); }}
                  >
                    <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" hidden onChange={(e) => { onLogo(e.target.files?.[0]); e.target.value = ''; }} />
                    {sel.logo_uri ? (
                      // eslint-disable-next-line @next/next/no-img-element -- local data: URI, not an optimisable asset
                      <img src={sel.logo_uri} alt="Logo" />
                    ) : <span>{sel.logo_document_id ? 'Logo lisatud · vaheta' : 'Lohista logo siia või vali fail'}</span>}
                  </label>
                  {sel.logo_document_id && (
                    <button className={`${s.btn} ${s.icon}`} title="Eemalda logo" onClick={() => update({ logo_document_id: null, logo_uri: null })}>✕</button>
                  )}
                </div>
                <div className={s.hint} style={{ marginTop: 6 }}>PNG või SVG, läbipaistva taustaga. Logota kasutatakse ettevõtte algustähte.</div>
                <div className={s.swatches}>
                  {ACCENTS.map((a) => (
                    <button key={a.hex} className={`${s.sw} ${sel.accent_color.toLowerCase() === a.hex ? s.swOn : ''}`} style={{ background: a.hex }} title={a.name} onClick={() => update({ accent_color: a.hex })} />
                  ))}
                </div>
                <div className={s.swl}>{accentName}</div>
              </div>

              <div className={s.sec}>
                <div className={s.sech}>Sisu</div>
                <Toggle on={sel.show_unpaid} title="Varasemad tasumata arved" sub="Lisatakse arvele ja ettemaksuarvele" onClick={() => update({ show_unpaid: !sel.show_unpaid })} />
                <Toggle on={sel.show_note} title="Lisamärkus" sub="Arve märkuse väli trükitakse PDF-ile" onClick={() => update({ show_note: !sel.show_note })} />
              </div>

              <div className={s.sec}>
                <div className={s.sech}>Kasutus</div>
                {sel.is_default ? (
                  <div className={s.hint} style={{ marginTop: 0 }}>Kasutatakse kõigile klientidele ja korduvatele arvetele, millele pole muud malli määratud.</div>
                ) : (
                  <>
                    <div className={s.fl}>Kliendid</div>
                    <div className={s.pills}>
                      {sel.clients.map((c) => (
                        <span key={c.id} className={s.pill}><span>{c.name}</span><button title="Eemalda" onClick={() => update({ clients: sel.clients.filter((x) => x.id !== c.id) })}>✕</button></span>
                      ))}
                    </div>
                    <div className={s.rel} onClick={(e) => e.stopPropagation()}>
                      <button className={`${s.btn} ${s.ghost}`} onClick={() => setClientMenu((v) => !v)}>+ Lisa klient</button>
                      {clientMenu && (
                        <div className={s.menu}>
                          <input className={s.inp} autoFocus value={clientQ} placeholder="Otsi nime või registrikoodi" onChange={(e) => setClientQ(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && clientMatches[0]) addClient(clientMatches[0]); if (e.key === 'Escape') setClientMenu(false); }} />
                          {clientMatches.map((p) => {
                            const owner = ownerOf(p.id);
                            return (
                              <button key={p.id} className={s.mrow} onClick={() => addClient(p)}>
                                <span>{p.name}</span>{owner && <span className={s.mrowSub}>(praegu: {owner.name})</span>}
                              </button>
                            );
                          })}
                          {!clientMatches.length && <div className={s.mrow} style={{ cursor: 'default' }}>Kliente ei leitud</div>}
                        </div>
                      )}
                    </div>
                    {moved && <div className={s.moved}>{moved}</div>}
                    <div className={s.fl} style={{ marginTop: 12 }}>Korduvad arved</div>
                    <div className={s.pills}>
                      {sel.recurring.length ? sel.recurring.map((r) => (
                        <Link key={r.id} href={`/invoices/recurring/${r.id}`} className={`${s.pill} ${s.pillRo}`}><span>{r.name}</span></Link>
                      )) : <span className={s.hint} style={{ marginTop: 0 }}>—</span>}
                    </div>
                    <div className={s.hint} style={{ marginTop: 2 }}>Korduva arve PDF-malli saab valida korduva arve seadetest.</div>
                  </>
                )}
                <div className={s.prio}>
                  Kui dokumendile valitakse mall, kehtib esimene sobiv:
                  <ol><li><b>Korduva arve</b> mall</li><li><b>Kliendi</b> mall</li><li><b>Vaikimisi</b> mall</li></ol>
                </div>
                {!sel.is_default && (
                  <button className={`${s.btn} ${s.ghost} ${s.delbtn}`} onClick={() => (sel.clients.length || sel.recurring.length ? setConfirmDelete(true) : removeTemplate())}>Kustuta mall</button>
                )}
              </div>

              <div className={s.sec}>
                <div className={s.sech}>Eelvaade <span className={s.sechR}>ei salvestu</span></div>
                <div className={s.chips}>
                  {DOC_KINDS.map((d) => (
                    <button key={d.key} className={`${s.chip} ${prefs.doc === d.key ? s.chipOn : ''}`} onClick={() => setPrefs((p) => ({ ...p, doc: d.key }))}>{d.label}</button>
                  ))}
                </div>
                <div className={s.chips} style={{ marginTop: 8 }}>
                  {LANGS.map((l) => (
                    <button key={l} className={`${s.chip} ${prefs.lang === l ? s.chipOn : ''}`} onClick={() => setPrefs((p) => ({ ...p, lang: l }))}>{l.toUpperCase()}</button>
                  ))}
                </div>
                <div style={{ marginTop: 8 }}>
                  {SAMPLE_FLAGS.map((f) => {
                    const applies = FLAG_APPLIES[f.key].includes(prefs.doc);
                    return (
                      <Toggle
                        key={f.key}
                        on={!!prefs.flags[f.key] && applies}
                        disabled={!applies}
                        title={f.label}
                        sub={applies ? 'Näidisandmed' : `Ei kehti: ${docLabel}`}
                        onClick={() => applies && setFlag(f.key)}
                      />
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </aside>

        <section className={s.right}>
          <div className={s.ptool}>
            <div className={s.tabs}>
              <button className={prefs.tab === 'pdf' ? s.tabOn : ''} onClick={() => setPrefs((p) => ({ ...p, tab: 'pdf' }))}>PDF</button>
              <button className={prefs.tab === 'mail' ? s.tabOn : ''} onClick={() => setPrefs((p) => ({ ...p, tab: 'mail' }))}>E-kiri</button>
            </div>
            <span className={s.pinfo}>{docLabel} · {prefs.lang.toUpperCase()} · A4 · {pages} lk</span>
            <div className={s.sp} />
            {prefs.tab === 'pdf' && (
              <div className={s.zoom}>
                <button className={`${s.btn} ${s.icon} ${s.ghost}`} onClick={() => stepZoom(-1)}>−</button>
                <span>{Math.round(zoom * 100)}%</span>
                <button className={`${s.btn} ${s.icon} ${s.ghost}`} onClick={() => stepZoom(1)}>+</button>
                <button className={`${s.btn} ${s.ghost}`} onClick={() => setAutoZoom(true)}>Mahuta</button>
              </div>
            )}
            <button className={s.btn} onClick={downloadPdf}>↓ Laadi PDF</button>
          </div>
          <div className={s.scroll} ref={scrollRef}>
            {loadingPreview && <span className={s.loading}>Uuendan…</span>}
            {prefs.tab === 'pdf' ? (
              <div className={s.pages}>
                <DocPreviewFrame
                  html={preview?.html || null}
                  zoom={zoom}
                  onPages={setPages}
                  onLink={(l) => setLink(l)}
                />
              </div>
            ) : (
              preview && (
                <div className={s.mailv}>
                  <div className={`${s.mail} ${s.card}`}>
                    <div className={s.mh}>
                      <div className={s.mr}><span className={s.k}>Saatja</span><b>{preview.email.company}{preview.email.from ? ` <${preview.email.from}>` : ''}</b></div>
                      <div className={s.mr}><span className={s.k}>Saaja</span><span>{preview.email.to}</span></div>
                      <div className={s.mr}><span className={s.k}>Teema</span><b>{preview.email.subject}</b></div>
                    </div>
                    <div className={s.mb}>
                      <p>{preview.email.hello}</p>
                      <p>{preview.email.body}</p>
                      <p className={s.sig}>{preview.email.bye}<br />{user?.name || ''}{user?.name ? <br /> : null}{preview.email.company}</p>
                    </div>
                    <button className={s.att} onClick={() => setPrefs((p) => ({ ...p, tab: 'pdf' }))}>
                      <div className={s.athumb}><DocPreviewFrame html={preview.html} zoom={0.068} firstPageOnly /></div>
                      <div><div className={s.an}>{preview.file_name}</div><div className={s.as}>PDF · {pages} lk</div></div>
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </section>
      </div>

      {link && (
        <div className={s.lpop} style={{ left: Math.max(8, Math.min(link.x - 150, window.innerWidth - 316)), top: link.y }} onClick={(e) => e.stopPropagation()}>
          <div className={s.lt}>Arve {link.no} PDF</div>
          <div>PDF-is on see number klikitav link, mis avab kliendile saadetud arve.</div>
          <div className={s.url}>{link.href}</div>
          <div className={s.hint} style={{ marginTop: 0 }}>Püsiv link: töötab ka aastate pärast. Eelvaates on näidislink.</div>
          <div className={s.la}>
            <button className={`${s.btn} ${s.primary}`} onClick={() => { navigator.clipboard?.writeText(link.href); showToast.success('Link kopeeritud'); setLink(null); }}>Kopeeri link</button>
            <button className={s.btn} onClick={() => setLink(null)}>Sulge</button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Kustuta mall?"
        description={`Mall „${sel?.name || ''}“ on kasutusel. Selle kliendid lähevad vaikimisi mallile ja korduvad arved seadele „Kliendi mall“. Juba saadetud PDF-id ei muutu.`}
        confirmLabel="Kustuta"
        variant="danger"
        onConfirm={removeTemplate}
      />
    </div>
  );
}

function Toggle({ on, title, sub, disabled, onClick }: { on: boolean; title: string; sub: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`${s.tgrow} ${on ? s.tgOn : ''} ${disabled ? s.tgDis : ''}`} onClick={onClick} aria-pressed={on} disabled={disabled}>
      <span className={s.tl}><b>{title}</b><span>{sub}</span></span>
      <span className={s.swc} />
    </button>
  );
}
