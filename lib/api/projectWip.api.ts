import apiClient from './client';

type ApiResponse<T> = { success: boolean; data: T };

/** Lõpetamata tööd (project WIP, backend /api/project-wip, migration 103). */
export type WipReleaseMode = 'all' | 'percent' | 'amount';

export type WipPlan = {
  mode: WipReleaseMode;
  percent?: number | null;
  amount?: number | null;
  /** source journal line id → percent (lines the user changed by hand) */
  line_overrides?: Record<string, number> | null;
};

/** Stored on a sales invoice draft as invoices.meta.wip_release. */
export type InvoiceWipPlan = WipPlan & { project_id: string; enabled?: boolean };

export type WipSourceLine = {
  id: string;
  journal_entry_id: string;
  entry_number: string | null;
  entry_date: string;
  source_document_schema: string | null;
  source_document_id: string | null;
  invoice_number: string | null;
  partner_id: string | null;
  partner_name: string | null;
  description: string;
  cost_center_id: string | null;
  amount: number;
  released: number;
  remaining: number;
};

export type WipAllocationLine = { source_id: string; remaining: number; percent: number; amount: number };

export type WipPreview = {
  lines: WipAllocationLine[];
  remaining_total: number;
  amount: number;
  percent: number;
  sources: WipSourceLine[];
};

export type WipRelease = {
  id: string;
  project_id: string;
  sales_invoice_id: string | null;
  journal_entry_id: string | null;
  release_date: string;
  amount: number;
  percent: number | null;
  mode: 'invoice' | 'manual';
  status: 'pending' | 'posted' | 'failed' | 'reversed';
  error_message: string | null;
  description: string | null;
  plan: WipPlan;
  reversal_journal_entry_id: string | null;
  reversal_reason: string | null;
  reversed_at: string | null;
  created_at: string;
};

export type WipProjectBalance = {
  project_id: string;
  code: string | null;
  name: string;
  is_active: boolean;
  wip_enabled: boolean;
  partner_id: string | null;
  balance: number;
};

export type WipSettings = { wip_account_id: string; wip_cost_account_id: string };

export const projectWipApi = {
  async settings() {
    return (await apiClient.get<ApiResponse<WipSettings>>('/api/project-wip/settings')).data.data;
  },
  async updateSettings(input: Partial<{ wip_account_id: string | null; wip_cost_account_id: string | null }>) {
    return (await apiClient.put<ApiResponse<WipSettings>>('/api/project-wip/settings', input)).data.data;
  },
  async summary(asOf?: string) {
    return (await apiClient.get<ApiResponse<WipProjectBalance[]>>('/api/project-wip', { params: asOf ? { as_of: asOf } : undefined })).data.data;
  },
  async detail(projectId: string) {
    return (await apiClient.get<ApiResponse<{ project: { id: string; code: string | null; name: string }; sources: WipSourceLine[]; releases: WipRelease[]; remaining: number }>>(`/api/project-wip/${projectId}`)).data.data;
  },
  async preview(projectId: string, plan: WipPlan) {
    return (await apiClient.post<ApiResponse<WipPreview>>(`/api/project-wip/${projectId}/preview`, plan)).data.data;
  },
  async release(projectId: string, input: WipPlan & { date: string; description?: string | null }) {
    return (await apiClient.post<ApiResponse<WipRelease>>(`/api/project-wip/${projectId}/release`, input)).data.data;
  },
  async invoiceReleases(invoiceId: string) {
    return (await apiClient.get<ApiResponse<WipRelease[]>>(`/api/project-wip/invoices/${invoiceId}/releases`)).data.data;
  },
  async retry(releaseId: string) {
    return (await apiClient.post<ApiResponse<WipRelease>>(`/api/project-wip/releases/${releaseId}/retry`)).data.data;
  },
  async reverse(releaseId: string, input: { reason?: string | null; date?: string | null } = {}) {
    return (await apiClient.post<ApiResponse<WipRelease>>(`/api/project-wip/releases/${releaseId}/reverse`, input)).data.data;
  },
};

