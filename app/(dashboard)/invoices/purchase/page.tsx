'use client';

import InvoiceListWorkspace from '@/components/invoices/InvoiceListWorkspace';

export default function PurchaseInvoicesPage() {
  return (
    <InvoiceListWorkspace
      invoiceType="purchase_invoice"
      title="Purchase Invoices"
      description="Review supplier invoices, move them through approval states, and post approved invoices into payable state."
      searchPlaceholder="Search purchase invoices"
    />
  );
}
