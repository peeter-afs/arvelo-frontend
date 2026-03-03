'use client';

import { useEffect } from 'react';
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

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Redirect to login with return URL
      router.push(`/login?returnUrl=${encodeURIComponent(pathname)}`);
      return;
    }

    // Check if tenant is required but not selected
    if (!isLoading && isAuthenticated && requireTenant && !tenant) {
      router.push('/select-tenant');
      return;
    }

    // Check role requirements
    if (
      !isLoading &&
      isAuthenticated &&
      requiredRole.length > 0 &&
      role &&
      !requiredRole.includes(role)
    ) {
      router.push('/unauthorized');
      return;
    }
  }, [isAuthenticated, tenant, role, isLoading, requireTenant, requiredRole, router, pathname]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
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