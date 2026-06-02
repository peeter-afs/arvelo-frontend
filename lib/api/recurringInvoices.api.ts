import apiClient from './client';

type ApiResponse<T> = { success: boolean; data: T };

export type BillingMode = 'monthly' | 'quarterly' | 'yearly' | 'per_quantity';

export type TemplateLine = {
  id: string;
  template_id: string;
  sort_order: number;
  description: string;
  account_id: string | null;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_rate: number;
};

export type RecurringTemplate = {
  id: string;
  tenant_id: string;
  name: string;
  type: 'sales_invoice' | 'purchase_invoice';
  partner_id: string | null;
  currency: string;
  notes: string | null;
  payment_terms_days: number;
  frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  interval_count: number;
  day_of_month: number | null;
  billing_mode: BillingMode;
  period_note_template: string | null;
  next_invoice_date: string;
  end_date: string | null;
  is_active: boolean;
  last_generated_at: string | null;
  invoices_generated: number;
  latest_run_status: string | null;
  created_at: string;
  updated_at: string;
  lines?: TemplateLine[];
};

export type TemplateRun = {
  id: string;
  tenant_id: string;
  template_id: string;
  period_start: string;
  period_end: string;
  invoice_date: string;
  invoice_id: string | null;
  status: 'generated' | 'failed' | 'skipped';
  quantity: number | null;
  error: string | null;
  created_at: string;
};

export const recurringInvoicesApi = {
  async list(): Promise<RecurringTemplate[]> {
    const { data } = await apiClient.get<ApiResponse<RecurringTemplate[]>>('/recurring-invoices');
    return data.data;
  },

  async get(id: string): Promise<RecurringTemplate> {
    const { data } = await apiClient.get<ApiResponse<RecurringTemplate>>(`/recurring-invoices/${id}`);
    return data.data;
  },

  async create(input: {
    name: string;
    type: 'sales_invoice' | 'purchase_invoice';
    partner_id?: string;
    currency?: string;
    notes?: string;
    payment_terms_days?: number;
    frequency: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
    interval_count?: number;
    day_of_month?: number;
    billing_mode?: BillingMode;
    period_note_template?: string;
    next_invoice_date: string;
    end_date?: string;
    lines: Array<{
      description: string;
      account_id?: string;
      quantity?: number;
      unit_price: number;
      discount_percent?: number;
      tax_rate?: number;
    }>;
  }): Promise<RecurringTemplate> {
    const { data } = await apiClient.post<ApiResponse<RecurringTemplate>>('/recurring-invoices', input);
    return data.data;
  },

  async update(id: string, input: Partial<{
    name: string;
    partner_id: string;
    notes: string;
    payment_terms_days: number;
    frequency: string;
    interval_count: number;
    day_of_month: number;
    billing_mode: string;
    period_note_template: string;
    next_invoice_date: string;
    end_date: string;
    is_active: boolean;
  }>): Promise<RecurringTemplate> {
    const { data } = await apiClient.put<ApiResponse<RecurringTemplate>>(`/recurring-invoices/${id}`, input);
    return data.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/recurring-invoices/${id}`);
  },

  async generateDue(asOfDate?: string): Promise<{ generated: number; errors: number }> {
    const { data } = await apiClient.post<ApiResponse<{ generated: number; errors: number }>>('/recurring-invoices/generate', { as_of_date: asOfDate });
    return data.data;
  },

  async listRuns(id: string): Promise<TemplateRun[]> {
    const { data } = await apiClient.get<ApiResponse<TemplateRun[]>>(`/recurring-invoices/${id}/runs`);
    return data.data;
  },

  async generatePeriod(id: string, input: {
    period_start: string;
    period_end: string;
    quantity?: number;
    invoice_date?: string;
  }): Promise<TemplateRun> {
    const { data } = await apiClient.post<ApiResponse<TemplateRun>>(`/recurring-invoices/${id}/generate-period`, input);
    return data.data;
  },
};
