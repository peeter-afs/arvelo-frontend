export const TASK_ROUTES = [
  '/accounting/bank-review',
  '/accounting/bank-import',
  // Halo Pro consolidates bank import and review into this tabbed workspace.
  '/accounting/bank',
  '/accounting/opening-balances',
  '/accounting/journal/new',
  '/accounting/journal/[id]',
  '/accounting/payments',
  '/accounting/payment-batches',
  '/invoices/sales/new',
  '/invoices/sales/[id]',
  '/invoices/purchase/new',
  '/invoices/purchase/[id]',
  // Halo Pro uses these shared invoice editor routes for both sales and purchases.
  '/invoices/new',
  '/invoices/[id]/edit',
  '/invoices/[id]/preview',
  '/invoices/purchase-approvals',
  '/invoices/purchase-imports',
  '/invoices/recurring',
  '/invoices/reminders',
  '/reports/balance-sheet',
  '/reports/profit-loss',
  '/reports/trial-balance',
  '/reports/turnover',
  '/reports/general-ledger',
  '/reports/vat',
  '/reports/aging',
] as const;

const NON_TASK_ROUTES = new Set([
  '/',
  '/accounting/accounts',
  '/accounting/partners',
  '/accounting/fiscal-years',
  '/accounting/exchange-rates',
  '/invoices',
  '/invoices/sales',
  '/invoices/purchase',
  '/assets',
]);

function matchesRoutePattern(pathname: string, pattern: string) {
  const pathSegments = pathname.split('/').filter(Boolean);
  const patternSegments = pattern.split('/').filter(Boolean);

  if (pathSegments.length < patternSegments.length) return false;

  return patternSegments.every((segment, index) =>
    /^\[[^/]+\]$/.test(segment) || segment === pathSegments[index]
  );
}

export function isTaskRoute(pathname: string): boolean {
  const normalizedPath = pathname !== '/' ? pathname.replace(/\/+$/, '') : pathname;

  if (NON_TASK_ROUTES.has(normalizedPath) || normalizedPath.startsWith('/settings/')) {
    return false;
  }

  return TASK_ROUTES.some((route) => matchesRoutePattern(normalizedPath, route));
}
