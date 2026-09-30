import apiClient from './client';

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export const PAYMENT_METHOD_KINDS = ['bank_transfer', 'cash', 'card', 'online', 'other'] as const;
export type PaymentMethodKind = (typeof PAYMENT_METHOD_KINDS)[number];

export type PaymentMethod = {
  id: string;
  name: string;
  kind: PaymentMethodKind;
  account_id: string;
  account_code: string | null;
  account_name: string | null;
  is_active: boolean;
  sort_order: number;
  /** Card / web shop payouts: fee expense account, expected fee and how to recognise the payout. */
  fee_account_id: string | null;
  fee_account_code: string | null;
  fee_account_name: string | null;
  fee_percent: number | null;
  fee_fixed: number | null;
  payout_match: string | null;
};

export type PaymentMethodInput = {
  name?: string;
  kind?: PaymentMethodKind;
  account_id?: string;
  is_active?: boolean;
  fee_account_id?: string | null;
  fee_percent?: number | null;
  fee_fixed?: number | null;
  payout_match?: string | null;
};

export const paymentMethodsApi = {
  async list(options?: { includeInactive?: boolean }): Promise<PaymentMethod[]> {
    const response = await apiClient.get<ApiResponse<PaymentMethod[]>>('/api/payment-methods', {
      params: options?.includeInactive ? { include_inactive: 'true' } : undefined,
    });
    return response.data.data;
  },

  async create(input: PaymentMethodInput & { name: string; account_id: string }): Promise<PaymentMethod> {
    const response = await apiClient.post<ApiResponse<PaymentMethod>>('/api/payment-methods', input);
    return response.data.data;
  },

  async update(id: string, input: PaymentMethodInput): Promise<PaymentMethod> {
    const response = await apiClient.put<ApiResponse<PaymentMethod>>(`/api/payment-methods/${id}`, input);
    return response.data.data;
  },
};
