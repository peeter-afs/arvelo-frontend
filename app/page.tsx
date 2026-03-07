'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth.store';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, tenant, isLoading } = useAuthStore();

  useEffect(() => {
    // Don't redirect while still loading/hydrating
    if (isLoading) {
      console.log('Still loading auth state...');
      return;
    }

    console.log('Auth state:', { isAuthenticated, hasTenant: !!tenant });

    // Redirect authenticated users to dashboard
    if (isAuthenticated) {
      console.log('Redirecting to dashboard');
      router.push('/dashboard');
    } else {
      // Redirect unauthenticated users to login
      console.log('Redirecting to login');
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading spinner while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
