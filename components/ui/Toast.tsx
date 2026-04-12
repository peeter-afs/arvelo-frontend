'use client';

import toast, { Toaster as HotToaster } from 'react-hot-toast';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export function Toaster() {
  return (
    <HotToaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: 'var(--surface)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
          borderRadius: '0.75rem',
          padding: '12px 16px',
          fontSize: '0.875rem',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
          maxWidth: '420px',
        },
      }}
    />
  );
}

export const showToast = {
  success: (message: string) =>
    toast.custom((t) => (
      <div
        className={`flex items-start gap-3 card px-4 py-3 shadow-lg max-w-sm ${
          t.visible ? 'animate-in slide-in-from-top-2' : 'animate-out fade-out'
        }`}
      >
        <CheckCircle2 className="h-5 w-5 text-[var(--success)] flex-shrink-0 mt-0.5" />
        <p className="text-sm text-[var(--text-primary)] flex-1">{message}</p>
        <button onClick={() => toast.dismiss(t.id)} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
          <X className="h-4 w-4" />
        </button>
      </div>
    )),
  error: (message: string) =>
    toast.custom((t) => (
      <div
        className={`flex items-start gap-3 card px-4 py-3 shadow-lg max-w-sm border-l-4 border-l-[var(--danger)] ${
          t.visible ? 'animate-in slide-in-from-top-2' : 'animate-out fade-out'
        }`}
      >
        <AlertCircle className="h-5 w-5 text-[var(--danger)] flex-shrink-0 mt-0.5" />
        <p className="text-sm text-[var(--text-primary)] flex-1">{message}</p>
        <button onClick={() => toast.dismiss(t.id)} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
          <X className="h-4 w-4" />
        </button>
      </div>
    )),
  info: (message: string) =>
    toast.custom((t) => (
      <div
        className={`flex items-start gap-3 card px-4 py-3 shadow-lg max-w-sm ${
          t.visible ? 'animate-in slide-in-from-top-2' : 'animate-out fade-out'
        }`}
      >
        <Info className="h-5 w-5 text-[var(--primary)] flex-shrink-0 mt-0.5" />
        <p className="text-sm text-[var(--text-primary)] flex-1">{message}</p>
        <button onClick={() => toast.dismiss(t.id)} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
          <X className="h-4 w-4" />
        </button>
      </div>
    )),
};
