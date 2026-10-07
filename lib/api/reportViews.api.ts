import apiClient from './client';
import type { ReportSlug } from '@/lib/reports/registry';

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

/** A saved report view: filters only (period preset or dates, comparison, toggles), never data. */
export type ReportView = {
  id: string;
  owner_user_id: string;
  name: string;
  report: ReportSlug;
  filters: Record<string, string>;
  shared: boolean;
  created_at: string;
  updated_at: string;
};

export const reportViewsApi = {
  /** Own views plus the company's shared ones. */
  async list() {
    const response = await apiClient.get<ApiResponse<ReportView[]>>('/api/report-views');
    return response.data.data;
  },

  async create(payload: { name: string; report: ReportSlug; filters: Record<string, string>; shared: boolean }) {
    const response = await apiClient.post<ApiResponse<ReportView>>('/api/report-views', payload);
    return response.data.data;
  },

  async update(id: string, payload: { name?: string; filters?: Record<string, string>; shared?: boolean }) {
    const response = await apiClient.put<ApiResponse<ReportView>>(`/api/report-views/${id}`, payload);
    return response.data.data;
  },

  async remove(id: string) {
    await apiClient.delete(`/api/report-views/${id}`);
  },
};
