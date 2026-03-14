import apiClient from './client';
import type { Tenant } from '../types/auth.types';

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export const tenantsApi = {
  async createTenant(payload: {
    name: string;
    registry_code?: string;
    vat_number?: string;
    is_vat_registered?: boolean;
    address?: string;
    email?: string;
    phone?: string;
  }) {
    const response = await apiClient.post<ApiResponse<Tenant>>('/api/tenants', payload);
    return response.data.data;
  },

  async listUserTenants() {
    const response = await apiClient.get<ApiResponse<Array<{
      tenant: Tenant;
      role: 'owner' | 'admin' | 'accountant' | 'viewer';
      is_default: boolean;
    }>>>('/api/tenants');
    return response.data.data;
  },
};
