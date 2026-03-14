import apiClient from './client';

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type PaymentListItem = {
  id: string;
  invoice_id: string;
  partner_id?: string | null;
  direction: 'incoming' | 'outgoing';
  payment_date: string;
  amount: number | string;
  currency: string;
  reference?: string | null;
  journal_entry_id?: string | null;
  reversal_journal_entry_id?: string | null;
  reversal_reason?: string | null;
  reversed_at?: string | null;
  reversed_by_user_id?: string | null;
  status: 'draft' | 'posted' | 'cancelled' | 'reversed';
  created_by_user_id?: string | null;
  created_at: string;
  updated_at: string;
  invoice_number?: string | null;
  invoice_status?: string | null;
  invoice_type?: string | null;
  partner_name?: string | null;
};

export type PaymentDetail = PaymentListItem & {
  invoice_date?: string | null;
  due_date?: string | null;
  invoice_total?: number | string | null;
  invoice_paid_amount?: number | string | null;
  invoice_open_amount?: number | string | null;
  payment_reference?: string | null;
};

export const paymentsApi = {
  async listPayments(params?: {
    invoice_id?: string;
    partner_id?: string;
    status?: string;
    direction?: string;
    limit?: number;
    offset?: number;
  }) {
    const response = await apiClient.get<ApiResponse<PaymentListItem[]>>('/api/payments', { params });
    return response.data.data;
  },

  async getPayment(id: string) {
    const response = await apiClient.get<ApiResponse<PaymentDetail>>(`/api/payments/${id}`);
    return response.data.data;
  },

  async postPayment(id: string) {
    const response = await apiClient.post<ApiResponse<{
      payment: PaymentListItem;
      invoice_status: string;
      open_amount: number;
    }>>(`/api/payments/${id}/post`);
    return response.data.data;
  },

  async reversePayment(id: string, payload?: { reason?: string }) {
    const response = await apiClient.post<ApiResponse<{
      payment: PaymentListItem;
      invoice_status: string;
      open_amount: number;
      reversed_journal_entry_id?: string;
    }>>(`/api/payments/${id}/reverse`, payload || {});
    return response.data.data;
  },
};
