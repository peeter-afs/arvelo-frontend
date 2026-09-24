import apiClient from './client';

type ApiResponse<T> = { success: boolean; data: T };

export type BillingMode = 'monthly' | 'quarterly' | 'yearly' | 'per_quantity';
export type Frequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type Delivery = 'auto' | 'review';
export type ClientChannel = 'einvoice' | 'email' | 'none';
export type PendingStatus = 'awaiting_quantity' | 'ready' | 'skipped' | 'confirmed' | 'generated';

export type TemplateLine = {
  id: string;
  template_id: string;
  sort_order: number;
  code: string | null;
  description: string;
  account_id: string | null;
  product_id: string | null;
  unit: string | null;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  tax_rate: number;
  variable_quantity: boolean;
};

export type TemplateClient = {
  id: string;
  tenant_id: string;
  template_id: string;
  partner_id: string;
  email: string | null;
  channel: ClientChannel;
  is_active: boolean;
  sort_order: number;
  partner?: {
    id: string;
    name: string;
    reg_code: string | null;
    email: string | null;
    einvoice_iban: string | null;
  } | null;
};

export type TemplateRun = {
  id: string;
  tenant_id: string;
  template_id: string;
  partner_id: string | null;
  template_client_id: string | null;
  period_start: string;
  period_end: string;
  invoice_date: string;
  invoice_id: string | null;
  status: 'pending' | 'generated' | 'failed' | 'skipped';
  delivery_status: string | null;
  delivery_error: string | null;
  quantity: number | null;
  error: string | null;
  created_at: string;
};

export type RecurringTemplate = {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  type: 'sales_invoice' | 'purchase_invoice';
  partner_id: string | null;
  currency: string;
  notes: string | null;
  payment_terms_days: number;
  frequency: Frequency;
  interval_count: number;
  day_of_month: number | null;
  billing_mode: BillingMode;
  billing_period_offset: number;
  delivery: Delivery;
  vat_code: string | null;
  author_user_id: string | null;
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
  clients?: TemplateClient[];
  recent_runs?: TemplateRun[];
  open_pending?: Array<{ id: string; run_date: string; period_start: string; status: PendingStatus }>;
};

export type LineInput = {
  id?: string;
  code?: string | null;
  description: string;
  account_id?: string | null;
  product_id?: string | null;
  unit?: string | null;
  quantity?: number;
  unit_price: number;
  discount_percent?: number;
  tax_rate?: number;
  variable_quantity?: boolean;
};

export type ClientInput = {
  partner_id: string;
  email?: string | null;
  channel?: ClientChannel;
  is_active?: boolean;
};

export type TemplateInput = {
  name: string;
  description?: string | null;
  type?: 'sales_invoice' | 'purchase_invoice';
  currency?: string;
  notes?: string | null;
  payment_terms_days?: number;
  frequency: Frequency;
  interval_count?: number;
  day_of_month?: number | null;
  billing_period_offset?: number;
  delivery?: Delivery;
  vat_code?: string | null;
  period_note_template?: string | null;
  next_invoice_date: string;
  end_date?: string | null;
  is_active?: boolean;
  lines: LineInput[];
  clients: ClientInput[];
};

export type PendingRow = {
  id: string;
  template_id: string;
  template_client_id: string;
  partner_id: string;
  run_date: string;
  period_start: string;
  period_end: string;
  quantities: Record<string, number | null>;
  status: PendingStatus;
  invoice_id: string | null;
  confirmed_at: string | null;
  client: TemplateClient | null;
  previous_quantities: Record<string, number | null> | null;
};

export type QuantitiesData = {
  period: string;
  templates: Array<{ template: RecurringTemplate; rows: PendingRow[] }>;
};

export type GenerateNowResult = {
  generated: number;
  pending_created: number;
  errors: number;
};

export type RecurringSettings = { send_hour: number; last_run_date: string | null };

const base = '/api/recurring-invoices';

export const recurringInvoicesApi = {
  async list(): Promise<RecurringTemplate[]> {
    const { data } = await apiClient.get<ApiResponse<RecurringTemplate[]>>(base);
    return data.data || [];
  },

  async get(id: string): Promise<RecurringTemplate> {
    const { data } = await apiClient.get<ApiResponse<RecurringTemplate>>(`${base}/${id}`);
    return data.data;
  },

  async create(input: TemplateInput): Promise<RecurringTemplate> {
    const { data } = await apiClient.post<ApiResponse<RecurringTemplate>>(base, input);
    return data.data;
  },

  async update(id: string, input: Partial<TemplateInput>): Promise<RecurringTemplate> {
    const { data } = await apiClient.put<ApiResponse<RecurringTemplate>>(`${base}/${id}`, input);
    return data.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`${base}/${id}`);
  },

  async copy(id: string, withClients: boolean): Promise<RecurringTemplate> {
    const { data } = await apiClient.post<ApiResponse<RecurringTemplate>>(`${base}/${id}/copy`, { with_clients: withClients });
    return data.data;
  },

  async generateNow(id: string): Promise<GenerateNowResult> {
    const { data } = await apiClient.post<ApiResponse<GenerateNowResult>>(`${base}/${id}/generate-now`);
    return data.data;
  },

  async listRuns(id: string): Promise<TemplateRun[]> {
    const { data } = await apiClient.get<ApiResponse<TemplateRun[]>>(`${base}/${id}/runs`);
    return data.data || [];
  },

  async getSettings(): Promise<RecurringSettings> {
    const { data } = await apiClient.get<ApiResponse<RecurringSettings>>(`${base}/settings`);
    return data.data;
  },

  async updateSettings(input: { send_hour: number }): Promise<RecurringSettings> {
    const { data } = await apiClient.put<ApiResponse<RecurringSettings>>(`${base}/settings`, input);
    return data.data;
  },

  async getQuantities(period: string): Promise<QuantitiesData> {
    const { data } = await apiClient.get<ApiResponse<QuantitiesData>>(`${base}/quantities`, { params: { period } });
    return data.data;
  },

  async updatePending(id: string, input: { quantities?: Record<string, number | null>; skipped?: boolean }): Promise<PendingRow> {
    const { data } = await apiClient.put<ApiResponse<PendingRow>>(`${base}/quantities/${id}`, input);
    return data.data;
  },

  async copyPreviousQuantities(templateId: string, period: string): Promise<{ updated: number }> {
    const { data } = await apiClient.post<ApiResponse<{ updated: number }>>(`${base}/quantities/copy-previous`, {
      template_id: templateId,
      period,
    });
    return data.data;
  },

  async confirmPending(ids: string[]): Promise<{ confirmed: number; generated: number; failed: number; skipped: number }> {
    const { data } = await apiClient.post<ApiResponse<{ confirmed: number; generated: number; failed: number; skipped: number }>>(
      `${base}/quantities/confirm`,
      { ids },
    );
    return data.data;
  },
};
