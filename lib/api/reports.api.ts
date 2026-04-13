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
};

export type BalanceSheetData = {
  assets: BalanceSheetLine[];
  liabilities: BalanceSheetLine[];
  equity: BalanceSheetLine[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  asOfDate: string;
};

export type ProfitLossLine = {
  account_code: string;
  account_name: string;
  account_type: string;
  amount: number;
};

export type ProfitLossData = {
  revenue: ProfitLossLine[];
  expenses: ProfitLossLine[];
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  startDate: string;
  endDate: string;
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
  invoice_number: string;
  invoice_date: string;
  partner_name?: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  tax_rate_breakdown: VATRateBreakdown[];
};

export type VATReportData = {
  line1_taxable_22: number;
  line2_taxable_9: number;
  line3_taxable_0: number;
  line4_output_vat: number;
  line5_input_vat: number;
  line6_net_vat: number;
  sales_invoices: VATInvoiceSummary[];
  purchase_invoices: VATInvoiceSummary[];
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

export const reportsApi = {
  async getBalanceSheet(asOfDate?: string) {
    const params = asOfDate ? { as_of_date: asOfDate } : undefined;
    const response = await apiClient.get<ApiResponse<BalanceSheetData>>('/api/reports/balance-sheet', { params });
    return response.data.data;
  },

  async getProfitLoss(startDate: string, endDate: string) {
    const response = await apiClient.get<ApiResponse<ProfitLossData>>('/api/reports/profit-loss', {
      params: { start_date: startDate, end_date: endDate },
    });
    return response.data.data;
  },

  async getTrialBalance(asOfDate?: string) {
    const params = asOfDate ? { as_of_date: asOfDate } : undefined;
    const response = await apiClient.get<ApiResponse<TrialBalanceData>>('/api/reports/trial-balance', { params });
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
};
