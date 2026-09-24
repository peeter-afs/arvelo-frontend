import { Suspense } from 'react';
import RecurringTemplateEditor from '@/components/invoices/recurring/RecurringTemplateEditor';

export default function NewRecurringTemplatePage() {
  return (
    <Suspense>
      <RecurringTemplateEditor />
    </Suspense>
  );
}
