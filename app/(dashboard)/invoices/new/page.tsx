'use client';

import { useSearchParams } from 'next/navigation';
import InvoiceEditor from '@/components/invoices/InvoiceEditor';

export default function NewInvoicePage() {
  const searchParams = useSearchParams();
  const requestedType = searchParams.get('type');
  const defaultType = requestedType === 'purchase_invoice' ? 'purchase_invoice' : 'sales_invoice';

  return <InvoiceEditor mode="create" defaultType={defaultType} />;
}
