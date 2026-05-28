'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';

function currentPeriod() {
  return new Intl.DateTimeFormat('en-GB', { month: 'short', year: 'numeric' }).format(new Date());
}

function viewName(pathname: string) {
  if (pathname.includes('/accounting/journal')) return 'Transactions';
  if (pathname.includes('/accounting/accounts')) return 'Chart';
  if (pathname.includes('/accounting/partners')) return 'Partners';
  if (pathname.includes('/invoices')) return 'Invoices';
  if (pathname.includes('/reports')) return 'Reports';
  if (pathname.includes('/settings')) return 'Settings';
  return 'Workspace';
}

export function StatusFooter() {
  const pathname = usePathname();
  const items = useMemo(() => {
    return {
      period: currentPeriod(),
      view: viewName(pathname || '/'),
    };
  }, [pathname]);

  return (
    <footer className="hidden border-t border-[var(--a-border)] bg-[var(--a-surface-2)] px-3.5 py-2 font-mono text-[11px] text-[var(--a-text-3)] lg:flex">
      <div className="flex min-w-0 flex-1 items-center gap-3.5 overflow-hidden">
        <span>
          BOOKS <span className="text-[var(--a-text)]">{items.period}</span>
        </span>
        <span>
          VIEWING <span className="text-[var(--a-text)]">{items.view}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-[var(--a-pos)]">
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          Balanced
        </span>
        <span>SYNC <span className="text-[var(--a-text)]">live</span></span>
        <span className="flex-1" />
        <span>⌘K Search</span>
        <span>⏎ Open</span>
      </div>
    </footer>
  );
}
