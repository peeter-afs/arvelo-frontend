'use client';

import InvoiceListWorkspace from '@/components/invoices/InvoiceListWorkspace';

export default function SalesInvoicesPage() {
  return (
    <InvoiceListWorkspace
      invoiceType="sales_invoice"
      title="Sales Invoices"
      description="Track customer invoices, open balances, payment progress, and invoice line detail from the live backend."
      searchPlaceholder="Search sales invoices"
    />
  );
}
