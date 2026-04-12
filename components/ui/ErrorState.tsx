'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';

type ErrorStateProps = {
  title?: string;
  message?: string;
  onRetry?: () => void;
};

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry
}: ErrorStateProps) {
  return (
    <div className="card p-8 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <AlertCircle className="h-6 w-6 text-[var(--danger)]" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">{title}</h3>
      <p className="text-sm text-[var(--text-secondary)] mb-4 max-w-md mx-auto">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--primary)] border border-[var(--primary)] rounded-lg hover:bg-blue-50 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
      )}
    </div>
  );
}

export function InlineError({ message }: { message: string }) {
  return (
    <div className="rounded-lg border-l-4 border-[var(--danger)] bg-red-50 p-4 flex items-start gap-3">
      <AlertCircle className="h-5 w-5 text-[var(--danger)] flex-shrink-0 mt-0.5" />
      <p className="text-sm text-red-800">{message}</p>
    </div>
  );
}
