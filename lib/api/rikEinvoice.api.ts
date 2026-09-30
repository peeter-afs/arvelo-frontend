import apiClient from './client';
import type { EinvoiceDispatch } from './bankGateway.api';

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type RikMode = 'send_only' | 'send_receive';
export type RikEnvironment = 'production' | 'test';

export type RikConnectionTest = {
  ok: boolean;
  environment: RikEnvironment;
  url: string | null;
  contracts_total: number;
  company_contract: { registry_code: string; contract_type: string | null; start_date: string | null; end_date: string | null } | null;
  message: string | null;
};

export type RikEinvoiceSettings = {
  /** The server has Arvelo's RIK provider credentials. */
  server_configured: boolean;
  /** Environments this server has credentials for. */
  available_environments: RikEnvironment[];
  /** 'test' = RIK demo (demo-rmp-service.rik.ee); invoices don't reach real buyers. */
  environment: RikEnvironment;
  enabled: boolean;
  mode: RikMode;
  receive_from: string | null;
  contract_status: string | null;
  contract_checked_at: string | null;
  last_receive_at: string | null;
  last_receive_status: string | null;
  last_received_count: number | null;
  last_error: string | null;
};

export const rikEinvoiceApi = {
  async getSettings(): Promise<RikEinvoiceSettings> {
    const response = await apiClient.get<ApiResponse<RikEinvoiceSettings>>('/api/einvoices/rik/settings');
    return response.data.data;
  },

  async updateSettings(input: { enabled: boolean; mode: RikMode; receive_from?: string | null; environment?: RikEnvironment }): Promise<RikEinvoiceSettings> {
    const response = await apiClient.put<ApiResponse<RikEinvoiceSettings>>('/api/einvoices/rik/settings', input);
    return response.data.data;
  },

  async testConnection(environment?: RikEnvironment): Promise<RikConnectionTest> {
    const response = await apiClient.post<ApiResponse<RikConnectionTest>>('/api/einvoices/rik/test-connection', { environment });
    return response.data.data;
  },

  async send(invoiceId: string): Promise<EinvoiceDispatch> {
    const response = await apiClient.post<ApiResponse<EinvoiceDispatch>>(`/api/einvoices/rik/invoices/${invoiceId}/send`);
    return response.data.data;
  },

  async refreshStatuses() {
    const response = await apiClient.post<ApiResponse<{ checked: number; delivered: number; failed: number }>>('/api/einvoices/rik/refresh-statuses');
    return response.data.data;
  },

  async receive() {
    const response = await apiClient.post<ApiResponse<{ received: number; created: number; skipped: number; errors: string[] }>>('/api/einvoices/rik/receive');
    return response.data.data;
  },
};
