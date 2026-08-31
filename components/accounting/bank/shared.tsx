import type { ComponentType, ReactNode } from 'react';

type Tone = 'neutral' | 'success' | 'warning';

type IconComponent = ComponentType<{ className?: string }>;

export type BankInlineSummaryData = {
  cells: Array<{ label: string; value: string | number; color?: string }>;
  progress?: { label: string; done: number; total: number };
};

export function BankInlineSummary({ data }: { data?: BankInlineSummaryData }) {
  if (!data) return null;
  return (
    <div className="flex min-w-0 items-center gap-3 overflow-hidden">
      {data.cells.map((cell, index) => (
        <div key={`${cell.label}-${index}`} className={`flex items-baseline gap-1.5 whitespace-nowrap ${index > 0 ? 'border-l border-slate-200 pl-3' : ''}`}>
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">{cell.label}</span>
          <span className="font-mono text-[15px] font-bold tabular-nums text-slate-900" style={cell.color ? { color: cell.color } : undefined}>{cell.value}</span>
        </div>
      ))}
      {data.progress && (
        <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
          <span className="whitespace-nowrap font-mono text-[12px] font-semibold tabular-nums text-slate-700">{data.progress.done}/{data.progress.total}</span>
          <div className="h-1 w-[120px] overflow-hidden rounded-full bg-slate-200">
            <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${data.progress.total ? Math.round((data.progress.done / data.progress.total) * 100) : 0}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

const ICON_TONE: Record<Tone, string> = {
  success: 'bg-emerald-50 text-emerald-600',
  warning: 'bg-amber-50 text-amber-600',
  neutral: 'bg-slate-100 text-slate-700',
};

export function SummaryCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: ComponentType<{ className?: string }>;
  tone: Tone;
}) {
  return (
    <div className="card p-5">
      <div className="mb-3 flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${ICON_TONE[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
      {hint && <div className="mt-1 font-mono text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export function SummaryMetric({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  tone?: 'neutral' | 'success';
}) {
  return (
    <div className="card p-5">
      <div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${tone === 'success' ? 'text-emerald-700' : 'text-slate-900'}`}>{value}</div>
    </div>
  );
}

export function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm text-slate-800">{value}</div>
    </div>
  );
}

export function formatLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

// Muted explainer that fills the space to the right of the tab bar. Fixed
// height so 1-line and 2-line notes keep the header height identical.
export function BankTabNote({ icon: Icon, children }: { icon: IconComponent; children: ReactNode }) {
  return (
    <div className="flex h-[52px] items-center justify-end gap-2 overflow-hidden">
      <Icon className="h-4 w-4 flex-shrink-0 text-slate-400" />
      <span className="text-right text-[12.5px] leading-snug text-slate-500">{children}</span>
    </div>
  );
}

// Single horizontal summary bar shared by all three bank tabs — one fixed-height
// box so switching tabs never shifts the layout.
export function BankSummaryStrip({
  icon: Icon,
  tone,
  cells,
  trailing,
}: {
  icon: IconComponent;
  tone: Tone;
  cells: Array<{ label: string; value: string | number; sub?: string; color?: string }>;
  trailing?: ReactNode;
}) {
  return (
    <div className="card flex h-20 items-center px-5">
      <div className={`mr-5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${ICON_TONE[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      {cells.map((cell) => (
        <div key={cell.label} className="mr-5 border-r border-slate-200 pr-5">
          <div className="whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.1em] text-slate-500">
            {cell.label}
          </div>
          <div
            className="whitespace-nowrap font-mono text-xl font-semibold tabular-nums text-slate-900"
            style={cell.color ? { color: cell.color } : undefined}
          >
            {cell.value}
          </div>
          {cell.sub && <div className="whitespace-nowrap text-[10.5px] text-slate-500">{cell.sub}</div>}
        </div>
      ))}
      <div className="flex-1" />
      {trailing}
    </div>
  );
}

// Small progress widget for the summary strip's trailing slot.
export function BankProgress({
  label,
  done,
  total,
  tone = 'accent',
}: {
  label: string;
  done: number;
  total: number;
  tone?: 'accent' | 'success';
}) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const filled = tone === 'success' || pct === 100 ? 'bg-emerald-500' : 'bg-[var(--primary)]';
  return (
    <div className="min-w-[190px]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-slate-500">{label}</span>
        <span className="font-mono text-xs font-semibold tabular-nums text-slate-700">
          {done}/{total} · {pct}%
        </span>
      </div>
      <div className="mt-1.5 h-[7px] overflow-hidden rounded-full border border-slate-200 bg-slate-100">
        <div
          className={`h-full rounded-full transition-[width] duration-200 ${filled}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// Fixed-height slot for each tab's filter controls so the filter row sits at
// the same vertical position on every tab.
export function BankFilterRow({ children }: { children: ReactNode }) {
  return <div className="flex h-[38px] flex-shrink-0 items-center gap-3">{children}</div>;
}

// Bottom action bar: status text on the left, action buttons on the right.
export function BankFooterBar({ status, children }: { status: ReactNode; children: ReactNode }) {
  return (
    <div className="card flex h-11 flex-shrink-0 items-center gap-3 px-4">
      <div className="text-xs text-slate-500">{status}</div>
      <div className="flex-1" />
      {children}
    </div>
  );
}
