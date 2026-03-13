'use client';

import { useParams } from 'next/navigation';
import InvoiceEditor from '@/components/invoices/InvoiceEditor';

export default function EditInvoicePage() {
  const params = useParams<{ id: string }>();
  return <InvoiceEditor mode="edit" invoiceId={params.id} />;
}
