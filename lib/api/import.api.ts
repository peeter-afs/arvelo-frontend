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

export const importApi = {
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
      }
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
};
