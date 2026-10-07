import type { ReportLine } from '@/lib/api/reports.api';

/** Schema 1 lines an account of each type may be placed on (backend src/services/reportLine.ts). */
export const REPORT_LINES_BY_TYPE: Record<string, ReportLine[]> = {
  asset: ['current_assets', 'fixed_assets'],
  liability: ['current_liabilities', 'long_term_liabilities'],
  equity: ['equity'],
  revenue: ['revenue', 'other_income', 'financial'],
  expense: ['goods_materials_services', 'operating_expenses', 'labour', 'depreciation', 'other_expenses', 'financial', 'income_tax'],
};
