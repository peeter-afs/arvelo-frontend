import { ArrowUpRight, Check } from 'lucide-react';
import { clsx } from 'clsx';

export function Stat({
  label,
  value,
  subtle,
  delta,
  tone,
  check = false,
  className,
}: {
  label: string;
  value: React.ReactNode;
  subtle?: React.ReactNode;
  delta?: string;
  tone?: 'default' | 'warning' | 'positive' | 'danger';
  check?: boolean;
  className?: string;
}) {
  return (
    <div className={clsx('min-w-0 px-4 py-1 first:pl-0', className)}>
      <div className="flex items-center gap-2">
        <div className="micro truncate text-[var(--a-text-3)]">{label}</div>
        {delta && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--a-pos-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--a-pos)]">
            <ArrowUpRight className="h-3 w-3" />
            {delta}
          </span>
        )}
        {check && <Check className="h-3.5 w-3.5 text-[var(--a-pos)]" />}
      </div>
      <div
        className={clsx(
          'mt-2 truncate font-mono text-2xl font-semibold leading-7 tabular-nums',
          tone === 'warning' && 'text-[var(--a-warn)]',
          tone === 'positive' && 'text-[var(--a-pos)]',
          tone === 'danger' && 'text-[var(--a-neg)]',
          (!tone || tone === 'default') && 'text-[var(--a-text)]'
        )}
      >
        {value}
      </div>
      {subtle && <div className="mt-1 truncate text-[11.5px] text-[var(--a-text-3)]">{subtle}</div>}
    </div>
  );
}
