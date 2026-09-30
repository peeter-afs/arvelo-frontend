'use client';

import { useEffect } from 'react';
import { clsx } from 'clsx';
import { X } from 'lucide-react';
import { useTranslations } from 'next-intl';

export function SplitPane({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('grid min-h-0 gap-3 xl:grid-cols-[minmax(0,1.6fr)_380px]', className)}>
      {children}
    </div>
  );
}

/**
 * Detail column of a list/detail view. Below `xl` there is no room for a second
 * column, so when `onMobileClose` is given the panel turns into a full-screen
 * sheet that is shown only while `mobileOpen` (i.e. after the user tapped a row).
 * Without `onMobileClose` it keeps the old behaviour and stacks under the list.
 */
export function SplitPaneDetail({
  children,
  className,
  mobileOpen = false,
  onMobileClose,
  mobileTitle,
}: {
  children: React.ReactNode;
  className?: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  mobileTitle?: React.ReactNode;
}) {
  const tCommon = useTranslations('common');
  const sheet = Boolean(onMobileClose);
  const sheetOpen = sheet && mobileOpen;

  useEffect(() => {
    if (!sheetOpen || window.matchMedia('(min-width: 1280px)').matches) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onMobileClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [sheetOpen, onMobileClose]);

  return (
    <aside
      className={clsx(
        'min-h-0 overflow-hidden rounded-[10px] border border-[var(--a-border)] bg-[var(--a-surface)] xl:sticky xl:top-3 xl:self-start',
        sheet && !sheetOpen && 'max-xl:hidden',
        sheetOpen &&
          'max-xl:fixed max-xl:inset-0 max-xl:z-50 max-xl:flex max-xl:flex-col max-xl:overflow-y-auto max-xl:rounded-none max-xl:border-0 max-xl:pb-[env(safe-area-inset-bottom)]',
        className
      )}
    >
      {sheet && (
        <div className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b border-[var(--a-border)] bg-[var(--a-surface)] px-2 xl:hidden">
          <button
            type="button"
            onClick={onMobileClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-[var(--a-text-2)] hover:bg-[var(--a-surface-2)]"
            aria-label={tCommon('close')}
          >
            <X className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1 truncate text-[14px] font-semibold text-[var(--a-text)]">{mobileTitle}</div>
        </div>
      )}
      {children}
    </aside>
  );
}
