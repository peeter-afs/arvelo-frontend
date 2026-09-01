import apiClient from './client';

type ApiResponse<T> = { success: boolean; data: T };

export type TenantTwoFactorPolicy = {
  /** Requirement is active right now. */
  required: boolean;
  required_from: string | null;
  /** Set when the requirement is scheduled but not active yet. */
  scheduled_from: string | null;
  grace_days: number;
};

export type TwoFactorUserStatus = {
  required: boolean;
  scheduled_from: string | null;
  grace_days: number;
  satisfied: boolean;
  deadline: string | null;
  blocked: boolean;
};

export const tenantSecurityApi = {
  async getPolicy() {
    const response = await apiClient.get<ApiResponse<TenantTwoFactorPolicy>>('/api/tenant-admin/security');
    return response.data.data;
  },

  async updatePolicy(payload: { enabled: boolean; grace_days?: number }) {
    const response = await apiClient.put<ApiResponse<TenantTwoFactorPolicy>>('/api/tenant-admin/security', payload);
    return response.data.data;
  },

  /** Where the signed-in user stands against their tenant's requirement. */
  async getMyStatus() {
    const response = await apiClient.get<ApiResponse<{ two_factor: TwoFactorUserStatus | null }>>('/api/auth/me');
    return response.data.data.two_factor;
  },
};
