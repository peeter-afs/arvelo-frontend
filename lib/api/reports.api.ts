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
};
