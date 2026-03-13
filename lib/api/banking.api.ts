import apiClient from './client';

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type BankImportJob = {
  id: string;
  status: string;
  source_type?: 'csv' | 'camt53';
  bank_account_id?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  parsed_data?: Record<string, any> | null;
  original_data?: Record<string, any> | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
};

export type BankImportPreviewRow = {
  row_no: number;
  tx_date: string | null;
  value_date: string | null;
  amount: number;
  currency: string;
  counterparty_name: string | null;
  counterparty_account: string | null;
  description: string | null;
  reference: string | null;
  external_id: string;
  warning_flags: string[];
  needs_review: boolean;
  is_approved: boolean;
  parsed_payload: Record<string, any>;
};

export const bankingApi = {
  async createImportJob(payload: {
    file_name: string;
    file_size: number;
    file_content: string;
    source_type: 'csv' | 'camt53';
    bank_account_id: string;
  }) {
    const response = await apiClient.post<ApiResponse<{ job: BankImportJob }>>('/api/banking/import-jobs', payload);
    return response.data.data;
  },

  async parseImportJob(id: string) {
    const response = await apiClient.post<ApiResponse<{
      job: BankImportJob;
      preview_rows: BankImportPreviewRow[];
      summary: Record<string, any>;
    }>>(`/api/banking/import-jobs/${id}/parse`);
    return response.data.data;
  },

  async commitImportJob(id: string) {
    const response = await apiClient.post<ApiResponse<{
      job: BankImportJob;
      summary: Record<string, any>;
    }>>(`/api/banking/import-jobs/${id}/commit`);
    return response.data.data;
  },
};
