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

export type PartnerRegistrySyncLogItem = {
  id: string;
  tenant_id: string;
  partner_id?: string | null;
  registry_code?: string | null;
  sync_type: string;
  request_source?: string | null;
  status: string;
  response_hash?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  duration_ms?: number | null;
  meta?: Record<string, any> | null;
  performed_at: string;
  performed_by?: string | null;
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

  async refreshPartner(partnerId: string, payload?: { include_tax_arrears?: boolean; request_source?: string }) {
    const response = await apiClient.post<ApiResponse<{
      partner: Record<string, any>;
      company: BusinessRegistryCompany;
      tax_arrears?: Record<string, any> | null;
    }>>(`/api/business-registry/refresh/${partnerId}`, payload || {});
    return response.data.data;
  },

  async getPartnerSyncLog(partnerId: string, params?: { limit?: number; offset?: number }) {
    const response = await apiClient.get<ApiResponse<{
      items: PartnerRegistrySyncLogItem[];
      total: number;
      limit: number;
      offset: number;
    }>>(`/api/business-registry/partners/${partnerId}/sync-log`, { params });
    return response.data.data;
  },
};
