import apiClient from './client';

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

// ─── cash desk ──────────────────────────────────────────────────────────────

export type CashOrderType = 'receipt' | 'disbursement';

export type CashOrder = {
  id: string;
  payment_method_id: string;
  order_type: CashOrderType;
  order_number: string;
  order_date: string;
  amount: number;
  currency: string;
  partner_id: string | null;
  person_name: string | null;
  description: string;
  counter_account_id: string | null;
  invoice_id: string | null;
  payment_id: string | null;
  journal_entry_id: string | null;
  status: 'posted' | 'void';
  void_reason: string | null;
  created_at: string;
};

export type CashOrderInput = {
  payment_method_id: string;
  order_type: CashOrderType;
  order_date: string;
  amount: number;
  description: string;
  partner_id?: string | null;
  person_name?: string | null;
  invoice_id?: string | null;
  counter_account_id?: string | null;
  allow_negative?: boolean;
};

export type CashBook = {
  cash_desk: { id: string; name: string; account_id: string };
  account: { code: string; name: string };
  date_from: string;
  date_to: string;
  opening_balance: number;
  total_receipts: number;
  total_disbursements: number;
  closing_balance: number;
  went_negative: boolean;
  lines: Array<{
    journal_entry_id: string;
    date: string;
    order_id: string | null;
    order_number: string | null;
    order_status: 'posted' | 'void' | null;
    description: string;
    partner: string | null;
    receipt: number;
    disbursement: number;
    balance: number;
  }>;
};

export const cashOrdersApi = {
  async cashBook(params: { payment_method_id: string; date_from: string; date_to: string }): Promise<CashBook> {
    const response = await apiClient.get<ApiResponse<CashBook>>('/api/cash-orders/cash-book', { params });
    return response.data.data;
  },

  async list(params?: { payment_method_id?: string; date_from?: string; date_to?: string }): Promise<CashOrder[]> {
    const response = await apiClient.get<ApiResponse<CashOrder[]>>('/api/cash-orders', { params });
    return response.data.data;
  },

  async get(id: string): Promise<CashOrder> {
    const response = await apiClient.get<ApiResponse<CashOrder>>(`/api/cash-orders/${id}`);
    return response.data.data;
  },

  async create(input: CashOrderInput): Promise<CashOrder> {
    const response = await apiClient.post<ApiResponse<CashOrder>>('/api/cash-orders', input);
    return response.data.data;
  },

  async void(id: string, reason?: string): Promise<CashOrder> {
    const response = await apiClient.post<ApiResponse<CashOrder>>(`/api/cash-orders/${id}/void`, { reason });
    return response.data.data;
  },
};

// ─── expense reports ────────────────────────────────────────────────────────

export type ExpenseReportStatus = 'draft' | 'submitted' | 'approved' | 'reimbursed';

export type ExpenseReportListItem = {
  id: string;
  report_number: string;
  employee_partner_id: string;
  employee_name: string | null;
  report_date: string;
  description: string | null;
  status: ExpenseReportStatus;
  receipt_count: number;
  total: number;
};

export type ExpenseReceipt = {
  id: string;
  status: string;
  vendor_partner_id: string | null;
  vendor_name: string | null;
  receipt_number: string | null;
  receipt_date: string;
  description: string;
  account_id: string | null;
  tax_rate: number;
  subtotal: number;
  tax_amount: number;
  total: number;
  document_id: string | null;
};

export type ExpenseReport = Omit<ExpenseReportListItem, 'receipt_count'> & {
  settlement_account_id: string;
  settlement_account: { id: string; code: string; name: string } | null;
  employee_balance: number;
  submitted_at: string | null;
  approved_at: string | null;
  reimbursed_at: string | null;
  receipts: ExpenseReceipt[];
};

export type ReceiptInput = {
  vendor_partner_id?: string | null;
  vendor_name?: string | null;
  receipt_number?: string | null;
  receipt_date: string;
  description: string;
  account_id: string;
  gross_amount: number;
  tax_rate: number;
};

export const expenseReportsApi = {
  async list(params?: { status?: string }): Promise<ExpenseReportListItem[]> {
    const response = await apiClient.get<ApiResponse<ExpenseReportListItem[]>>('/api/expense-reports', { params });
    return response.data.data;
  },

  async get(id: string): Promise<ExpenseReport> {
    const response = await apiClient.get<ApiResponse<ExpenseReport>>(`/api/expense-reports/${id}`);
    return response.data.data;
  },

  async create(input: { employee_partner_id: string; report_date: string; description?: string | null }) {
    const response = await apiClient.post<ApiResponse<{ id: string; report_number: string }>>('/api/expense-reports', input);
    return response.data.data;
  },

  /** Multipart: the receipt image/PDF is optional. */
  async addReceipt(id: string, input: ReceiptInput, file?: File | null): Promise<ExpenseReport> {
    const form = new FormData();
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined && value !== null && value !== '') form.append(key, String(value));
    }
    if (file) form.append('file', file);
    const response = await apiClient.post<ApiResponse<ExpenseReport>>(`/api/expense-reports/${id}/receipts`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
  },

  async removeReceipt(id: string, invoiceId: string): Promise<ExpenseReport> {
    const response = await apiClient.delete<ApiResponse<ExpenseReport>>(`/api/expense-reports/${id}/receipts/${invoiceId}`);
    return response.data.data;
  },

  async submit(id: string) {
    await apiClient.post(`/api/expense-reports/${id}/submit`);
  },

  async approve(id: string) {
    await apiClient.post(`/api/expense-reports/${id}/approve`);
  },

  async markReimbursed(id: string) {
    await apiClient.post(`/api/expense-reports/${id}/reimbursed`);
  },

  async remove(id: string) {
    await apiClient.delete(`/api/expense-reports/${id}`);
  },
};
