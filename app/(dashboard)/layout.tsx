'use client';

import Sidebar from '@/components/layout/Sidebar';
import MobileNav from '@/components/layout/MobileNav';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      {/* Desktop Layout (lg and above) */}
      <div className="flex h-screen bg-slate-50">
        {/* Desktop Sidebar - hidden on mobile */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto pt-14 lg:pt-0">
          <div className="p-4 sm:p-6 lg:p-8 xl:px-10 pb-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Navigation - only visible below lg */}
      <MobileNav />
    </ProtectedRoute>
  );
}
