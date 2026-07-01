'use client';

import { type ReactNode } from 'react';

/**
 * Shared presentational helpers for the settings tabs. These used to live at the
 * bottom of the 3,400-line settings/page.tsx; they're hoisted here so each
 * extracted tab component can reuse them without duplicating markup.
 */

export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full h-11 px-4 border border-slate-200 rounded-lg focus:outline-none focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 transition-all"
        style={{ fontSize: '16px' }}
      />
    </div>
  );
}

export function LabeledField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="text-sm font-medium text-slate-700 mb-1.5">{label}</div>
      {children}
    </label>
  );
}

// Back-compat aliases for the two identical field wrappers the page used.
export const BillingField = LabeledField;
export const SettingsField = LabeledField;

export function ReportStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-lg font-semibold text-slate-900">{value}</div>
    </div>
  );
}

/**
 * Per-tab success/error banner. Each extracted tab owns its own feedback so a
 * message raised on one tab can never linger while viewing another (the old
 * page shared a single banner mutated from ~50 call sites).
 */
export function TabFeedback({ error, success }: { error?: string | null; success?: string | null }) {
  if (!error && !success) return null;
  return (
    <>
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {success}
        </div>
      )}
    </>
  );
}

/** Standard heading block used at the top of each settings tab. */
export function TabHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-1">{title}</h2>
      {description && <p className="text-sm text-slate-500">{description}</p>}
    </div>
  );
}
