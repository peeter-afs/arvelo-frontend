import apiClient from './client';

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type MeritPalkAccountMapEntry = {
  id?: string;
  merit_account_code: string;
  account_id: string;
  /** Marks the lines a payment to the tax board settles. */
  is_tax_liability?: boolean;
  is_active?: boolean;
};

export type MeritPalkBatch = {
  id: string;
  month: string;
  status: 'imported' | 'posted' | 'failed';
  journal_entry_id: string | null;
  line_count: number;
  total_debit: number | string;
  error_message: string | null;
  imported_at: string;
};

export type MeritPalkSettings = {
  integration_key: string;
  enabled: boolean;
  provider_type: string;
  base_url: string;
  api_id: string | null;
  api_key_masked: string | null;
  has_api_key: boolean;
  auto_post: boolean;
  last_synced_month: string | null;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_imported_count: number | null;
  last_error_message: string | null;
  last_test_status: string | null;
  last_test_at: string | null;
  updated_at: string | null;
  account_map: MeritPalkAccountMapEntry[];
  batches: MeritPalkBatch[];
};

export type MeritPalkDiscoveredCode = {
  merit_account_code: string;
  debit: number;
  credit: number;
  suggested_account_id: string | null;
  suggested_account_name: string | null;
  mapped_account_id: string | null;
};

export type MeritPalkSyncResult = {
  status: 'imported' | 'posted' | 'skipped' | 'failed';
  month: string;
  reason?: string;
  line_count?: number;
  total_debit?: number;
  journal_entry_id?: string | null;
  unmapped_codes?: string[];
};

const BASE = '/api/tenant-admin/integrations/merit-palk';

export const meritPalkApi = {
  async getSettings() {
    const response = await apiClient.get<ApiResponse<MeritPalkSettings>>(BASE);
    return response.data.data;
  },

  async updateSettings(payload: {
    enabled?: boolean;
    base_url?: string;
    api_id?: string;
    api_key?: string;
    auto_post?: boolean;
  }) {
    const response = await apiClient.put<ApiResponse<MeritPalkSettings>>(BASE, payload);
    return response.data.data;
  },

  async testSettings() {
    const response = await apiClient.post<ApiResponse<{ status: string }>>(`${BASE}/test`);
    return response.data.data;
  },

  async discover(payload: { month: string }) {
    const response = await apiClient.post<ApiResponse<{ codes: MeritPalkDiscoveredCode[] }>>(`${BASE}/discover`, payload);
    return response.data.data.codes;
  },

  async updateAccountMap(entries: MeritPalkAccountMapEntry[]) {
    const response = await apiClient.put<ApiResponse<{ entries: MeritPalkAccountMapEntry[] }>>(
      `${BASE}/account-map`,
      { entries }
    );
    return response.data.data.entries;
  },

  async sync(payload: { month: string; force?: boolean }) {
    const response = await apiClient.post<ApiResponse<MeritPalkSyncResult>>(`${BASE}/sync`, payload);
    return response.data.data;
  },
};
