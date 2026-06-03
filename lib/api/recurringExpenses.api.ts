import apiClient from './client';

type ApiResponse<T> = { success: boolean; data: T };

export type ExpenseFrequency = 'monthly' | 'quarterly' | 'annual';
export type MatchMethod = 'account' | 'amount' | 'partner' | 'none';
export type ExpenseStatus = 'not_due' | 'due_soon' | 'missing' | 'received' | 'over_budget';

export type RecurringExpense = {
  id: string;
  tenant_id: string;
  partner_id: string | null;
  label: string;
  expected_amount: number;
  max_amount: number;
  currency_code: string;
  expected_day_of_month: number;
  frequency: ExpenseFrequency;
  quarter_months: number[] | null;
  tolerance_days: number;
  account_id: string | null;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type RecurringExpenseMatch = {
  id: string;
  tenant_id: string;
  recurring_expense_id: string;
  period_key: string;
  matched_invoice_id: string | null;
  matched_amount: number | null;
  match_method: MatchMethod;
  status: ExpenseStatus;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

export type MonitorRow = {
  entry: RecurringExpense;
  period_key: string;
  status: ExpenseStatus;
  match: RecurringExpenseMatch | null;
};

export type BudgetSummary = {
  period_key: string;
  total_expected: number;
  total_actual: number;
  variance: number;
  by_account: Array<{
    account_id: string | null;
    total_expected: number;
    total_actual: number;
    variance: number;
    monthly_equivalent: number;
  }>;
};

export const recurringExpensesApi = {
  async list(activeOnly?: boolean): Promise<RecurringExpense[]> {
    const params = activeOnly ? '?active=true' : '';
    const { data } = await apiClient.get<ApiResponse<RecurringExpense[]>>(`/api/recurring-expenses${params}`);
    return data.data;
  },

  async get(id: string): Promise<{ entry: RecurringExpense; matches: RecurringExpenseMatch[] }> {
    const { data } = await apiClient.get<ApiResponse<{ entry: RecurringExpense; matches: RecurringExpenseMatch[] }>>(`/api/recurring-expenses/${id}`);
    return data.data;
  },

  async create(input: {
    partner_id?: string;
    label: string;
    expected_amount: number;
    max_amount: number;
    currency_code?: string;
    expected_day_of_month: number;
    frequency?: ExpenseFrequency;
    quarter_months?: number[];
    tolerance_days?: number;
    account_id?: string;
    start_date: string;
    end_date?: string;
    notes?: string;
  }): Promise<RecurringExpense> {
    const { data } = await apiClient.post<ApiResponse<RecurringExpense>>('/api/recurring-expenses', input);
    return data.data;
  },

  async update(id: string, input: Partial<{
    partner_id: string;
    label: string;
    expected_amount: number;
    max_amount: number;
    currency_code: string;
    expected_day_of_month: number;
    frequency: ExpenseFrequency;
    quarter_months: number[];
    tolerance_days: number;
    account_id: string;
    is_active: boolean;
    start_date: string;
    end_date: string;
    notes: string;
  }>): Promise<RecurringExpense> {
    const { data } = await apiClient.patch<ApiResponse<RecurringExpense>>(`/api/recurring-expenses/${id}`, input);
    return data.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/api/recurring-expenses/${id}`);
  },

  async getMonitor(period?: string): Promise<MonitorRow[]> {
    const params = period ? `?period=${period}` : '';
    const { data } = await apiClient.get<ApiResponse<MonitorRow[]>>(`/api/recurring-expenses/monitor${params}`);
    return data.data;
  },

  async getBudget(period?: string): Promise<BudgetSummary> {
    const params = period ? `?period=${period}` : '';
    const { data } = await apiClient.get<ApiResponse<BudgetSummary>>(`/api/recurring-expenses/budget${params}`);
    return data.data;
  },

  async reconcile(): Promise<{ processed: number; matched: number }> {
    const { data } = await apiClient.post<ApiResponse<{ processed: number; matched: number }>>('/api/recurring-expenses/reconcile', {});
    return data.data;
  },

  async upsertFromInvoice(input: {
    partner_id: string;
    account_id: string | null;
    label: string;
    expected_amount: number;
    max_amount: number;
    currency_code: string;
    expected_day_of_month: number;
    frequency: ExpenseFrequency;
    start_date: string;
  }): Promise<{ entry: RecurringExpense; created: boolean }> {
    const { data } = await apiClient.post<ApiResponse<{ entry: RecurringExpense; created: boolean }>>('/api/recurring-expenses/from-invoice', input);
    return data.data;
  },
};
