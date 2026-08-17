import apiClient from './client';

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type BulkConfirmResult = {
  confirmed: number;
  skipped: number;
  failed: number;
  results: Array<{
    invoice_id: string;
    invoice_number?: string | null;
    status: 'confirmed' | 'skipped' | 'failed';
    reason?: string;
  }>;
};

export type InvoiceListItem = {
  id: string;
  type: string;
  status: string;
  invoice_number?: string | null;
  partner_id?: string | null;
  partner_name?: string | null;
  invoice_date: string;
  due_date?: string | null;
  currency: string;
  subtotal?: number | string | null;
  tax_amount?: number | string | null;
  total: number | string;
  paid_amount?: number | string | null;
  open_amount?: number | string | null;
  notes?: string | null;
  payment_reference?: string | null;
  journal_entry_id?: string | null;
  credit_note_for_invoice_id?: string | null;
  created_by_user_id?: string | null;
  created_at: string;
  updated_at: string;
  approval_requested_at?: string | null;
  approval_requested_by_user_id?: string | null;
  approved_at?: string | null;
  approved_by_user_id?: string | null;
  rejected_at?: string | null;
  rejected_by_user_id?: string | null;
  rejection_reason?: string | null;
  source?: string | null;
  bank_transaction_id?: string | null;
  receipt_reminder_state?: string | null;
  receipt_reminder_sent_count?: number | null;
  receipt_reminder_last_sent_at?: string | null;
  receipt_dismissed_reason?: string | null;
};

export type InvoiceLineInput = {
  description: string;
  account_id?: string | null;
  quantity?: number;
  unit_price: number;
  discount_percent?: number;
  tax_rate?: number;
  supply_type?: string;
  meta?: Record<string, any>;
};

export type InvoiceDraftPayload = {
  type: string;
  partner_id?: string;
  invoice_number?: string;
  invoice_date: string;
  due_date?: string;
  currency?: string;
  notes?: string;
  payment_reference?: string;
  credit_note_for_invoice_id?: string;
  lines: InvoiceLineInput[];
};

export const invoicesApi = {
  async listInvoices(params?: {
    type?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const response = await apiClient.get<ApiResponse<InvoiceListItem[]>>('/api/invoices', { params });
    return response.data.data;
  },

  async getInvoice(id: string) {
    const response = await apiClient.get<ApiResponse<{
      invoice: InvoiceListItem;
      lines: Array<{
        id: string;
        description: string;
        quantity: number;
        unit_price: number | string;
        discount_percent?: number | string | null;
        tax_rate?: number | string | null;
        line_total: number | string;
        account_id?: string | null;
        supply_type?: string | null;
        meta?: Record<string, any> | null;
      }>;
    }>>(`/api/invoices/${id}`);
    return response.data.data;
  },

  async submitApproval(id: string) {
    const response = await apiClient.post<ApiResponse<{ invoice: InvoiceListItem }>>(`/api/invoices/${id}/submit-approval`);
    return response.data.data;
  },

  async approve(id: string) {
    const response = await apiClient.post<ApiResponse<{ invoice: InvoiceListItem }>>(`/api/invoices/${id}/approve`);
    return response.data.data;
  },

  async reject(id: string, reason?: string) {
    const response = await apiClient.post<ApiResponse<{ invoice: InvoiceListItem }>>(`/api/invoices/${id}/reject`, {
      reason,
    });
    return response.data.data;
  },

  async confirm(id: string) {
    const response = await apiClient.post<ApiResponse<{ invoice: InvoiceListItem; journal_entry_id: string }>>(`/api/invoices/${id}/confirm`);
    return response.data.data;
  },

  /** Confirm many drafts at once. Posts each on its own, so the result reports
   *  per-invoice outcomes instead of failing the whole batch. Max 200 per call. */
  async bulkConfirm(invoiceIds: string[]) {
    const response = await apiClient.post<ApiResponse<BulkConfirmResult>>('/api/invoices/bulk-confirm', {
      invoice_ids: invoiceIds,
    }, { timeout: 180000 });
    return response.data.data;
  },

  async createInvoice(payload: InvoiceDraftPayload) {
    const response = await apiClient.post<ApiResponse<{
      invoice: InvoiceListItem;
      lines: Array<{
        id: string;
        description: string;
        quantity: number;
        unit_price: number | string;
        discount_percent?: number | string | null;
        tax_rate?: number | string | null;
        line_total: number | string;
        account_id?: string | null;
        meta?: Record<string, any> | null;
      }>;
    }>>('/api/invoices', payload);
    return response.data.data;
  },

  async updateInvoice(id: string, payload: InvoiceDraftPayload) {
    const response = await apiClient.put<ApiResponse<{
      invoice: InvoiceListItem;
      lines: Array<{
        id: string;
        description: string;
        quantity: number;
        unit_price: number | string;
        discount_percent?: number | string | null;
        tax_rate?: number | string | null;
        line_total: number | string;
        account_id?: string | null;
        meta?: Record<string, any> | null;
      }>;
    }>>(`/api/invoices/${id}`, payload);
    return response.data.data;
  },

  async sendInvoice(id: string, payload?: { to?: string; message?: string }) {
    const response = await apiClient.post<ApiResponse<{
      invoice: InvoiceListItem;
      sent_to: string;
      subject: string;
    }>>(`/api/invoices/${id}/send`, payload || {});
    return response.data.data;
  },

  async exportInvoice(id: string, format: 'pdf' | 'html' | 'json' = 'pdf') {
    const response = await apiClient.get<Blob>(`/api/invoices/${id}/export`, {
      params: { format },
      responseType: 'blob',
    });

    const disposition = response.headers['content-disposition'] as string | undefined;
    const match = disposition?.match(/filename="([^"]+)"/);
    return {
      blob: response.data,
      filename: match?.[1] || `invoice-${id}.${format}`,
      contentType: response.headers['content-type'] as string | undefined,
    };
  },
};
