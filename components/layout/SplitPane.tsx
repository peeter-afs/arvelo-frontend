import { clsx } from 'clsx';

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

export function SplitPaneDetail({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <aside
      className={clsx(
        'min-h-0 overflow-hidden rounded-[10px] border border-[var(--a-border)] bg-[var(--a-surface)] xl:sticky xl:top-3 xl:self-start',
        className
      )}
    >
      {children}
    </aside>
  );
}
