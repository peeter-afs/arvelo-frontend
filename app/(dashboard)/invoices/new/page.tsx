'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import InvoiceEditor from '@/components/invoices/InvoiceEditor';

const VALID_TYPES = ['sales_invoice', 'purchase_invoice', 'sales_credit_note', 'purchase_credit_note'] as const;
type InvoiceType = (typeof VALID_TYPES)[number];

export default function NewInvoicePage() {
  const searchParams = useSearchParams();
  const requestedType = searchParams.get('type');
  const creditNoteFor = searchParams.get('credit_note_for') || undefined;
  const aiPrefill = searchParams.get('ai_prefill') === '1';
  const defaultType: InvoiceType = VALID_TYPES.includes(requestedType as InvoiceType)
    ? (requestedType as InvoiceType)
    : 'sales_invoice';

  const prefill = useMemo(() => {
    if (!aiPrefill) return undefined;
    try {
      const raw = sessionStorage.getItem('ai_invoice_draft');
      if (!raw) return undefined;
      sessionStorage.removeItem('ai_invoice_draft');
      return JSON.parse(raw);
    } catch {
      return undefined;
    }
  }, [aiPrefill]);

  return (
    <InvoiceEditor
      mode="create"
      defaultType={defaultType}
      creditNoteForInvoiceId={creditNoteFor}
      prefill={prefill}
    />
  );
}
