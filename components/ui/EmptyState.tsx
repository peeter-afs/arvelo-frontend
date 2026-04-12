'use client';

import { Inbox, type LucideIcon } from 'lucide-react';

type EmptyStateProps = {
  icon?: LucideIcon;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({
  icon: Icon = Inbox,
  title = 'No data yet',
  message = 'There are no items to display.',
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="card p-12 text-center">
      <div className="mx-auto w-14 h-14 rounded-full bg-[var(--surface-elevated)] flex items-center justify-center mb-4">
        <Icon className="h-7 w-7 text-[var(--text-muted)]" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">{title}</h3>
      <p className="text-sm text-[var(--text-secondary)] mb-5 max-w-sm mx-auto">{message}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-lg transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
