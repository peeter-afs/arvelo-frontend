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
};

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

export const accountingApi = {
  async getAccounts() {
    const response = await apiClient.get<ApiResponse<AccountOption[]>>('/api/accounting/accounts?is_active=true');
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
};
