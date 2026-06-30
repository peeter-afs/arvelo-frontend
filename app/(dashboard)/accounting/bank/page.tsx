import { Suspense } from 'react';
import { BankWorkspace } from '@/components/accounting/bank/BankWorkspace';

export default function BankPage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">…</div>}>
      <BankWorkspace />
    </Suspense>
  );
}
