import apiClient from './client';

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type FutursoftSettings = {
  integration_key: string;
  enabled: boolean;
  provider_type: string;
  base_url: string;
  api_key_masked: string | null;
  has_api_key: boolean;
  sync_window_days: number;
  default_page_size: number;
  internal_sales: number;
  start_date: string | null;
  line_grouping: string;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_imported_count: number | null;
  last_error_message: string | null;
  last_test_status: string | null;
  last_test_at: string | null;
  updated_at: string | null;
};

export type FutursoftSyncResult = {
  status: 'success' | 'skipped';
  reason?: string;
  imported_count: number;
  skipped_count: number;
  failed_count: number;
};

export type FutursoftAccountRule = {
  id?: string;
  match_type: 'product_code' | 'line_type';
  match_value: string;
  account_id: string;
  is_active?: boolean;
};

export type FutursoftDiscoveredCode = {
  product_code: string;
  line_type: 'goods' | 'service';
  sample_name: string;
  count: number;
};

export type FutursoftDiscoverResult = {
  from: string;
  to: string;
  scanned_invoices: number;
  codes: FutursoftDiscoveredCode[];
};

export const futursoftApi = {
  async getSettings() {
    const response = await apiClient.get<ApiResponse<FutursoftSettings>>('/api/tenant-admin/integrations/futursoft');
    return response.data.data;
  },

  async updateSettings(payload: {
    enabled?: boolean;
    base_url?: string;
    api_key?: string;
    sync_window_days?: number;
    default_page_size?: number;
    internal_sales?: number;
    start_date?: string | null;
    line_grouping?: 'itemized' | 'by_account' | 'by_type';
  }) {
    const response = await apiClient.put<ApiResponse<FutursoftSettings>>('/api/tenant-admin/integrations/futursoft', payload);
    return response.data.data;
  },

  async discover(payload: { from: string; to: string }) {
    const response = await apiClient.post<ApiResponse<FutursoftDiscoverResult>>(
      '/api/tenant-admin/integrations/futursoft/discover',
      payload
    );
    return response.data.data;
  },

  async getRules() {
    const response = await apiClient.get<ApiResponse<{ rules: FutursoftAccountRule[] }>>(
      '/api/tenant-admin/integrations/futursoft/rules'
    );
    return response.data.data.rules;
  },

  async updateRules(rules: FutursoftAccountRule[]) {
    const response = await apiClient.put<ApiResponse<{ rules: FutursoftAccountRule[] }>>(
      '/api/tenant-admin/integrations/futursoft/rules',
      { rules }
    );
    return response.data.data.rules;
  },

  async testSettings() {
    const response = await apiClient.post<ApiResponse<{ status: string; tested_at: string }>>(
      '/api/tenant-admin/integrations/futursoft/test'
    );
    return response.data.data;
  },

  async sync(payload: { trigger: 'manual' | 'on_access'; force?: boolean }) {
    const response = await apiClient.post<ApiResponse<FutursoftSyncResult>>('/api/import/futursoft/sync', payload);
    return response.data.data;
  },
};
