'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';

/** Employee self-service: a phone-first page without the bookkeeping shell. */
export default function SelfServiceLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="min-h-dvh bg-[var(--a-bg)]">{children}</div>
    </ProtectedRoute>
  );
}
