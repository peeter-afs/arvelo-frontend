import apiClient from './client';

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type BalanceSheetLine = {
  account_code: string;
  account_name: string;
  account_type: string;
  balance: number;
  /** Balance at the comparison date; present only when one was requested. */
  compare_balance?: number;
  /** Computed (non-ledger) equity lines: open P&L result rolled into equity. */
  special?: 'current_year_earnings' | 'prior_period_earnings';
};

export type BalanceSheetData = {
  assets: BalanceSheetLine[];
  liabilities: BalanceSheetLine[];
  equity: BalanceSheetLine[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  compareTotalAssets?: number;
  compareTotalLiabilities?: number;
  compareTotalEquity?: number;
  asOfDate: string;
  compareAsOfDate?: string;
};

export type ProfitLossLine = {
  account_code: string;
  account_name: string;
  account_type: string;
  amount: number;
  /** Amount in the comparison period; present only when one was requested. */
  compare_amount?: number;
};

export type ProfitLossData = {
  revenue: ProfitLossLine[];
  expenses: ProfitLossLine[];
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  compareTotalRevenue?: number;
  compareTotalExpenses?: number;
  compareNetIncome?: number;
  startDate: string;
  endDate: string;
  compareStartDate?: string;
  compareEndDate?: string;
};

export type TrialBalanceLine = {
  account_code: string;
  account_name: string;
  account_type: string;
  debit: number;
  credit: number;
  balance: number;
};

export type TrialBalanceData = {
  accounts: TrialBalanceLine[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  asOfDate: string;
};

export type TurnoverReportLine = {
  account_id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  opening_debit: number;
  opening_credit: number;
  period_debit: number;
  period_credit: number;
  closing_debit: number;
  closing_credit: number;
};

export type TurnoverReportData = {
  accounts: TurnoverReportLine[];
  totals: {
    opening_debit: number;
    opening_credit: number;
    period_debit: number;
    period_credit: number;
    closing_debit: number;
    closing_credit: number;
  };
  startDate: string;
  endDate: string;
};

export type GeneralLedgerTransaction = {
  id: string;
  date: string;
  type: string | null;
  description: string | null;
  reference: string | null;
  partner: string | null;
  debit: number | null;
  credit: number | null;
  balance: number;
};

export type GeneralLedgerData = {
  account: { code: string; name: string; type: string };
  openingBalance: number;
  transactions: GeneralLedgerTransaction[];
  closingBalance: number;
  totalDebit: number;
  totalCredit: number;
  startDate: string;
  endDate: string;
};

export type VATRateBreakdown = {
  tax_rate: number;
  taxable_amount: number;
  vat_amount: number;
};

export type VATInvoiceSummary = {
  id: string;
  /** sales_invoice | sales_credit_note | purchase_invoice | purchase_credit_note — credit notes carry negative amounts. */
  type: string;
  invoice_number: string;
  invoice_date: string;
  partner_name?: string | null;
  subtotal: number;
  tax_amount: number;
  total: number;
  tax_rate_breakdown: VATRateBreakdown[];
};

/** KMD form line keys: `1_2` is line 1², `3_1_1` is line 3.1.1. */
export type KmdLineKey =
  | '1' | '1_1' | '1_2' | '2' | '2_1' | '2_2'
  | '3' | '3_1' | '3_1_1' | '3_2' | '3_2_1'
  | '4' | '5' | '5_1' | '5_2' | '5_3' | '5_4'
  | '6' | '6_1' | '7' | '7_1' | '8' | '9' | '10' | '11' | '12' | '13';

export type VATReportData = {
  lines: Record<KmdLineKey, number>;
  sales_invoices: VATInvoiceSummary[];
  purchase_invoices: VATInvoiceSummary[];
  sales_annex_count: number;
  purchases_annex_count: number;
  warnings: string[];
  /** Set when the range is exactly one calendar month (exportable to e-MTA). */
  period: { year: number; month: number } | null;
  startDate: string;
  endDate: string;
};

export type AgingInvoiceDetail = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  open_amount: number;
  days_overdue: number;
};

export type AgingPartnerLine = {
  partner_id: string;
  partner_name: string;
  current: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  over_90: number;
  total: number;
  invoices: AgingInvoiceDetail[];
};

export type AgingReportData = {
  direction: 'receivable' | 'payable';
  as_of_date: string;
  summary: {
    current: number;
    days_1_30: number;
    days_31_60: number;
    days_61_90: number;
    over_90: number;
    total: number;
  };
  partners: AgingPartnerLine[];
};

export type DimensionReportRow = {
  id: string | null;
  code: string | null;
  name: string;
  is_active: boolean;
  cost_center_id?: string | null;
  cost_center_name?: string | null;
  partner_id?: string | null;
  partner_name?: string | null;
  revenue: number;
  costs: number;
  result: number;
  sales_invoices: number;
  purchase_invoices: number;
};

export type DimensionReportLine = {
  invoice_id: string;
  invoice_number: string | null;
  type: string;
  status: string;
  invoice_date: string;
  partner_id: string | null;
  partner_name: string | null;
  description: string;
  amount: number;
  kind: 'revenue' | 'cost';
  cost_center_id: string | null;
  project_id: string | null;
};

export type DimensionReportData = {
  period: { start_date: string; end_date: string };
  include_drafts: boolean;
  cost_centers: DimensionReportRow[];
  projects: DimensionReportRow[];
  totals: { revenue: number; costs: number; result: number };
  lines: DimensionReportLine[];
};

export const reportsApi = {
  /** Revenue and costs by cost centre / project, from invoice lines. */
  async getDimensionReport(startDate: string, endDate: string, includeDrafts = false) {
    const response = await apiClient.get<ApiResponse<DimensionReportData>>('/api/reports/dimensions', {
      params: { start_date: startDate, end_date: endDate, include_drafts: includeDrafts ? 'true' : 'false' },
    });
    return response.data.data;
  },

  async getBalanceSheet(asOfDate?: string, compareAsOfDate?: string) {
    const params: Record<string, string> = {};
    if (asOfDate) params.as_of_date = asOfDate;
    if (compareAsOfDate) params.compare_as_of_date = compareAsOfDate;
    const response = await apiClient.get<ApiResponse<BalanceSheetData>>('/api/reports/balance-sheet', {
      params: Object.keys(params).length ? params : undefined,
    });
    return response.data.data;
  },

  async getProfitLoss(startDate: string, endDate: string, compare?: { startDate: string; endDate: string }) {
    const response = await apiClient.get<ApiResponse<ProfitLossData>>('/api/reports/profit-loss', {
      params: {
        start_date: startDate,
        end_date: endDate,
        ...(compare ? { compare_start_date: compare.startDate, compare_end_date: compare.endDate } : {}),
      },
    });
    return response.data.data;
  },

  async getTrialBalance(asOfDate?: string) {
    const params = asOfDate ? { as_of_date: asOfDate } : undefined;
    const response = await apiClient.get<ApiResponse<TrialBalanceData>>('/api/reports/trial-balance', { params });
    return response.data.data;
  },

  async getTurnoverReport(startDate: string, endDate: string) {
    const response = await apiClient.get<ApiResponse<TurnoverReportData>>('/api/reports/turnover', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data.data;
  },

  async getGeneralLedger(accountId: string, startDate: string, endDate: string) {
    const response = await apiClient.get<ApiResponse<GeneralLedgerData>>('/api/reports/general-ledger', {
      params: { account_id: accountId, start_date: startDate, end_date: endDate },
    });
    return response.data.data;
  },

  async getVATReport(startDate: string, endDate: string) {
    const response = await apiClient.get<ApiResponse<VATReportData>>('/api/reports/vat', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data.data;
  },

  async getAgingReport(direction: 'receivable' | 'payable', asOfDate?: string) {
    const response = await apiClient.get<ApiResponse<AgingReportData>>('/api/reports/aging', {
      params: { direction, as_of_date: asOfDate },
    });
    return response.data.data;
  },

  async downloadKmdXml(startDate: string, endDate: string) {
    const response = await apiClient.get('/api/reports/kmd', {
      params: { start_date: startDate, end_date: endDate },
      responseType: 'blob',
    });
    return response.data as Blob;
  },

  async downloadKmdInfXml(startDate: string, endDate: string) {
    const response = await apiClient.get('/api/reports/kmd-inf', {
      params: { start_date: startDate, end_date: endDate },
      responseType: 'blob',
    });
    return response.data as Blob;
  },
};
