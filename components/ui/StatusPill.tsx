import { clsx } from 'clsx';

type StatusTone = 'posted' | 'draft' | 'open' | 'sent' | 'paid' | 'overdue' | 'neutral' | 'danger' | 'warning' | 'success';

const toneStyles: Record<StatusTone, { color: string; bg?: string; border?: string }> = {
  posted: { color: 'var(--a-pos)', border: 'var(--a-border)' },
  draft: { color: 'var(--a-warn)', bg: 'var(--a-warn-soft)' },
  open: { color: 'var(--a-text-2)', border: 'var(--a-border)' },
  sent: { color: 'var(--a-text-2)', border: 'var(--a-border)' },
  paid: { color: 'var(--a-pos)', border: 'var(--a-border)' },
  overdue: { color: 'var(--a-neg)', bg: 'var(--a-neg-soft)' },
  neutral: { color: 'var(--a-text-2)', border: 'var(--a-border)' },
  danger: { color: 'var(--a-neg)', bg: 'var(--a-neg-soft)' },
  warning: { color: 'var(--a-warn)', bg: 'var(--a-warn-soft)' },
  success: { color: 'var(--a-pos)', bg: 'var(--a-pos-soft)' },
};

export function StatusPill({
  children,
  tone = 'neutral',
  className,
  dot = true,
  meta,
}: {
  children: React.ReactNode;
  tone?: StatusTone;
  className?: string;
  dot?: boolean;
  /** Optional trailing chip, e.g. days-past-due "13d" on an overdue pill. */
  meta?: React.ReactNode;
}) {
  const styles = toneStyles[tone];

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase leading-none',
        className
      )}
      style={{
        color: styles.color,
        background: styles.bg || 'transparent',
        border: `1px solid ${styles.border || 'transparent'}`,
      }}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
      {meta != null && (
        <span className="ml-0.5 rounded-full bg-current/15 px-1.5 py-px font-mono text-[10px] tabular-nums leading-none">
          {meta}
        </span>
      )}
    </span>
  );
}
