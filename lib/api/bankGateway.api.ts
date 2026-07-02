import apiClient from './client';

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type BankGatewayProvider = 'lhv_connect' | 'swedbank_gateway';

export type BankGatewaySettings = {
  provider: BankGatewayProvider;
  enabled: boolean;
  platform_configured: boolean;
  client_code: string | null;
  client_country: string;
  agreement_id: string | null;
  einvoice_agreement_id: string | null;
  sync_window_days: number;
  start_date: string | null;
  auto_commit: boolean;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_imported_count: number | null;
  last_error_message: string | null;
  last_test_status: string | null;
  last_test_at: string | null;
  contract_id: string | null;
  contract_status: string | null;
  contract_requested_at: string | null;
  contract_start_date: string | null;
  contract_services: Array<{ name: string; ibans?: string[] }> | null;
  updated_at: string | null;
};

export type LhvContractStatus = {
  client_code: string | null;
  contract_id: string | null;
  contract_status: string | null;
  contract_requested_at: string | null;
  contract_start_date: string | null;
  contract_services: Array<{ name: string; ibans?: string[] }> | null;
  customer_name?: string | null;
};

export type BankGatewaySyncResult = {
  skipped?: boolean;
  skip_reason?: string;
  statements_requested: number;
  messages_processed: number;
  jobs_created: number;
  imported_count: number;
  pending_response: boolean;
  errors: string[];
};

export type BankGatewaySyncRun = {
  id: string;
  provider: BankGatewayProvider;
  trigger: string | null;
  status: string;
  started_at: string;
  finished_at: string | null;
  statements_requested: number;
  messages_processed: number;
  jobs_created: number;
  imported_count: number;
  error_message: string | null;
};

export type EinvoiceDispatch = {
  id: string;
  invoice_id: string;
  provider: string;
  channel_id: string;
  recipient_iban: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  request_id: string | null;
  fail_reason: string | null;
  sent_at: string | null;
  resolved_at: string | null;
  created_at: string;
};

export const bankGatewayApi = {
  async getSettings() {
    const response = await apiClient.get<ApiResponse<BankGatewaySettings[]>>('/api/banking/gateways');
    return response.data.data;
  },

  async updateSettings(provider: BankGatewayProvider, payload: {
    enabled?: boolean;
    client_code?: string | null;
    client_country?: string;
    agreement_id?: string | null;
    einvoice_agreement_id?: string | null;
    sync_window_days?: number;
    start_date?: string | null;
    auto_commit?: boolean;
  }) {
    const response = await apiClient.put<ApiResponse<BankGatewaySettings>>(`/api/banking/gateways/${provider}`, payload);
    return response.data.data;
  },

  async testConnection(provider: BankGatewayProvider) {
    const response = await apiClient.post<ApiResponse<{ ok: boolean; detail: string }>>(
      `/api/banking/gateways/${provider}/test`
    );
    return response.data.data;
  },

  async sync(provider: BankGatewayProvider, payload?: { force?: boolean }) {
    const response = await apiClient.post<ApiResponse<BankGatewaySyncResult>>(
      `/api/banking/gateways/${provider}/sync`,
      payload || { force: true }
    );
    return response.data.data;
  },

  async listRuns(provider?: BankGatewayProvider) {
    const response = await apiClient.get<ApiResponse<BankGatewaySyncRun[]>>('/api/banking/gateways/runs', {
      params: provider ? { provider } : undefined,
    });
    return response.data.data;
  },

  async initiateLhvContract(payload?: { client_code?: string; client_country?: string }) {
    const response = await apiClient.post<ApiResponse<LhvContractStatus & { contract_container: string | null }>>(
      '/api/banking/gateways/lhv_connect/contract',
      payload || {}
    );
    return response.data.data;
  },

  async getLhvContractStatus() {
    const response = await apiClient.get<ApiResponse<LhvContractStatus>>(
      '/api/banking/gateways/lhv_connect/contract'
    );
    return response.data.data;
  },

  async previewEinvoice(invoiceId: string, recipientIban: string) {
    const response = await apiClient.get<ApiResponse<{ xml: string; channel_id: string; recipient_iban: string }>>(
      `/api/invoices/${invoiceId}/einvoice/preview`,
      { params: { recipient_iban: recipientIban } }
    );
    return response.data.data;
  },

  async sendEinvoice(invoiceId: string, payload: { recipient_iban: string; remember_iban?: boolean }) {
    const response = await apiClient.post<ApiResponse<EinvoiceDispatch>>(
      `/api/invoices/${invoiceId}/einvoice/send`,
      payload
    );
    return response.data.data;
  },

  async listEinvoiceDispatches(invoiceId: string) {
    const response = await apiClient.get<ApiResponse<EinvoiceDispatch[]>>(
      `/api/invoices/${invoiceId}/einvoice/dispatches`
    );
    return response.data.data;
  },
};
