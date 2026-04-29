'use client';

import { useTranslations } from 'next-intl';
import InvoiceListWorkspace from '@/components/invoices/InvoiceListWorkspace';

export default function SalesInvoicesPage() {
  const t = useTranslations('invoices');
  return (
    <InvoiceListWorkspace
      invoiceType="sales_invoice"
      title={t('salesList')}
      description={t('salesDescription')}
      searchPlaceholder={t('searchSalesInvoices')}
    />
  );
}
