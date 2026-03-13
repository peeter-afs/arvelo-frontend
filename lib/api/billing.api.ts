import apiClient from './client';

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type BillingPlan = {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
};

export type BillingSubscription = {
  id: string;
  tenant_id: string;
  plan_id: string;
  plan_code?: string;
  plan_name?: string;
  status: 'active' | 'paused' | 'canceled';
  billing_cycle: 'calendar_month';
  billing_day: number;
  current_period_start: string;
  current_period_end: string;
  next_invoice_date: string;
  unit_price: number | string;
  quantity: number | string;
  discount_percent: number | string;
  vat_rate?: number | string | null;
  currency: string;
  cancel_at_period_end: boolean;
};

export type BillingInvoice = {
  id: string;
  tenant_id: string;
  subscription_id: string;
  invoice_no: number;
  status: 'draft' | 'issued' | 'paid' | 'void' | 'overdue';
  issue_date: string;
  due_date: string;
  period_start: string;
  period_end: string;
  currency: string;
  subtotal: number | string;
  discount_total: number | string;
  vat_rate: number | string;
  vat_total: number | string;
  total: number | string;
  reference_number?: string | null;
  created_at: string;
  updated_at: string;
};

export type BillingEntitlement = {
  tenant_id: string;
  access_state: 'active' | 'grace' | 'read_only' | 'locked';
  grace_started_at?: string | null;
  last_paid_invoice_id?: string | null;
  last_payment_at?: string | null;
  updated_at: string;
};

export type BillingSettings = {
  tenant_id: string;
  bill_to_name: string;
  bill_to_registry_code?: string | null;
  bill_to_vat_number?: string | null;
  bill_to_address?: string | null;
  invoice_due_days: number;
  vat_rate: number | string;
  vat_enabled: boolean;
  currency: string;
  invoice_next_no: number;
};

export const billingApi = {
  async getOverview() {
    const response = await apiClient.get<ApiResponse<{
      settings: BillingSettings | null;
      entitlement: BillingEntitlement | null;
      subscription: BillingSubscription | null;
      plans: BillingPlan[];
      invoices: BillingInvoice[];
    }>>('/api/billing/overview');
    return response.data.data;
  },

  async upsertSubscription(payload: Record<string, any>) {
    const response = await apiClient.put<ApiResponse<{ subscription: BillingSubscription }>>('/api/billing/subscription', payload);
    return response.data.data;
  },

  async generateInvoices() {
    const response = await apiClient.post<ApiResponse<{ created_count: number; invoices: BillingInvoice[] }>>('/api/billing/jobs/generate-invoices');
    return response.data.data;
  },

  async recomputeEntitlements() {
    const response = await apiClient.post<ApiResponse<{ entitlement: BillingEntitlement; overdue_invoice_id?: string | null }>>('/api/billing/jobs/recompute-entitlements');
    return response.data.data;
  },

  async markInvoicePaid(id: string, payload?: { amount?: number; method?: 'manual' | 'bank_import'; note?: string; paid_at?: string }) {
    const response = await apiClient.post<ApiResponse<{ invoice: BillingInvoice }>>(`/api/billing/invoices/${id}/mark-paid`, payload || {});
    return response.data.data;
  },
};
