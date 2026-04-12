'use client';

import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

type FormFieldWrapperProps = {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  htmlFor?: string;
};

export function FormField({ label, error, hint, required, children, htmlFor }: FormFieldWrapperProps) {
  return (
    <div>
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
          {label}
          {required && <span className="text-[var(--danger)] ml-0.5">*</span>}
        </label>
      )}
      {children}
      {hint && !error && (
        <p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p>
      )}
      {error && (
        <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>
      )}
    </div>
  );
}

const inputBaseClass = 'w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:ring-4 focus:ring-blue-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

const inputErrorClass = 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-red-500/10';

export const FormInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { error?: boolean }
>(({ error, className = '', ...props }, ref) => (
  <input
    ref={ref}
    className={`${inputBaseClass} ${error ? inputErrorClass : ''} ${className}`}
    style={{ fontSize: '16px' }}
    {...props}
  />
));
FormInput.displayName = 'FormInput';

export const FormSelect = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }
>(({ error, className = '', children, ...props }, ref) => (
  <select
    ref={ref}
    className={`${inputBaseClass} ${error ? inputErrorClass : ''} ${className}`}
    {...props}
  >
    {children}
  </select>
));
FormSelect.displayName = 'FormSelect';

export const FormTextarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }
>(({ error, className = '', ...props }, ref) => (
  <textarea
    ref={ref}
    className={`${inputBaseClass} ${error ? inputErrorClass : ''} min-h-[80px] ${className}`}
    style={{ fontSize: '16px' }}
    {...props}
  />
));
FormTextarea.displayName = 'FormTextarea';
