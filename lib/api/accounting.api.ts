import apiClient from './client';

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type AccountOption = {
  id: string;
  code: string;
  name: string;
  type: string;
  is_active: boolean;
  system_code?: string | null;
};

export type AccountingSettings = {
  tenant_id: string;
  accounts_receivable_account_id: string | null;
  accounts_payable_account_id: string | null;
  sales_revenue_account_id: string | null;
  purchase_expense_account_id: string | null;
  vat_output_account_id: string | null;
  vat_input_account_id: string | null;
  bank_account_default_id: string | null;
  default_sales_account_id_domestic?: string | null;
  default_sales_account_id_intra_community?: string | null;
  default_sales_account_id_reverse_charge?: string | null;
  default_sales_account_id_third_country?: string | null;
  fiscal_year_start_month?: number;
  fiscal_year_start_day?: number;
};

export type SupplyTypeSalesDefaults = Partial<{
  default_sales_account_id_domestic: string | null;
  default_sales_account_id_intra_community: string | null;
  default_sales_account_id_reverse_charge: string | null;
  default_sales_account_id_third_country: string | null;
}>;

export type SystemRoleMapping = Partial<{
  accounts_receivable_account_id: string;
  accounts_payable_account_id: string;
  sales_revenue_account_id: string;
  purchase_expense_account_id: string;
  vat_output_account_id: string;
  vat_input_account_id: string;
  bank_account_default_id: string;
}>;

export type PartnerOption = {
  id: string;
  name: string;
  type: string;
  reg_code?: string | null;
  is_active: boolean;
};

export type PartnerRole = {
  id: string;
  partner_id: string;
  role: 'customer' | 'supplier';
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type SupplierBankAccount = {
  id: string;
  partner_id: string;
  iban: string;
  bank_name?: string | null;
  bic?: string | null;
  currency_code?: string | null;
  account_holder_name?: string | null;
  is_default: boolean;
  is_active: boolean;
  source?: string | null;
  verified_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

export type PartnerRecord = {
  id: string;
  tenant_id: string;
  type: 'customer' | 'supplier' | 'both';
  name: string;
  code?: string | null;
  reg_code?: string | null;
  vat_number?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  website?: string | null;
  registry_status?: string | null;
  is_registry_linked?: boolean | null;
  data_source?: string | null;
  registry_sync_at?: string | null;
  tax_arrears_status?: string | null;
  tax_arrears_checked_at?: string | null;
  tax_arrears_amount?: number | null;
  tax_arrears_note?: string | null;
  duplicate_warning_acknowledged?: boolean | null;
  notes?: string | null;
  country_code?: string | null;
  payment_terms_days?: number | null;
  receipt_responsible_email?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  updated_by?: string | null;
};

export type PartnerWithBalance = PartnerRecord & {
  balance: number;
};

export type OpeningBalanceBatchListItem = {
  id: string;
  opening_date: string;
  currency: string;
  batch_type?: 'general' | 'receivables' | 'payables';
  status: 'draft' | 'committed';
  journal_entry_id?: string | null;
  journal_entry_number?: string | null;
  committed_at?: string | null;
  created_at: string;
};

export type PeriodItem = {
  id: string;
  tenant_id: string;
  fiscal_year_id: string;
  period_no: number;
  date_start: string;
  date_end: string;
  is_closed: boolean;
  closed_at?: string | null;
};

export type FiscalYearWithPeriods = {
  id: string;
  tenant_id: string;
  date_start: string;
  date_end: string;
  is_closed: boolean;
  created_at: string;
  updated_at: string;
  periods: PeriodItem[];
};

export type AccountRecord = {
  id: string;
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parent_id?: string | null;
  is_active: boolean;
  is_system: boolean;
  system_code?: string | null;
  created_at: string;
  updated_at: string;
};

export type JournalEntryRecord = {
  id: string;
  tenant_id: string;
  journal_id?: string | null;
  entry_number?: string | null;
  entry_date: string;
  entry_type: string;
  description?: string | null;
  reference_number?: string | null;
  is_posted: boolean;
  posted_at?: string | null;
  created_at: string;
  updated_at: string;
  rows?: JournalLineRecord[];
};

export type JournalLineRecord = {
  id: string;
  journal_entry_id: string;
  account_id: string;
  partner_id?: string | null;
  debit: number;
  credit: number;
  description?: string | null;
};

export const accountingApi = {
  async getAccounts() {
    const response = await apiClient.get<ApiResponse<AccountOption[]>>('/api/accounting/accounts?is_active=true');
    return response.data.data;
  },

  async listAccounts(params?: { type?: string; is_active?: boolean }) {
    const response = await apiClient.get<ApiResponse<AccountRecord[]>>('/api/accounting/accounts', { params });
    return response.data.data;
  },

  async createAccount(payload: { code: string; name: string; type: string; parent_id?: string }) {
    const response = await apiClient.post<ApiResponse<AccountRecord>>('/api/accounting/accounts', payload);
    return response.data.data;
  },

  async updateAccount(id: string, payload: Record<string, any>) {
    const response = await apiClient.put<ApiResponse<AccountRecord>>(`/api/accounting/accounts/${id}`, payload);
    return response.data.data;
  },

  async deleteAccount(id: string) {
    const response = await apiClient.delete<ApiResponse<void>>(`/api/accounting/accounts/${id}`);
    return response.data.data;
  },

  // System role accounts / default chart
  async getAccountingSettings() {
    const response = await apiClient.get<ApiResponse<AccountingSettings | null>>('/api/accounting/settings');
    return response.data.data;
  },

  async updateAccountingSettings(mapping: SystemRoleMapping) {
    const response = await apiClient.put<ApiResponse<{ settings: AccountingSettings; warnings: string[] }>>(
      '/api/accounting/settings',
      mapping
    );
    return response.data.data;
  },

  async updateSupplyTypeSalesDefaults(mapping: SupplyTypeSalesDefaults) {
    const response = await apiClient.put<ApiResponse<{ settings: AccountingSettings; warnings: string[] }>>(
      '/api/accounting/settings/sales-defaults',
      mapping
    );
    return response.data.data;
  },

  async createDefaultChart() {
    const response = await apiClient.post<ApiResponse<{ created: string[]; reused: string[]; skipped: string[]; settings: AccountingSettings }>>(
      '/api/accounting/accounts/create-defaults'
    );
    return response.data.data;
  },

  async applyImportedSystemRoles(mapping: Record<string, { account_id: string }>) {
    const response = await apiClient.post<ApiResponse<{ remapped: string[]; removed: string[]; kept_with_warning: string[] }>>(
      '/api/accounting/settings/apply-imported-roles',
      { mapping }
    );
    return response.data.data;
  },

  async listJournalEntries(params?: { start_date?: string; end_date?: string; entry_type?: string; is_posted?: boolean; limit?: number; offset?: number }) {
    const response = await apiClient.get<ApiResponse<JournalEntryRecord[]>>('/api/accounting/journal-entries', { params });
    return response.data.data;
  },

  async getJournalEntry(id: string) {
    const response = await apiClient.get<ApiResponse<JournalEntryRecord>>(`/api/accounting/journal-entries/${id}`);
    return response.data.data;
  },

  async createJournalEntry(payload: {
    entry_date: string;
    entry_type: string;
    description?: string;
    reference_number?: string;
    rows: { account_id: string; partner_id?: string; debit: number; credit: number; description?: string }[];
  }) {
    const response = await apiClient.post<ApiResponse<JournalEntryRecord>>('/api/accounting/journal-entries', payload);
    return response.data.data;
  },

  async updateJournalEntry(id: string, payload: {
    entry_date?: string;
    description?: string;
    reference_number?: string;
    rows?: { account_id: string; partner_id?: string; debit: number; credit: number; description?: string }[];
  }) {
    const response = await apiClient.put<ApiResponse<JournalEntryRecord>>(`/api/accounting/journal-entries/${id}`, payload);
    return response.data.data;
  },

  async postJournalEntry(id: string) {
    const response = await apiClient.post<ApiResponse<{ success: boolean }>>(`/api/accounting/journal-entries/${id}/post`);
    return response.data.data;
  },

  async deleteJournalEntry(id: string) {
    const response = await apiClient.delete<ApiResponse<void>>(`/api/accounting/journal-entries/${id}`);
    return response.data.data;
  },

  async getAccountBalance(accountId: string, asOfDate?: string) {
    const response = await apiClient.get<ApiResponse<{ debit: number; credit: number; balance: number }>>(
      `/api/accounting/accounts/${accountId}/balance`,
      asOfDate ? { params: { as_of_date: asOfDate } } : undefined
    );
    return response.data.data;
  },

  async listJournalEntriesByPartner(partnerId: string, limit = 5) {
    const response = await apiClient.get<ApiResponse<JournalEntryRecord[]>>('/api/accounting/journal-entries', {
      params: { partner_id: partnerId, limit }
    });
    return response.data.data;
  },

  async getPartners() {
    const response = await apiClient.get<ApiResponse<PartnerOption[]>>('/api/accounting/partners?is_active=true');
    return response.data.data;
  },

  async listPartners(params?: { type?: string; is_active?: boolean; search?: string }) {
    const response = await apiClient.get<ApiResponse<PartnerRecord[]>>('/api/accounting/partners', { params });
    return response.data.data;
  },

  async listPartnersWithBalances(type?: string) {
    const response = await apiClient.get<ApiResponse<PartnerWithBalance[]>>('/api/accounting/partners/balances', {
      params: type ? { type } : undefined
    });
    return response.data.data;
  },

  async getPartner(id: string) {
    const response = await apiClient.get<ApiResponse<PartnerRecord>>(`/api/accounting/partners/${id}`);
    return response.data.data;
  },

  async createPartner(payload: Record<string, any>) {
    const response = await apiClient.post<ApiResponse<PartnerRecord>>('/api/accounting/partners', payload);
    return response.data.data;
  },

  async updatePartner(id: string, payload: Record<string, any>) {
    const response = await apiClient.put<ApiResponse<PartnerRecord>>(`/api/accounting/partners/${id}`, payload);
    return response.data.data;
  },

  async checkPartnerDuplicates(payload: {
    registry_code?: string;
    vat_number?: string;
    intended_role?: 'customer' | 'supplier';
    iban?: string;
  }) {
    const response = await apiClient.post<ApiResponse<Array<{
      partner: PartnerRecord;
      roles: string[];
      match_type: string;
      severity: string;
    }>>>('/api/accounting/partners/check-duplicates', payload);
    return response.data.data;
  },

  async getPartnerRoles(id: string) {
    const response = await apiClient.get<ApiResponse<PartnerRole[]>>(`/api/accounting/partners/${id}/roles`);
    return response.data.data;
  },

  async addPartnerRole(id: string, role: 'customer' | 'supplier') {
    const response = await apiClient.post<ApiResponse<PartnerRole>>(`/api/accounting/partners/${id}/roles`, { role });
    return response.data.data;
  },

  async getSupplierBankAccounts(id: string) {
    const response = await apiClient.get<ApiResponse<SupplierBankAccount[]>>(`/api/accounting/partners/${id}/supplier-bank-accounts`);
    return response.data.data;
  },

  async createSupplierBankAccount(id: string, payload: Record<string, any>) {
    const response = await apiClient.post<ApiResponse<SupplierBankAccount>>(`/api/accounting/partners/${id}/supplier-bank-accounts`, payload);
    return response.data.data;
  },

  async updateSupplierBankAccount(id: string, bankAccountId: string, payload: Record<string, any>) {
    const response = await apiClient.put<ApiResponse<SupplierBankAccount>>(
      `/api/accounting/partners/${id}/supplier-bank-accounts/${bankAccountId}`,
      payload
    );
    return response.data.data;
  },

  async listOpeningBalances(status?: string) {
    const response = await apiClient.get<ApiResponse<{
      items: OpeningBalanceBatchListItem[];
      total: number;
      limit: number;
      offset: number;
    }>>('/api/accounting/opening-balances', {
      params: status ? { status } : undefined
    });
    return response.data.data;
  },

  async previewOpeningBalances(payload: Record<string, any>) {
    const response = await apiClient.post<ApiResponse<any>>('/api/accounting/opening-balances/preview', payload);
    return response.data.data;
  },

  async commitOpeningBalances(payload: Record<string, any>) {
    const response = await apiClient.post<ApiResponse<any>>('/api/accounting/opening-balances/commit', payload);
    return response.data.data;
  },

  async previewOpeningReceivables(payload: Record<string, any>) {
    const response = await apiClient.post<ApiResponse<any>>('/api/accounting/opening-balances/receivables/preview', payload);
    return response.data.data;
  },

  async commitOpeningReceivables(payload: Record<string, any>) {
    const response = await apiClient.post<ApiResponse<any>>('/api/accounting/opening-balances/receivables/commit', payload);
    return response.data.data;
  },

  async previewOpeningPayables(payload: Record<string, any>) {
    const response = await apiClient.post<ApiResponse<any>>('/api/accounting/opening-balances/payables/preview', payload);
    return response.data.data;
  },

  async commitOpeningPayables(payload: Record<string, any>) {
    const response = await apiClient.post<ApiResponse<any>>('/api/accounting/opening-balances/payables/commit', payload);
    return response.data.data;
  },

  // Opening balance import lock / reset
  async getOpeningBalanceImportStatus() {
    const response = await apiClient.get<ApiResponse<{
      is_imported: boolean;
      can_reset: boolean;
      reset_reference_date: string | null;
      reset_window_months: number;
      opening_balances_strategy: 'with_general' | 'subledger_only' | null;
      committed_batches: Array<{ id: string; batch_type: string; opening_date: string; committed_at: string }>;
    }>>('/api/accounting/opening-balances/import-status');
    return response.data.data;
  },

  async setOpeningBalancesStrategy(strategy: 'with_general' | 'subledger_only') {
    const response = await apiClient.post<ApiResponse<{ settings: AccountingSettings }>>(
      '/api/accounting/opening-balances/strategy',
      { strategy }
    );
    return response.data.data;
  },

  async resetOpeningBalances(
    confirmText: string,
    options?: { deleteAccounts?: boolean; deletePartners?: boolean }
  ) {
    const response = await apiClient.post<ApiResponse<{
      backup_id: string;
      reversed_count: number;
      deleted_entries: number;
      deleted_invoices: number;
      deleted_accounts: number;
      deleted_partners: number;
    }>>(
      '/api/accounting/opening-balances/reset',
      {
        confirm_text: confirmText,
        delete_accounts: options?.deleteAccounts ?? false,
        delete_partners: options?.deletePartners ?? false,
      }
    );
    return response.data.data;
  },

  async listResetBackups() {
    const response = await apiClient.get<ApiResponse<any[]>>('/api/accounting/opening-balances/reset-backups');
    return response.data.data;
  },

  async restoreOpeningBalances(backupId: string) {
    const response = await apiClient.post<ApiResponse<{ restored_batch_count: number }>>(
      `/api/accounting/opening-balances/reset-backups/${backupId}/restore`
    );
    return response.data.data;
  },

  // Fiscal Year & Period Management
  async listFiscalYears() {
    const response = await apiClient.get<ApiResponse<FiscalYearWithPeriods[]>>('/api/accounting/fiscal-years');
    return response.data.data;
  },

  async createFiscalYear(payload: { date_start: string; date_end: string }) {
    const response = await apiClient.post<ApiResponse<FiscalYearWithPeriods>>('/api/accounting/fiscal-years', payload);
    return response.data.data;
  },

  async closeFiscalYear(id: string) {
    const response = await apiClient.post<ApiResponse<any>>(`/api/accounting/fiscal-years/${id}/close`);
    return response.data.data;
  },

  async reopenFiscalYear(id: string) {
    const response = await apiClient.post<ApiResponse<any>>(`/api/accounting/fiscal-years/${id}/reopen`);
    return response.data.data;
  },

  async closePeriod(id: string) {
    const response = await apiClient.post<ApiResponse<any>>(`/api/accounting/periods/${id}/close`);
    return response.data.data;
  },

  async reopenPeriod(id: string) {
    const response = await apiClient.post<ApiResponse<any>>(`/api/accounting/periods/${id}/reopen`);
    return response.data.data;
  },
};
