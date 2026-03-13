import apiClient from './client';

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type BusinessRegistrySettings = {
  integration_key: string;
  enabled: boolean;
  provider_type: string;
  username_masked: string | null;
  has_password: boolean;
  service_url: string;
  search_path: string;
  company_path: string;
  test_path: string;
  last_test_status: string | null;
  last_test_at: string | null;
  last_error_message: string | null;
  updated_at: string | null;
};

export const businessRegistryApi = {
  async getSettings() {
    const response = await apiClient.get<ApiResponse<BusinessRegistrySettings>>('/api/admin/integrations/business-registry');
    return response.data.data;
  },

  async updateSettings(payload: {
    enabled?: boolean;
    provider_type?: string;
    username?: string;
    password?: string;
    service_url?: string;
    search_path?: string;
    company_path?: string;
    test_path?: string;
  }) {
    const response = await apiClient.put<ApiResponse<BusinessRegistrySettings>>('/api/admin/integrations/business-registry', payload);
    return response.data.data;
  },

  async testSettings() {
    const response = await apiClient.post<ApiResponse<{
      status: string;
      tested_at: string;
    }>>('/api/admin/integrations/business-registry/test');
    return response.data.data;
  },
};
