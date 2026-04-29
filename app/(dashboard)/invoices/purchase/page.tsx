'use client';

import { useTranslations } from 'next-intl';
import InvoiceListWorkspace from '@/components/invoices/InvoiceListWorkspace';

export default function PurchaseInvoicesPage() {
  const t = useTranslations('invoices');
  return (
    <InvoiceListWorkspace
      invoiceType="purchase_invoice"
      title={t('purchaseList')}
      description={t('purchaseDescription')}
      searchPlaceholder={t('searchPurchaseInvoices')}
    />
  );
}
