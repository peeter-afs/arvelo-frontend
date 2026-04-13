import apiClient from './client';

type ApiResponse<T> = { success: boolean; data: T };

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
  next_invoice_date: string;
  end_date: string | null;
  is_active: boolean;
  last_generated_at: string | null;
  invoices_generated: number;
  created_at: string;
  updated_at: string;
  lines?: TemplateLine[];
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
};
