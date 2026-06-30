'use client';

import type { ComponentType, CSSProperties } from 'react';

export type BankTab = 'import' | 'review' | 'reconcile';

type TabDef = {
  id: BankTab;
  label: string;
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  count?: number;
};

export function BankTabBar({
  active,
  onChange,
  tabs,
}: {
  active: BankTab;
  onChange: (tab: BankTab) => void;
  tabs: TabDef[];
}) {
  return (
    <div className="flex gap-2 rounded-[10px] border border-[var(--a-border)] bg-[var(--a-surface-2)] p-1">
      {tabs.map((tab) => {
        const on = tab.id === active;
        const Icon = tab.icon;
        const showCount = typeof tab.count === 'number' && tab.count > 0;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            aria-current={on ? 'page' : undefined}
            className="flex flex-1 items-center justify-center gap-2 rounded-[7px] px-3.5 py-2.5 transition-colors"
            style={{
              background: on ? 'var(--a-surface)' : 'transparent',
              border: on ? '1px solid var(--a-border)' : '1px solid transparent',
            }}
          >
            <Icon className="h-4 w-4" style={{ color: on ? 'var(--a-accent)' : 'var(--a-text-3)' }} />
            <span
              className="text-[13.5px] font-semibold"
              style={{ color: on ? 'var(--a-text)' : 'var(--a-text-2)' }}
            >
              {tab.label}
            </span>
            {showCount && (
              <span
                className="ml-0.5 inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums"
                style={{
                  background: on ? 'var(--a-accent)' : 'var(--a-surface-3, #e5e7eb)',
                  color: on ? '#fff' : 'var(--a-text-2)',
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
