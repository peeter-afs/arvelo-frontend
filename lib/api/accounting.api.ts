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
