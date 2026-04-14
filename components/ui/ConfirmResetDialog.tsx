'use client';

import { useState } from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { AlertTriangle } from 'lucide-react';

type ConfirmResetDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  requiredText: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
};

export function ConfirmResetDialog({
  open,
  onOpenChange,
  title,
  description,
  requiredText,
  confirmLabel = 'Reset',
  onConfirm,
}: ConfirmResetDialogProps) {
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const isValid = inputValue === requiredText;

  const handleConfirm = async () => {
    if (!isValid) return;
    setLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setLoading(false);
      setInputValue('');
    }
  };

  const handleOpenChange = (v: boolean) => {
    onOpenChange(v);
    if (!v) setInputValue('');
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={handleOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-black/40 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[var(--surface)] p-6 shadow-xl">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-[var(--danger)]" />
            </div>
            <div className="flex-1">
              <AlertDialog.Title className="text-lg font-semibold text-[var(--text-primary)]">
                {title}
              </AlertDialog.Title>
              <AlertDialog.Description className="mt-2 text-sm text-[var(--text-secondary)]">
                {description}
              </AlertDialog.Description>
              <div className="mt-4">
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  Type <span className="font-mono font-bold text-[var(--danger)]">{requiredText}</span> to confirm:
                </label>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  placeholder={requiredText}
                  autoFocus
                />
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <AlertDialog.Cancel asChild>
              <button className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] border border-[var(--border)] rounded-lg hover:bg-[var(--surface-elevated)] transition-colors">
                Cancel
              </button>
            </AlertDialog.Cancel>
            <button
              onClick={handleConfirm}
              disabled={!isValid || loading}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-[var(--danger)] hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : confirmLabel}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
