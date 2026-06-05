import apiClient from './client';

type ApiResponse<T> = { success: boolean; data: T };

export interface TenantMeta {
  id: string;
  name: string;
  registry_code: string | null;
  vat_number: string | null;
  created_at: string;
  updated_at: string;
  member_count: number;
  entitlement_state: string | null;
}

export interface TenantMember {
  user_id: string;
  email: string;
  name: string | null;
  role: string;
}

export interface UserMeta {
  id: string;
  email: string;
  name: string | null;
  status: string;
  is_platform_admin: boolean;
  email_verified: boolean;
  last_login: string | null;
  created_at: string;
  tenant_count: number;
}

export const adminApi = {
  async listTenants(params?: { search?: string; limit?: number; offset?: number }) {
    const res = await apiClient.get<ApiResponse<{ tenants: TenantMeta[]; total: number }>>(
      '/api/admin/tenants',
      { params }
    );
    return res.data.data;
  },

  async getTenant(id: string) {
    const res = await apiClient.get<ApiResponse<{ tenant: TenantMeta; members: TenantMember[] }>>(
      `/api/admin/tenants/${id}`
    );
    return res.data.data;
  },

  async setTenantStatus(id: string, status: 'active' | 'suspended') {
    await apiClient.patch(`/api/admin/tenants/${id}/status`, { status });
  },

  async deleteTenant(id: string) {
    await apiClient.delete(`/api/admin/tenants/${id}?confirm=true`);
  },

  async setTenantEntitlement(id: string, access_level: string) {
    await apiClient.patch(`/api/admin/tenants/${id}/entitlement`, { access_level });
  },

  async listUsers(params?: { search?: string; limit?: number; offset?: number }) {
    const res = await apiClient.get<ApiResponse<{ users: UserMeta[]; total: number }>>(
      '/api/admin/users',
      { params }
    );
    return res.data.data;
  },

  async setUserStatus(id: string, status: 'active' | 'suspended') {
    await apiClient.patch(`/api/admin/users/${id}/status`, { status });
  },

  async deleteUser(id: string) {
    await apiClient.delete(`/api/admin/users/${id}?confirm=true`);
  },
};
