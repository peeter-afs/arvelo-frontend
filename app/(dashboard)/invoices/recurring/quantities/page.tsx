import { Suspense } from 'react';
import RecurringQuantities from '@/components/invoices/recurring/RecurringQuantities';

export default function RecurringQuantitiesPage() {
  return (
    <Suspense>
      <RecurringQuantities />
    </Suspense>
  );
}
