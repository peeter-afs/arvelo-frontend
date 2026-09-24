'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import RecurringTemplateEditor from '@/components/invoices/recurring/RecurringTemplateEditor';

export default function RecurringTemplatePage() {
  const params = useParams<{ id: string }>();
  return (
    <Suspense>
      <RecurringTemplateEditor key={params.id} templateId={params.id} />
    </Suspense>
  );
}
