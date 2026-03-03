'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth.store';
import Sidebar from '@/components/layout/Sidebar';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { tenant } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    // Redirect to tenant selection if no tenant
    if (!tenant) {
      router.push('/select-tenant');
    }
  }, [tenant, router]);

  return (
    <ProtectedRoute requireTenant>
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="p-8">
            {children}
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}