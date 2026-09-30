import apiClient from './client';

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type StartupScenario = 'founded_this_year' | 'founded_earlier' | 'unknown';

export type StartupProfile = {
  company_name: string;
  registry_code: string | null;
  is_vat_registered: boolean;
  strategy: string | null;
  founded_on: string | null;
  share_capital: number | null;
  share_capital_paid: boolean | null;
  bookkeeping_start_date: string | null;
  ai_bank_categorization_enabled: boolean;
  saved: boolean;
  registry: { founded_on: string | null; share_capital: number | null; error: string | null } | null;
  scenario: StartupScenario;
  suggested_start_date: string | null;
  fiscal_year: { start: string; end: string };
  ai: { configured: boolean; provider: string | null; model: string | null };
};

export type StartupSetupInput = {
  founded_on: string;
  share_capital?: number | null;
  share_capital_paid?: boolean | null;
  bookkeeping_start_date?: string | null;
  ai_bank_categorization_enabled?: boolean;
};

export type StartupBankStatus = {
  bank_account_id: string;
  name: string;
  iban: string | null;
  ledger_account_code: string | null;
  first_statement_date: string | null;
  statement_opening: number | null;
  ledger_before_start: number | null;
  opening_difference: number | null;
  statement_closing: number | null;
  ledger_today: number | null;
  closing_difference: number | null;
  starts_after_bookkeeping_start: boolean;
};

export type StartupStatus = {
  profile: StartupProfile;
  checks: {
    profile_saved: boolean;
    year_end_needed: boolean;
    year_end_imported: boolean;
    share_capital_booked: boolean | null;
    bank_statements_imported: boolean;
    bank_opening_matches: boolean;
    bank_closing_matches: boolean;
    no_open_transactions: boolean;
    no_closed_periods: boolean;
  };
  banks: StartupBankStatus[];
  open_transactions: { open_transactions: number; groups: number; categorized_groups: number; flagged_groups: number };
  missing_receipts: { count: number; total: number };
  closed_periods: Array<{ date_start: string; date_end: string }>;
  share_capital: { registered: number | null; booked: number; unpaid: number; entry_committed: boolean };
  ready: boolean;
};

export type TransactionKind =
  | 'sales_receipt'
  | 'purchase_payment'
  | 'tax_emta'
  | 'salary'
  | 'owner_capital'
  | 'owner_loan'
  | 'owner_withdrawal'
  | 'own_transfer'
  | 'bank_fee'
  | 'loan'
  | 'refund'
  | 'unknown';

export type RiskFlag = 'owner_related' | 'cash' | 'loan' | 'tax_risk' | 'private_expense' | 'unclear';

export type GroupSuggestion = {
  kind: TransactionKind;
  account_id: string | null;
  account_code: string | null;
  account_name: string | null;
  vat_rate: number | null;
  needs_document: boolean;
  confidence: number;
  reason: string;
  flags: RiskFlag[];
  source: 'ai' | 'history';
  provider: string | null;
  model: string | null;
};

export type ReconstructionGroup = {
  key: string;
  counterparty: string | null;
  counterparty_iban: string | null;
  direction: 'in' | 'out';
  count: number;
  total: number;
  first_date: string;
  last_date: string;
  samples: string[];
  transaction_ids: string[];
  transactions: Array<{ id: string; tx_date: string; amount: number; description: string | null; reference: string | null }>;
  suggestion: GroupSuggestion | null;
};

export type ApplyAction = 'post' | 'draft' | 'skip';

export type ApplyItem = {
  transaction_ids: string[];
  action: ApplyAction;
  account_id?: string | null;
  vat_rate?: number | null;
  partner_id?: string | null;
};

export const startupApi = {
  async getProfile() {
    const response = await apiClient.get<ApiResponse<StartupProfile>>('/api/startup/profile');
    return response.data.data;
  },

  async setup(input: StartupSetupInput) {
    const response = await apiClient.post<
      ApiResponse<{
        profile: StartupProfile;
        scenario: StartupScenario;
        bookkeeping_start_date: string;
        period_errors: Array<{ date: string; error: string }>;
        share_capital_entry: { journal_entry_ids: string[] } | null;
      }>
    >('/api/startup/setup', input, { timeout: 120_000 });
    return response.data.data;
  },

  async getStatus() {
    const response = await apiClient.get<ApiResponse<StartupStatus>>('/api/startup/status', { timeout: 60_000 });
    return response.data.data;
  },

  async listGroups(params?: { date_from?: string; bank_account_id?: string }) {
    const response = await apiClient.get<
      ApiResponse<{
        groups: ReconstructionGroup[];
        summary: { open_transactions: number; groups: number; categorized_groups: number; flagged_groups: number };
      }>
    >('/api/startup/groups', { params });
    return response.data.data;
  },

  async categorize(input?: { date_from?: string; bank_account_id?: string; force?: boolean }) {
    // A year of transactions is several model calls; give it room.
    const response = await apiClient.post<
      ApiResponse<{ groups: number; categorized: number; from_history: number; failed_chunks: number; provider: string | null; model: string | null }>
    >('/api/startup/categorize', input || {}, { timeout: 600_000 });
    return response.data.data;
  },

  async apply(items: ApplyItem[]) {
    const response = await apiClient.post<
      ApiResponse<{
        results: Array<{ transaction_id: string; status: 'posted' | 'drafted' | 'skipped' | 'error'; error?: string }>;
        posted: number;
        drafted: number;
        skipped: number;
        errors: number;
      }>
    >('/api/startup/apply', { items }, { timeout: 300_000 });
    return response.data.data;
  },
};
