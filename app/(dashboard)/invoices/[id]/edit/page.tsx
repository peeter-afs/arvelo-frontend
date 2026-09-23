'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import InvoiceEditor from '@/components/invoices/InvoiceEditor';
import SalesInvoiceEditor from '@/components/invoices/SalesInvoiceEditor';
import PurchaseInvoiceEditor from '@/components/invoices/PurchaseInvoiceEditor';
import { invoicesApi, type InvoiceDetail } from '@/lib/api/invoices.api';
import { getErrorMessage } from '@/lib/api/client';

/** Sales and purchase invoices open in their dense editors; credit notes keep the generic one. */
export default function EditInvoicePage() {
  const params = useParams<{ id: string }>();
  const [detail, setDetail] = useState<InvoiceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    invoicesApi.getInvoice(params.id).then((d) => live && setDetail(d)).catch((e) => live && setError(getErrorMessage(e)));
    return () => { live = false; };
  }, [params.id]);

  if (error) return <div className="mt-4 rounded-lg border border-[var(--a-neg-soft)] bg-[var(--a-neg-soft)] px-4 py-3 text-[13px] text-[var(--a-neg)]">{error}</div>;
  if (!detail) return <div className="flex items-center gap-2 p-8 text-[13px] text-[var(--a-text-3)]"><Loader2 className="h-4 w-4 animate-spin" /> Laen arvet…</div>;
  if (detail.invoice.type === 'sales_invoice') return <SalesInvoiceEditor mode="edit" invoiceId={params.id} initial={detail} />;
  if (detail.invoice.type === 'purchase_invoice') return <PurchaseInvoiceEditor mode="edit" invoiceId={params.id} initial={detail} />;
  return <InvoiceEditor mode="edit" invoiceId={params.id} />;
}
