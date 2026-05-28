type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

const colors: Record<AccountType, { bg: string; fg: string }> = {
  asset: { bg: '#e4ecf4', fg: '#2c4a6e' },
  liability: { bg: '#f4e8e0', fg: '#7a4a1f' },
  equity: { bg: '#ece4f0', fg: '#5a3974' },
  revenue: { bg: '#e0eee6', fg: '#0e7b5a' },
  expense: { bg: '#f0e4e2', fg: '#8a3a30' },
};

export function accountTypeColors(type: string) {
  return colors[(type as AccountType) || 'asset'] || { bg: 'var(--a-surface-2)', fg: 'var(--a-text-2)' };
}

export function TypeBadge({
  type,
  label,
}: {
  type: string;
  label?: string;
}) {
  const color = accountTypeColors(type);

  return (
    <span
      className="inline-flex rounded px-2 py-1 text-[11px] font-semibold capitalize leading-none"
      style={{ background: color.bg, color: color.fg }}
    >
      {label || type}
    </span>
  );
}
