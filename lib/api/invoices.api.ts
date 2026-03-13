import apiClient from './client';

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type InvoiceListItem = {
  id: string;
  type: string;
  status: string;
  invoice_number?: string | null;
  partner_id?: string | null;
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
  created_at: string;
  updated_at: string;
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
};
