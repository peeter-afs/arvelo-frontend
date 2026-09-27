'use client';

/**
 * Shows a rendered document page (backend documentTemplates HTML) in a
 * sandboxed iframe: scripts run (the in-page paginator) but the frame has no
 * same-origin access to the app. The page reports its page count and clicked
 * document links via postMessage; zoom is applied from outside.
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react';

export const PAGE_W = 794;
export const PAGE_H = 1123;
const GAP = 22;

type Props = {
  html: string | null;
  zoom: number;
  /** show only the first page (thumbnails) */
  firstPageOnly?: boolean;
  onPages?: (pages: number) => void;
  onLink?: (link: { href: string; no: string; x: number; y: number }) => void;
  className?: string;
  style?: CSSProperties;
  title?: string;
};

export default function DocPreviewFrame({ html, zoom, firstPageOnly, onPages, onLink, className, style, title }: Props) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [pages, setPages] = useState(1);
  const cb = useRef({ onPages, onLink });
  useEffect(() => {
    cb.current = { onPages, onLink };
  }, [onPages, onLink]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const frame = ref.current;
      if (!frame || e.source !== frame.contentWindow || !e.data || typeof e.data !== 'object') return;
      if (e.data.type === 'arvelo-doc' && Number.isFinite(e.data.pages)) {
        const n = Math.max(1, Math.min(50, Number(e.data.pages)));
        setPages(n);
        cb.current.onPages?.(n);
      }
      if (e.data.type === 'arvelo-doc-link' && typeof e.data.href === 'string') {
        const r = frame.getBoundingClientRect();
        cb.current.onLink?.({ href: e.data.href, no: String(e.data.no || ''), x: r.left + r.width / 2, y: r.top + 80 });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const shown = firstPageOnly ? 1 : pages;
  const h = shown * PAGE_H + (shown - 1) * GAP;
  return (
    <div className={className} style={{ width: PAGE_W * zoom, height: h * zoom, overflow: 'hidden', flex: 'none', ...style }}>
      {html && (
        <iframe
          ref={ref}
          title={title || 'Dokumendi eelvaade'}
          sandbox="allow-scripts"
          srcDoc={html}
          scrolling="no"
          style={{
            width: PAGE_W,
            height: pages * PAGE_H + (pages - 1) * GAP,
            border: 0,
            transform: `scale(${zoom})`,
            transformOrigin: '0 0',
            display: 'block',
            background: 'transparent',
            pointerEvents: firstPageOnly ? 'none' : undefined,
          }}
        />
      )}
    </div>
  );
}
