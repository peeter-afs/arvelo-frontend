import { clsx } from 'clsx';

export function Kbd({
  children,
  className,
  inverse = false,
}: {
  children: React.ReactNode;
  className?: string;
  inverse?: boolean;
}) {
  return (
    <kbd
      className={clsx(
        'inline-flex h-[17px] min-w-[17px] items-center justify-center rounded-[3px] border px-[5px] font-mono text-[10px] font-medium leading-none tabular-nums',
        inverse
          ? 'border-white/25 bg-white/20 text-white'
          : 'border-[var(--a-border)] bg-[var(--a-surface-2)] text-[var(--a-text-2)]',
        className
      )}
    >
      {children}
    </kbd>
  );
}
