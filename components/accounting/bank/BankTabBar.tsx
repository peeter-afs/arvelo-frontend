'use client';

import type { ComponentType, CSSProperties } from 'react';

export type BankTab = 'import' | 'review' | 'reconcile';

type TabDef = {
  id: BankTab;
  label: string;
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  count?: number;
  title?: string;
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
    <div className="flex h-7 gap-1 rounded-lg border border-[var(--a-border)] bg-[var(--a-surface-2)] p-0.5">
      {tabs.map((tab) => {
        const on = tab.id === active;
        const Icon = tab.icon;
        const showCount = typeof tab.count === 'number' && tab.count > 0;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            aria-current={on ? 'page' : undefined}
            title={tab.title}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 text-[12.5px] font-semibold transition-colors"
            style={{
              background: on ? 'var(--a-surface)' : 'transparent',
              border: on ? '1px solid var(--a-border)' : '1px solid transparent',
            }}
          >
            <Icon className="h-3.5 w-3.5" style={{ color: on ? 'var(--a-accent)' : 'var(--a-text-3)' }} />
            <span
              className="text-[12.5px] font-semibold"
              style={{ color: on ? 'var(--a-text)' : 'var(--a-text-2)' }}
            >
              {tab.label}
            </span>
            {showCount && (
              <span
                className="ml-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full px-1 py-0 text-[10px] font-semibold tabular-nums"
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
