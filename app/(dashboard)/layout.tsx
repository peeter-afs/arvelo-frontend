'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
import { CommandBar } from '@/components/layout/CommandBar';
import { StatusFooter } from '@/components/layout/StatusFooter';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { useAuthStore } from '@/lib/stores/auth.store';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { tenant, isAuthenticated, isLoading } = useAuthStore();
  const isCreateCompanyPage = pathname === '/create-company';

  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      return;
    }

    if (!tenant && !isCreateCompanyPage) {
      router.push('/create-company');
    }

    if (tenant && isCreateCompanyPage) {
      router.push('/');
    }
  }, [isAuthenticated, isCreateCompanyPage, isLoading, router, tenant]);

  return (
    <ProtectedRoute>
      {!tenant && isCreateCompanyPage ? (
        <div className="min-h-screen bg-[var(--a-bg)]">
          <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      ) : (
        <>
          <div className="flex h-screen overflow-hidden bg-[var(--a-bg)]">
            <div className="hidden lg:block">
              <Sidebar />
            </div>

            <main className="flex min-w-0 flex-1 flex-col pt-14 lg:pt-0">
              <CommandBar />
              <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 sm:px-6 lg:px-7">
                {children}
              </div>
              <StatusFooter />
            </main>
          </div>

          <MobileNav />
        </>
      )}
    </ProtectedRoute>
  );
}
