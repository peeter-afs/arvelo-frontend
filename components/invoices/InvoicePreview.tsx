'use client';

/**
 * Arve eelvaade — one 48px bar, the rest of the height is the PDF
 * (docs2/design_handoff_arve_eelvaade). Shows the server-generated PDF (the
 * same file that is downloaded, printed and sent) through pdf.js.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { invoicesApi, type InvoiceListItem } from '@/lib/api/invoices.api';
import { accountingApi } from '@/lib/api/accounting.api';
import { getErrorMessage } from '@/lib/api/client';
import { showToast } from '@/components/ui/Toast';
import { A4_H, A4_W } from './InvoicePdfViewer';
import s from './InvoicePreview.module.css';

const InvoicePdfViewer = dynamic(() => import('./InvoicePdfViewer'), { ssr: false });

type Mode = 'width' | 'page' | 'manual';
const ZOOM_KEY = 'arvelo-preview-zoom';
const PAD = 32;

const TITLES: Record<string, string> = {
  sales_invoice: 'Arve',
  sales_credit_note: 'Kreeditarve',
  purchase_invoice: 'Ostuarve',
  purchase_credit_note: 'Ostu kreeditarve',
  sales_offer: 'Hinnapakkumine',
};

function statusTag(status: string): [string, string] {
  switch (status) {
    case 'paid': return ['Tasutud', s.tagPos];
    case 'partially_paid': return ['Osaliselt tasutud', s.tagPos];
    case 'sent': return ['Saadetud', s.tagSent];
    case 'draft': return ['Mustand', s.tagOff];
    case 'cancelled': return ['Tühistatud', s.tagOff];
    default: return ['Saatmata', s.tagWarn];
  }
}

const clampZoom = (z: number) => Math.max(0.3, Math.min(2.5, z));

export default function InvoicePreview({ id }: { id: string }) {
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceListItem | null>(null);
  const [pdf, setPdf] = useState<{ url: string; blob: Blob } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [mode, setMode] = useState<Mode>('width');
  const [zoom, setZoom] = useState(1);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [indicator, setIndicator] = useState(false);
  const [focus, setFocus] = useState(false);
  const [hint, setHint] = useState(false);
  const [send, setSend] = useState<{ to: string; message: string } | null>(null);
  const [sending, setSending] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);

  /* ── data ── */
  useEffect(() => {
    invoicesApi.getInvoice(id).then((d) => setInvoice(d.invoice)).catch(() => {});
  }, [id]);

  useEffect(() => {
    let url: string | null = null;
    let live = true;
    setError(null);
    setPdf(null);
    invoicesApi
      .exportInvoice(id, 'pdf')
      .then((r) => {
        if (!live) return;
        url = URL.createObjectURL(r.blob);
        setPdf({ url, blob: r.blob });
      })
      .catch((e) => live && setError(getErrorMessage(e)));
    return () => {
      live = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id, reload]);

  // Last fit mode (width/page) is remembered; manual zoom is not.
  useEffect(() => {
    const saved = localStorage.getItem(ZOOM_KEY);
    if (saved === 'width' || saved === 'page') setMode(saved);
  }, []);

  /* ── zoom ── */
  const modeRef = useRef<Mode>(mode);
  modeRef.current = mode;
  const fit = useCallback(() => {
    const v = viewerRef.current;
    // Hidden or not laid out yet: computing now would pin the zoom to 30%.
    if (!v || v.clientWidth < 100) return;
    const w = v.clientWidth - PAD;
    const h = v.clientHeight - PAD;
    // Laptop (compact) screens are short: at 160% only the top third of the page shows.
    // Cap the width fit by the height there (never below 100%).
    const widthCap = document.documentElement.classList.contains('compact') ? Math.max(1, Math.min(1.6, (1.6 * h) / A4_H)) : 1.6;
    if (modeRef.current === 'width') setZoom(clampZoom(Math.min(widthCap, w / A4_W)));
    if (modeRef.current === 'page') setZoom(clampZoom(Math.min(w / A4_W, h / A4_H)));
  }, []);

  useEffect(() => {
    if (mode === 'width' || mode === 'page') {
      try { localStorage.setItem(ZOOM_KEY, mode); } catch { /* ignore */ }
    }
    fit();
  }, [mode, fit]);

  useEffect(() => {
    const v = viewerRef.current;
    if (!v) return;
    const ro = new ResizeObserver(() => fit());
    ro.observe(v);
    return () => ro.disconnect();
  }, [fit]);

  // Fullscreen changes the viewer size after paint.
  useEffect(() => {
    const r = requestAnimationFrame(() => fit());
    return () => cancelAnimationFrame(r);
  }, [focus, fit]);

  const step = useCallback((d: number) => {
    setMode('manual');
    setZoom((z) => clampZoom(Math.round((z + d) * 10) / 10));
  }, []);

  /* ── page tracking ── */
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onScroll = useCallback(() => {
    const v = viewerRef.current;
    const host = pagesRef.current;
    if (!v || !host) return;
    const mid = v.scrollTop + v.clientHeight / 3;
    let n = 1;
    host.querySelectorAll<HTMLElement>('[data-page]').forEach((el, i) => {
      if (el.offsetTop <= mid) n = i + 1;
    });
    setPage(n);
    if (pages > 1) {
      setIndicator(true);
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setIndicator(false), 900);
    }
  }, [pages]);

  /* ── fullscreen ── */
  const hintTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const toggleFocus = useCallback((on?: boolean) => {
    setFocus((f) => {
      const next = on ?? !f;
      clearTimeout(hintTimer.current);
      if (next) {
        setHint(true);
        hintTimer.current = setTimeout(() => setHint(false), 1800);
      } else {
        setHint(false);
      }
      return next;
    });
  }, []);

  /* ── actions ── */
  const title = TITLES[invoice?.type || 'sales_invoice'] || 'Dokument';
  const number = invoice?.invoice_number || '';
  const fileName = `${title}_${number || id}`.replace(/\s+/g, '_').replace(/[\\/:*?"<>|]+/g, '-') + '.pdf';
  const back = useCallback(() => router.push(`/invoices/${id}/edit`), [router, id]);

  const download = () => {
    if (!pdf) return;
    const a = document.createElement('a');
    a.href = pdf.url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const print = () => {
    if (!pdf) return;
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;width:0;height:0;border:0;right:0;bottom:0';
    frame.src = pdf.url;
    frame.onload = () => {
      try {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
      } catch {
        window.open(pdf.url, '_blank');
      }
      setTimeout(() => frame.remove(), 60000);
    };
    document.body.appendChild(frame);
  };

  const openSend = async () => {
    let to = '';
    if (invoice?.partner_id) {
      try { to = (await accountingApi.getPartner(invoice.partner_id))?.email || ''; } catch { /* manual entry */ }
    }
    setSend({ to, message: '' });
  };

  const doSend = async () => {
    if (!send) return;
    setSending(true);
    try {
      const r = await invoicesApi.sendInvoice(id, { to: send.to.trim() || undefined, message: send.message.trim() || undefined });
      setInvoice((inv) => (inv ? { ...inv, ...r.invoice } : inv));
      showToast.success(`${title} saadeti aadressile ${r.sent_to}.`);
      setSend(null);
    } catch (e) {
      showToast.error(getErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  /* ── keys ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('input,textarea,select,[contenteditable="true"]') || e.metaKey || e.ctrlKey || e.altKey) return;
      if (send) {
        if (e.key === 'Escape') setSend(null);
        return;
      }
      if (e.key === 'f' || e.key === 'F') { e.preventDefault(); toggleFocus(); }
      else if (e.key === 'Escape') { if (focus) toggleFocus(false); else back(); }
      else if (e.key === '+' || e.key === '=') { e.preventDefault(); step(0.1); }
      else if (e.key === '-' || e.key === '−') { e.preventDefault(); step(-0.1); }
      else if (e.key === '0') setMode('page');
      else if (e.key === 'w' || e.key === 'W') setMode('width');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focus, send, toggleFocus, step, back]);

  const [tagLabel, tagCls] = statusTag(invoice?.status || '');
  const isSales = !invoice || invoice.type === 'sales_invoice' || invoice.type === 'sales_credit_note';
  const placeholder = (
    <div className={s.placeholder} style={{ width: Math.round(A4_W * zoom), height: Math.round(A4_H * zoom) }}>
      {error ? (
        <>
          <div className={s.err}>{error}</div>
          <button className={s.btn} onClick={() => setReload((n) => n + 1)}>Proovi uuesti</button>
        </>
      ) : (
        <><Loader2 className="h-5 w-5 animate-spin" />Laen PDF-i…</>
      )}
    </div>
  );

  return (
    <div className={`${s.shell} ${focus ? s.focus : ''}`}>
      <header className={s.bar}>
        <button className={s.back} title="Tagasi arve juurde (Esc)" onClick={back}>
          <svg className={s.i} viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
        <div className={s.ttl}>
          <div className={s.crumb}>
            <Link href="/invoices/sales">Arvete keskus</Link><span>›</span>
            <Link href={`/invoices/${id}/edit`}>Kirje</Link><span>›</span>
            <span>Eelvaade</span>
          </div>
          <h1>
            {title} {number}
            {invoice?.partner_name && <span className={s.who}>{invoice.partner_name}</span>}
            {invoice && <span className={`${s.tag} ${tagCls}`}>{tagLabel}</span>}
          </h1>
        </div>

        <div className={s.ctl}>
          <button title="Vähenda (−)" onClick={() => step(-0.1)}><svg className={s.i} viewBox="0 0 24 24"><path d="M5 12h14" /></svg></button>
          <span className={s.v}>{Math.round(zoom * 100)}%</span>
          <button title="Suurenda (+)" onClick={() => step(0.1)}><svg className={s.i} viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg></button>
          <span className={s.sep} />
          <button className={mode === 'width' ? s.on : ''} title="Sobita laiusele (W)" onClick={() => setMode('width')}>
            <svg className={s.i} viewBox="0 0 24 24"><path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4" /></svg><span className={s.fitlbl}>Laius</span>
          </button>
          <button className={mode === 'page' ? s.on : ''} title="Terve lehekülg (0)" onClick={() => setMode('page')}>
            <svg className={s.i} viewBox="0 0 24 24"><rect x="6" y="3" width="12" height="18" rx="1.5" /></svg><span className={s.fitlbl}>Lehekülg</span>
          </button>
          <span className={s.sep} />
          <span className={s.v}>{page} / {pages}</span>
        </div>

        <div className={s.acts}>
          <button className={`${s.btn} ${s.ic}`} title="Täisekraan (F)" onClick={() => toggleFocus()}>
            <svg className={s.i} viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
          </button>
          <button className={`${s.btn} ${s.ic}`} title="Prindi" onClick={print} disabled={!pdf}>
            <svg className={s.i} viewBox="0 0 24 24"><path d="M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z" /></svg>
          </button>
          {isSales && (
            <button className={s.btn} onClick={openSend} disabled={!invoice || invoice.status === 'cancelled'}>
              <svg className={s.i} viewBox="0 0 24 24"><path d="M4 12l16-8-6 16-2-7z" /></svg><span className={s.lbl2}>Saada</span>
            </button>
          )}
          <button className={`${s.btn} ${s.primary}`} onClick={download} disabled={!pdf}>
            <svg className={s.i} viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg><span className={s.lbl2}>Laadi PDF alla</span>
          </button>
        </div>
      </header>

      <div className={s.vwrap}>
        <div className={s.viewer} ref={viewerRef} onScroll={onScroll}>
          <div className={s.pages} ref={pagesRef}>
            {pdf ? (
              <InvoicePdfViewer
                url={pdf.url}
                zoom={zoom}
                onPages={setPages}
                onError={(m) => setError(m)}
                pageClassName={s.page}
                placeholder={placeholder}
              />
            ) : placeholder}
          </div>
        </div>
        <div className={`${s.pgind} ${indicator ? s.pgindOn : ''}`}>Lk {page} / {pages}</div>
      </div>

      <div className={`${s.hint} ${hint ? s.hintOn : ''}`}>Täisekraan · <kbd>Esc</kbd> või <kbd>F</kbd> väljumiseks</div>

      {send && (
        <div className={s.modalBackdrop} onClick={() => setSend(null)}>
          <div className={s.modal} onClick={(e) => e.stopPropagation()}>
            <div className={s.mh}>Saada {title.toLowerCase()} {number}</div>
            <div className={s.mb}>
              <label>
                <span className={s.lbl}>Saaja e-post</span>
                <input className={s.inp} type="email" autoFocus value={send.to} placeholder="kliendi e-post" onChange={(e) => setSend({ ...send, to: e.target.value })} />
              </label>
              <label>
                <span className={s.lbl}>Lisasõnum (valikuline)</span>
                <textarea className={s.inp} rows={3} value={send.message} onChange={(e) => setSend({ ...send, message: e.target.value })} />
              </label>
              <div style={{ fontSize: 11.5, color: 'var(--a-text-3)' }}>Kiri läheb kliendi keeles ja manuseks on see sama PDF ({fileName}).</div>
            </div>
            <div className={s.mf}>
              <button className={s.btn} onClick={() => setSend(null)}>Loobu</button>
              <button className={`${s.btn} ${s.primary}`} disabled={sending} onClick={doSend}>
                {sending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Saada
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
