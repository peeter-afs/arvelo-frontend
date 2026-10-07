'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
import { CommandBar } from '@/components/layout/CommandBar';
import { StatusFooter } from '@/components/layout/StatusFooter';
import { TwoFactorNotice } from '@/components/layout/TwoFactorNotice';
import { DemoNotice } from '@/components/layout/DemoNotice';
import { AssistantPanel } from '@/components/assistant/AssistantPanel';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { TwoFactorGate } from '@/components/auth/TwoFactorGate';
import { useAuthStore } from '@/lib/stores/auth.store';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { tenant, role, isAuthenticated, isLoading } = useAuthStore();
  const isEmployee = role === 'employee';
  const isCreateCompanyPage = pathname === '/create-company';
  // The invoice preview has its own header with breadcrumb and actions (design_handoff_arve_eelvaade).
  const hideCommandBar = /^\/invoices\/[^/]+\/preview$/.test(pathname || '');

  useEffect(() => {
    if (isLoading || !isAuthenticated) {
      return;
    }

    // Employee accounts only have the self-service view
    if (isEmployee) {
      router.replace('/minu');
      return;
    }

    if (!tenant && !isCreateCompanyPage) {
      router.push('/create-company');
    }

    if (tenant && isCreateCompanyPage) {
      router.push('/');
    }
  }, [isAuthenticated, isCreateCompanyPage, isEmployee, isLoading, router, tenant]);

  // Don't mount the bookkeeping shell (it loads company data) for an employee being redirected
  if (isEmployee) return null;

  return (
    <ProtectedRoute>
      {!tenant && isCreateCompanyPage ? (
        <div className="min-h-screen bg-[var(--a-bg)]">
          <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      ) : (
        <TwoFactorGate page={children}>
          <div className="flex h-screen overflow-hidden bg-[var(--a-bg)] print:block print:h-auto print:overflow-visible print:bg-white">
            <div className="hidden lg:block print:hidden">
              <Sidebar />
            </div>

            <main className="flex min-w-0 flex-1 flex-col pt-14 lg:pt-0 print:block print:pt-0">
              <div className={hideCommandBar ? 'hidden' : 'app-commandbar print:hidden'}><CommandBar assistantToggle /></div>
              <div className="min-h-0 flex-1 overflow-y-auto compact:lg:px-4 compact:lg:pb-2 px-4 pt-4 sm:px-6 lg:px-7 lg:pb-6 lg:pt-0 max-lg:after:block max-lg:after:h-6 max-lg:after:content-[''] print:overflow-visible print:p-0">
                <DemoNotice />
                <TwoFactorNotice />
                {children}
              </div>
              <div className="print:hidden"><StatusFooter /></div>
            </main>
          </div>

          <div className="print:hidden">
            <MobileNav />
            <AssistantPanel />
          </div>
        </TwoFactorGate>
      )}
    </ProtectedRoute>
  );
}
