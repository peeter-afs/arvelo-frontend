import apiClient from './client';

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export type SupplyType = 'domestic' | 'intra_community' | 'reverse_charge' | 'third_country';

export type Product = {
  id: string;
  code: string | null;
  name: string;
  description: string | null;
  unit: string | null;
  unit_price: number | string | null;
  purchase_price: number | string | null;
  tax_rate: number | string | null;
  supply_type?: SupplyType;
  sales_account_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProductInput = {
  code?: string | null;
  name: string;
  description?: string | null;
  unit?: string | null;
  unit_price?: number | null;
  purchase_price?: number | null;
  tax_rate?: number | null;
  supply_type?: SupplyType;
  sales_account_id?: string | null;
  is_active?: boolean;
};

export const productsApi = {
  async list(params?: { search?: string; include_inactive?: boolean; limit?: number }) {
    const response = await apiClient.get<ApiResponse<Product[]>>('/api/products', { params });
    return response.data.data;
  },

  async create(payload: ProductInput) {
    const response = await apiClient.post<ApiResponse<Product>>('/api/products', payload);
    return response.data.data;
  },

  async update(id: string, payload: Partial<ProductInput>) {
    const response = await apiClient.put<ApiResponse<Product>>(`/api/products/${id}`, payload);
    return response.data.data;
  },

  async remove(id: string) {
    const response = await apiClient.delete<ApiResponse<{ id: string }>>(`/api/products/${id}`);
    return response.data.data;
  },
};
