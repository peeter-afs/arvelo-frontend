'use client';

import { useParams } from 'next/navigation';
import InvoicePreview from '@/components/invoices/InvoicePreview';

export default function InvoicePreviewPage() {
  const params = useParams<{ id: string }>();
  return <InvoicePreview key={params.id} id={params.id} />;
}
