import { clsx } from 'clsx';
import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'default' | 'primary' | 'plain' | 'danger';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({
  className,
  variant = 'default',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={clsx(
        'inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-[13px] font-medium outline-none transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' &&
          'border border-[var(--a-accent)] bg-[var(--a-accent)] text-[var(--a-accent-on)] hover:bg-[#e74324]',
        variant === 'default' &&
          'border border-[var(--a-border)] bg-[var(--a-surface)] text-[var(--a-text-2)] hover:bg-[var(--a-surface-2)] hover:text-[var(--a-text)]',
        variant === 'plain' &&
          'border border-transparent bg-transparent text-[var(--a-text-2)] hover:bg-[var(--a-surface-2)] hover:text-[var(--a-text)]',
        variant === 'danger' &&
          'border border-[var(--a-neg-soft)] bg-[var(--a-neg-soft)] text-[var(--a-neg)] hover:border-[var(--a-neg)]',
        className
      )}
      {...props}
    />
  );
}
