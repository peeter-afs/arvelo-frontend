import apiClient from './client';

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type AnnualReportSubmission = {
  id: string;
  tenant_id: string;
  fiscal_year_id: string;
  status: 'draft' | 'generating' | 'generated' | 'submitting' | 'submitted' | 'accepted' | 'rejected' | 'error';
  rik_document_id?: string | null;
  submitted_at?: string | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
  fiscal_year?: {
    id: string;
    date_start: string;
    date_end: string;
    is_closed: boolean;
  };
};

export const annualReportApi = {
  async listSubmissions() {
    const response = await apiClient.get<ApiResponse<AnnualReportSubmission[]>>('/api/annual-reports');
    return response.data.data;
  },

  async createSubmission(fiscalYearId: string) {
    const response = await apiClient.post<ApiResponse<AnnualReportSubmission>>('/api/annual-reports', {
      fiscal_year_id: fiscalYearId,
    });
    return response.data.data;
  },

  async generateXbrl(id: string) {
    const response = await apiClient.post<ApiResponse<AnnualReportSubmission>>(`/api/annual-reports/${id}/generate`);
    return response.data.data;
  },

  async downloadXbrl(id: string) {
    const response = await apiClient.get(`/api/annual-reports/${id}/xbrl`, {
      responseType: 'blob',
    });
    return response.data as Blob;
  },

  async submitToRik(id: string) {
    const response = await apiClient.post<ApiResponse<{ status: string; rik_document_id: string }>>(`/api/annual-reports/${id}/submit`);
    return response.data.data;
  },

  async checkStatus(id: string) {
    const response = await apiClient.get<ApiResponse<{ rik_status: string; details: any }>>(`/api/annual-reports/${id}/status`);
    return response.data.data;
  },
};
