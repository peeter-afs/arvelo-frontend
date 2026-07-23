import apiClient from './client';

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type MonthEndRuleType =
  | 'depreciation'
  | 'currency_revaluation'
  | 'vat_netting'
  | 'recurring_fixed'
  | 'accrual';

export type MonthEndEntryStatus = 'draft' | 'posted' | 'reversed';

export type MonthEndPeriod = {
  id: string;
  tenant_id: string;
  fiscal_year_id: string;
  period_no: number;
  date_start: string;
  date_end: string;
  is_closed: boolean;
};

export type MonthEndEntry = {
  id: string;
  tenant_id: string;
  period_id: string;
  rule_type: MonthEndRuleType;
  journal_entry_id?: string | null;
  status: MonthEndEntryStatus;
  auto_post: boolean;
  input_snapshot: Record<string, unknown>;
  approved_by_user_id?: string | null;
  approved_at?: string | null;
  reversed_by_user_id?: string | null;
  reversed_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type MonthEndRuleResult = {
  rule_type: MonthEndRuleType;
  status: 'created' | 'already_exists' | 'nothing_to_do';
  entry?: MonthEndEntry;
  message?: string;
};

export type MonthEndStatus = {
  period: MonthEndPeriod;
  entries: MonthEndEntry[];
};

export type MonthEndRunResult = {
  period: MonthEndPeriod;
  results: MonthEndRuleResult[];
};

export type MonthEndBlockerKey =
  | 'draft_journal_entries'
  | 'draft_sales_invoices'
  | 'draft_purchase_invoices'
  | 'intake_pending_documents'
  | 'pending_bank_transactions'
  | 'rules_not_run';

export type MonthEndBlocker = {
  key: MonthEndBlockerKey;
  count: number;
};

export type MonthEndReadiness = {
  period: MonthEndPeriod;
  blockers: MonthEndBlocker[];
  total: number;
  is_ready: boolean;
};

export const monthEndApi = {
  async getStatus(year: number, month: number): Promise<MonthEndStatus> {
    const response = await apiClient.get<ApiResponse<MonthEndStatus>>(`/api/month-end/${year}/${month}`);
    return response.data.data;
  },

  async getReadiness(year: number, month: number): Promise<MonthEndReadiness> {
    const response = await apiClient.get<ApiResponse<MonthEndReadiness>>(`/api/month-end/${year}/${month}/readiness`);
    return response.data.data;
  },

  async run(year: number, month: number): Promise<MonthEndRunResult> {
    const response = await apiClient.post<ApiResponse<MonthEndRunResult>>('/api/month-end/run', { year, month });
    return response.data.data;
  },

  async approve(entryId: string): Promise<MonthEndEntry> {
    const response = await apiClient.post<ApiResponse<MonthEndEntry>>(`/api/month-end/entries/${entryId}/approve`);
    return response.data.data;
  },

  async reverse(entryId: string, reason?: string): Promise<MonthEndEntry> {
    const response = await apiClient.post<ApiResponse<MonthEndEntry>>(`/api/month-end/entries/${entryId}/reverse`, { reason });
    return response.data.data;
  },
};
