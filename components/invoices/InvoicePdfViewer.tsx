'use client';

import { forwardRef, useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

export const A4_W = 794;
export const A4_H = 1123;

type Props = {
  url: string;
  zoom: number;
  onPages?: (n: number) => void;
  onError?: (message: string) => void;
  className?: string;
  pageClassName?: string;
  placeholder: React.ReactNode;
};

/**
 * Server-rendered invoice PDF through pdf.js (design_handoff_arve_eelvaade):
 * canvas at 794 × zoom × devicePixelRatio for sharp text, text layer for
 * selecting/copying, annotation layer so document links stay clickable.
 * No browser PDF toolbar. Pages carry data-page for the caller's page tracking.
 */
const InvoicePdfViewer = forwardRef<HTMLDivElement, Props>(function InvoicePdfViewer(
  { url, zoom, onPages, onError, className, pageClassName, placeholder },
  ref,
) {
  const [pages, setPages] = useState(0);
  // Client-only component (loaded with ssr:false), so window is available.
  const [dpr] = useState(() => (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1));
  useEffect(() => { if (pages) onPages?.(pages); }, [pages, onPages]);
  const width = Math.round(A4_W * zoom);

  return (
    <div ref={ref} className={className}>
      <Document
        file={url}
        onLoadSuccess={(doc) => setPages(doc.numPages)}
        onLoadError={(e) => onError?.(e.message)}
        loading={placeholder}
        error={placeholder}
        externalLinkTarget="_blank"
      >
        {Array.from({ length: pages }, (_, i) => (
          <div key={i} data-page={i + 1} className={pageClassName} style={{ width, minHeight: Math.round(A4_H * zoom) }}>
            <Page pageNumber={i + 1} width={width} devicePixelRatio={dpr} renderTextLayer renderAnnotationLayer loading={null} />
          </div>
        ))}
      </Document>
    </div>
  );
});

export default InvoicePdfViewer;
