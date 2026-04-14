import apiClient from './client';

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type PurchaseInvoiceImportListItem = {
  id: string;
  status: string;
  source_type: string;
  file_name?: string | null;
  file_size?: number | null;
  mime_type?: string | null;
  preview_data?: Record<string, any> | null;
  supplier_resolution?: Record<string, any> | null;
  duplicate_check?: Record<string, any> | null;
  warning_flags?: string[] | null;
  confidence_score?: number | null;
  document_id?: string | null;
  draft_invoice_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type PurchaseInvoiceImportDetail = {
  import: PurchaseInvoiceImportListItem & {
    extracted_text?: string | null;
    parsed_data?: Record<string, any> | null;
  };
  supplier_match_candidates: Array<{
    id: string;
    matched_partner_id?: string | null;
    match_score: number;
    is_selected?: boolean;
    is_existing_partner?: boolean;
    candidate_payload?: Record<string, any> | null;
    match_reasons?: string[] | null;
    status?: string;
  }>;
};

export type OpeningBalanceImportResult = {
  mode: 'general' | 'receivables' | 'payables';
  document_id: string;
  file_name: string;
  opening_date: string;
  detected_opening_date?: string | null;
  model: string;
  request_id?: string;
  extracted_text_preview?: string;
  suggested_payload: {
    opening_date: string;
    currency: string;
    source_document_id: string;
    lines: Array<Record<string, any>>;
    offset_account_id?: string | null;
  };
  import_summary?: Record<string, any>;
  warnings?: string[];
};

export type AccountImportRow = {
  code: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  parent_code?: string | null;
  status: 'new' | 'existing' | 'conflict' | 'invalid';
  existing_account_id?: string | null;
  warnings: string[];
};

export type AccountImportParseResult = {
  parsed_accounts: AccountImportRow[];
  warnings: string[];
};

export type AccountImportCommitResult = {
  created: number;
  skipped: number;
  errors: string[];
};

export const importApi = {
  async parseOpeningBalancePdf(file: File, payload: { mode: 'general' | 'receivables' | 'payables'; opening_date: string }) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', payload.mode);
    formData.append('opening_date', payload.opening_date);

    const response = await apiClient.post<ApiResponse<OpeningBalanceImportResult>>('/api/import/opening-balances/parse', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 120000
    });
    return response.data.data;
  },

  async listPurchaseInvoiceImports(params?: { status?: string; limit?: number; offset?: number }) {
    const response = await apiClient.get<ApiResponse<{
      items: PurchaseInvoiceImportListItem[];
      total: number;
      limit: number;
      offset: number;
    }>>('/api/import/purchase-invoices', { params });
    return response.data.data;
  },

  async getPurchaseInvoiceImport(id: string) {
    const response = await apiClient.get<ApiResponse<PurchaseInvoiceImportDetail>>(`/api/import/purchase-invoices/${id}`);
    return response.data.data;
  },

  async uploadPurchaseInvoicePdf(file: File, extra?: Record<string, string>) {
    const formData = new FormData();
    formData.append('file', file);
    Object.entries(extra || {}).forEach(([key, value]) => {
      formData.append(key, value);
    });

    const response = await apiClient.post<ApiResponse<PurchaseInvoiceImportDetail>>('/api/import/purchase-invoices/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 120000
    });
    return response.data.data;
  },

  async updatePurchaseInvoicePreview(id: string, previewData: Record<string, any>) {
    const response = await apiClient.put<ApiResponse<{ import: PurchaseInvoiceImportListItem }>>(
      `/api/import/purchase-invoices/${id}/preview`,
      { preview_data: previewData }
    );
    return response.data.data;
  },

  async resolveSupplier(id: string, payload: Record<string, any>) {
    const response = await apiClient.post<ApiResponse<PurchaseInvoiceImportDetail>>(
      `/api/import/purchase-invoices/${id}/resolve-supplier`,
      payload
    );
    return response.data.data;
  },

  async createDraftInvoice(
    id: string,
    payload: {
      confirm_duplicate_warning?: boolean;
      selected_partner_id?: string;
      preview_data?: Record<string, any>;
      lines?: Array<Record<string, any>>;
    }
  ) {
    const response = await apiClient.post<ApiResponse<any>>(`/api/import/purchase-invoices/${id}/create-draft`, payload);
    return response.data.data;
  },

  async parseAccountImport(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ApiResponse<AccountImportParseResult>>(
      '/api/import/accounts/parse',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 }
    );
    return response.data.data;
  },

  async commitAccountImport(accounts: Array<{ code: string; name: string; type: string }>) {
    const response = await apiClient.post<ApiResponse<AccountImportCommitResult>>(
      '/api/import/accounts/commit',
      { accounts }
    );
    return response.data.data;
  },
};
