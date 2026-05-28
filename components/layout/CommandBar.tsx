'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronRight, Command } from 'lucide-react';
import { Kbd } from '@/components/ui/Kbd';

const labelMap: Record<string, string> = {
  accounting: 'Books',
  accounts: 'Chart of accounts',
  journal: 'Transactions',
  partners: 'Partners',
  invoices: 'Invoices',
  sales: 'Sales',
  purchase: 'Bills',
  reports: 'Reports',
  settings: 'Settings',
  assets: 'Assets',
  new: 'New',
  edit: 'Edit',
  preview: 'Preview',
};

function humanize(segment: string) {
  if (/^[0-9a-f-]{12,}$/i.test(segment)) return 'Record';
  return labelMap[segment] || segment.replace(/-/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

function crumbsForPath(pathname: string) {
  if (pathname === '/') return ['Dashboard', 'Today'];
  const parts = pathname.split('/').filter(Boolean);
  const crumbs = parts.map(humanize);
  if (crumbs[0] === 'Books' && crumbs[1]) return [crumbs[1], ...crumbs.slice(2)];
  return crumbs.length ? crumbs : ['Dashboard'];
}

export function CommandBar({
  crumbs,
  actions,
  hints = true,
}: {
  crumbs?: string[];
  actions?: React.ReactNode;
  hints?: boolean;
}) {
  const pathname = usePathname();
  const computedCrumbs = useMemo(() => crumbs || crumbsForPath(pathname || '/'), [crumbs, pathname]);

  return (
    <div className="flex items-center gap-2 px-4 pb-3 pt-4 sm:px-6 lg:px-7">
      <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-[10px] border border-[var(--a-border)] bg-[var(--a-surface)] px-3.5 py-2 text-[13px] text-[var(--a-text-2)]">
        <Command className="h-3.5 w-3.5 shrink-0 text-[var(--a-accent)]" />
        {computedCrumbs.map((crumb, index) => (
          <span key={`${crumb}-${index}`} className="contents">
            {index > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-[var(--a-text-3)]" />}
            <span
              className={index === 0 ? 'truncate font-medium text-[var(--a-text)]' : 'truncate text-[var(--a-text-2)]'}
            >
              {crumb}
            </span>
          </span>
        ))}
        <span className="flex-1" />
        {hints && (
          <span className="hidden items-center gap-1.5 text-[var(--a-text-3)] md:inline-flex">
            <span>Press</span>
            <Kbd>/</Kbd>
            <span>to filter</span>
            <span className="mx-1 h-3.5 w-px bg-[var(--a-border)]" />
          </span>
        )}
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </div>
      {actions && <div className="hidden shrink-0 items-center gap-2 lg:flex">{actions}</div>}
    </div>
  );
}
