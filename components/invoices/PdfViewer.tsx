'use client';

import { useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

/** Original document viewer: PDFs through pdf.js, images directly. Pages render at
 *  600px design width scaled by `zoom`, so the caller's fit-width maths is shared. */
export default function PdfViewer({ url, mimeType, zoom, onPages }: { url: string; mimeType?: string | null; zoom: number; onPages?: (n: number) => void }) {
  const [pages, setPages] = useState(0);
  useEffect(() => { onPages?.(pages); }, [pages, onPages]);
  if (mimeType && mimeType.startsWith('image/')) {
    // eslint-disable-next-line @next/next/no-img-element -- blob URL scaled by zoom; next/image adds nothing here
    return <img src={url} alt="" style={{ width: Math.round(600 * zoom), display: 'block' }} />;
  }
  return (
    <Document file={url} onLoadSuccess={(doc) => setPages(doc.numPages)} loading={<div style={{ padding: 20, fontSize: 12, color: 'var(--a-text-3)' }}>Laen originaali…</div>} error={<div style={{ padding: 20, fontSize: 12, color: 'var(--a-neg)' }}>Originaali ei õnnestunud avada.</div>}>
      {Array.from({ length: pages }, (_, i) => (
        <Page key={i} pageNumber={i + 1} width={Math.round(600 * zoom)} renderTextLayer={false} renderAnnotationLayer={false} />
      ))}
    </Document>
  );
}
