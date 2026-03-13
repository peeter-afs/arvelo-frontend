'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertCircle, Download, Loader2 } from 'lucide-react';
import { invoicesApi } from '@/lib/api/invoices.api';
import { getErrorMessage } from '@/lib/api/client';

export default function InvoicePreviewPage() {
  const params = useParams<{ id: string }>();
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;

    const load = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const result = await invoicesApi.exportInvoice(params.id, 'pdf');
        objectUrl = window.URL.createObjectURL(result.blob);
        setPdfUrl(objectUrl);
        setFileName(result.filename);
      } catch (error) {
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    };

    void load();

    return () => {
      if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl);
      }
    };
  }, [params.id]);

  const handleDownload = () => {
    if (!pdfUrl) return;
    const anchor = document.createElement('a');
    anchor.href = pdfUrl;
    anchor.download = fileName || `invoice-${params.id}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Invoice Preview</h1>
          <p className="mt-1 text-sm text-slate-500">Preview the generated PDF before downloading or sending it.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/invoices/sales"
            className="inline-flex h-10 items-center rounded-lg border border-slate-200 px-4 text-sm text-slate-700 hover:bg-slate-50"
          >
            Back to invoices
          </Link>
          <button
            onClick={handleDownload}
            disabled={!pdfUrl}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--primary)] px-4 text-sm font-medium text-white hover:bg-[var(--primary-hover)] disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="card border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="card flex min-h-[70vh] items-center justify-center p-8 text-sm text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading invoice PDF...
        </div>
      ) : pdfUrl ? (
        <div className="card overflow-hidden">
          <iframe src={pdfUrl} title="Invoice PDF preview" className="h-[80vh] w-full bg-white" />
        </div>
      ) : (
        <div className="card p-8 text-sm text-slate-500">No preview available.</div>
      )}
    </div>
  );
}
