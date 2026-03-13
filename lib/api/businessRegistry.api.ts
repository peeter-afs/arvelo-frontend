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

export type BusinessRegistrySearchItem = {
  registryCode: string | null;
  name: string | null;
  vatNumber?: string | null;
  registryStatus?: string | null;
  source: 'business_registry';
};

export type BusinessRegistryCompany = {
  registryCode: string | null;
  name: string | null;
  vatNumber?: string | null;
  registryStatus?: string | null;
  legalAddress?: string | null;
  postalCode?: string | null;
  city?: string | null;
  countryCode?: string | null;
  source: 'business_registry';
  sourceTimestamp: string;
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

  async searchCompanies(q: string) {
    const response = await apiClient.get<ApiResponse<{
      correlation_id: string;
      items: BusinessRegistrySearchItem[];
    }>>('/api/business-registry/search', {
      params: { q }
    });
    return response.data.data;
  },

  async getCompany(registryCode: string) {
    const response = await apiClient.get<ApiResponse<{
      correlation_id: string;
      company: BusinessRegistryCompany;
    }>>(`/api/business-registry/company/${registryCode}`);
    return response.data.data;
  },
};
