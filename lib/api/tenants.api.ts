import apiClient from './client';
import type { Tenant, UserRole } from '../types/auth.types';

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type TenantMember = {
  user: {
    id: string;
    email: string;
    name: string | null;
    status: string;
    email_verified: boolean;
    last_login: string | null;
    created_at: string;
  };
  role: UserRole;
  is_default: boolean;
};

export const tenantsApi = {
  async getMembers(tenantId: string) {
    const response = await apiClient.get<ApiResponse<TenantMember[]>>(`/api/tenants/${tenantId}/members`);
    return response.data.data;
  },

  async createMember(tenantId: string, payload: { email: string; name?: string; password: string; role: UserRole }) {
    const response = await apiClient.post<ApiResponse<{ id: string; email: string; name: string | null }>>(
      `/api/tenants/${tenantId}/members/create`,
      payload
    );
    return response.data.data;
  },

  async inviteMember(tenantId: string, payload: { email: string; role: UserRole }) {
    const response = await apiClient.post<ApiResponse<{ message: string }>>(
      `/api/tenants/${tenantId}/members`,
      payload
    );
    return response.data;
  },

  async updateMemberRole(tenantId: string, userId: string, role: UserRole) {
    const response = await apiClient.put<ApiResponse<void>>(`/api/tenants/${tenantId}/members/${userId}`, { role });
    return response.data;
  },

  async updateMemberProfile(tenantId: string, userId: string, payload: { name?: string; email?: string; password?: string }) {
    const response = await apiClient.put<ApiResponse<void>>(`/api/tenants/${tenantId}/members/${userId}/profile`, payload);
    return response.data;
  },

  async removeMember(tenantId: string, userId: string) {
    const response = await apiClient.delete<ApiResponse<void>>(`/api/tenants/${tenantId}/members/${userId}`);
    return response.data;
  },

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
