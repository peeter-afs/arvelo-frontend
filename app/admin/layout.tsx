'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth.store';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // UX guard — backend requirePlatformAdmin is the real enforcement
    if (!user?.is_platform_admin) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--a-bg)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-slate-700" />
      </div>
    );
  }

  if (!isAuthenticated || !user?.is_platform_admin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[var(--a-bg)]">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Platform Admin
            </span>
            <nav className="mt-1 flex gap-4 text-sm font-medium">
              <a href="/admin" className="text-slate-700 hover:text-slate-900">
                Tenants
              </a>
              <a href="/admin/users" className="text-slate-700 hover:text-slate-900">
                Users
              </a>
            </nav>
          </div>
          <a href="/" className="text-sm text-slate-500 hover:text-slate-700">
            Back to app
          </a>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
