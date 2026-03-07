'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth.store';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireTenant?: boolean;
  requiredRole?: string[];
}

export default function ProtectedRoute({
  children,
  requireTenant = false,
  requiredRole = [],
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, tenant, role, isLoading } = useAuthStore();
  const [loadingTime, setLoadingTime] = useState(0);

  useEffect(() => {
    // Track loading time for timeout message
    if (isLoading) {
      const timer = setInterval(() => {
        setLoadingTime(prev => prev + 1);
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setLoadingTime(0);
    }
  }, [isLoading]);

  useEffect(() => {
    // Don't do anything while still loading
    if (isLoading) {
      return;
    }

    if (!isAuthenticated) {
      // Redirect to login with return URL
      router.push(`/login?returnUrl=${encodeURIComponent(pathname)}`);
      return;
    }

    // Check if tenant is required but not selected
    if (isAuthenticated && requireTenant && !tenant) {
      router.push('/select-tenant');
      return;
    }

    // Check role requirements
    if (
      isAuthenticated &&
      requiredRole.length > 0 &&
      role &&
      !requiredRole.includes(role)
    ) {
      router.push('/unauthorized');
      return;
    }
  }, [isAuthenticated, tenant, role, isLoading, requireTenant, requiredRole, router, pathname]);

  // Show loading state with skeleton layout
  if (isLoading) {
    return (
      <>
        {/* Desktop Skeleton */}
        <div className="hidden lg:flex h-screen bg-slate-50">
          {/* Sidebar skeleton */}
          <div className="w-64 bg-slate-900">
            <div className="p-6">
              <div className="h-8 w-32 bg-slate-800 rounded-lg animate-pulse mb-8"></div>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="mb-2">
                  <div className="h-10 bg-slate-800 rounded-lg animate-pulse"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Main content skeleton */}
          <div className="flex-1 p-8">
            {/* Header skeleton */}
            <div className="mb-8">
              <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse mb-2"></div>
              <div className="h-4 w-96 bg-slate-100 rounded-lg animate-pulse"></div>
            </div>

            {/* Stat cards skeleton */}
            <div className="grid grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 bg-slate-100 rounded-xl animate-pulse"></div>
              ))}
            </div>

            {/* Table skeleton */}
            <div className="h-64 bg-slate-100 rounded-xl animate-pulse"></div>
          </div>
        </div>

        {/* Mobile Skeleton */}
        <div className="lg:hidden min-h-screen bg-slate-50">
          {/* Top bar skeleton */}
          <div className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between">
            <div className="h-6 w-6 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-6 w-32 bg-slate-200 rounded-lg animate-pulse"></div>
            <div className="h-8 w-8 bg-slate-200 rounded-full animate-pulse"></div>
          </div>

          {/* Content area */}
          <div className="p-4">
            {/* Header skeleton */}
            <div className="mb-6">
              <div className="h-7 w-40 bg-slate-200 rounded-lg animate-pulse mb-2"></div>
              <div className="h-4 w-60 bg-slate-100 rounded-lg animate-pulse"></div>
            </div>

            {/* Stat cards skeleton - 2 columns on mobile */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse"></div>
              ))}
            </div>

            {/* Table/List skeleton */}
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-slate-100 rounded-lg animate-pulse"></div>
              ))}
            </div>
          </div>
        </div>

        {/* Loading timeout message */}
        {loadingTime > 5 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-4 text-center z-50">
            <p className="text-sm text-slate-600 mb-2">Taking longer than expected...</p>
            <button
              onClick={() => window.location.reload()}
              className="text-sm text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium"
            >
              Try refreshing
            </button>
          </div>
        )}
      </>
    );
  }

  // Don't render children until authentication is verified
  if (!isAuthenticated) {
    return null;
  }

  // Don't render if tenant is required but not selected
  if (requireTenant && !tenant) {
    return null;
  }

  // Don't render if role requirements not met
  if (requiredRole.length > 0 && (!role || !requiredRole.includes(role))) {
    return null;
  }

  return <>{children}</>;
}