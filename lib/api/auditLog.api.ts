import apiClient from './client';

type ApiResponse<T> = { success: boolean; data: T };

export type AuditEvent = {
  id: string;
  tenant_id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
};

export type AuditLogResponse = {
  events: AuditEvent[];
  total: number;
};

export const auditLogApi = {
  async list(filters?: {
    action?: string;
    resource_type?: string;
    user_email?: string;
    from_date?: string;
    to_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLogResponse> {
    const { data } = await apiClient.get<ApiResponse<AuditLogResponse>>('/audit-log', { params: filters });
    return data.data;
  },
};
