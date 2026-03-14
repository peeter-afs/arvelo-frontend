'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
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
        <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_45%,#f8fafc_100%)]">
          <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      ) : (
        <>
          <div className="flex h-screen bg-slate-50">
            <div className="hidden lg:block transition-all duration-300">
              <Sidebar />
            </div>

            <main className="flex-1 overflow-y-auto pt-14 lg:pt-0 transition-all duration-300">
              <div className="p-4 pb-6 sm:p-6 lg:p-8 xl:px-10">
                {children}
              </div>
            </main>
          </div>

          <MobileNav />
        </>
      )}
    </ProtectedRoute>
  );
}
