import apiClient from './client';

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type AiInvoiceLine = {
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
};

export type ParsedInvoiceDraft = {
  partner_name: string | null;
  partner_registry_code: string | null;
  partner_vat_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  currency: string;
  lines: AiInvoiceLine[];
  notes: string | null;
  confidence: number;
};

export type PartnerMatch = {
  partner_id: string;
  name: string;
  score: number;
  reasons: string[];
};

export type AiInvoicePreview = {
  parsed: ParsedInvoiceDraft;
  partner_matches: PartnerMatch[];
  warnings: string[];
  blocking_errors: string[];
};

export type AiSettings = {
  ai_provider: 'claude' | 'openai' | 'disabled';
  ai_model: string;
};

export const aiInvoiceApi = {
  async parse(text: string): Promise<AiInvoicePreview> {
    const response = await apiClient.post<ApiResponse<AiInvoicePreview>>(
      '/api/ai-invoice/parse',
      { text }
    );
    return response.data.data;
  },

  async confirm(input: {
    parsed: ParsedInvoiceDraft;
    partner_id: string;
  }): Promise<{ invoice: any; lines: any[] }> {
    const response = await apiClient.post<
      ApiResponse<{ invoice: any; lines: any[] }>
    >('/api/ai-invoice/confirm', input);
    return response.data.data;
  },

  async getSettings(): Promise<AiSettings> {
    const response = await apiClient.get<ApiResponse<AiSettings>>(
      '/api/ai-invoice/settings'
    );
    return response.data.data;
  },

  async updateSettings(settings: {
    ai_provider: string;
    ai_model?: string;
  }): Promise<AiSettings> {
    const response = await apiClient.put<ApiResponse<AiSettings>>(
      '/api/ai-invoice/settings',
      settings
    );
    return response.data.data;
  },
};
