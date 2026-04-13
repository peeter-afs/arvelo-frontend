import apiClient from './client';

type ApiResponse<T> = { success: boolean; data: T };

export type AssetCategory = {
  id: string;
  tenant_id: string;
  name: string;
  asset_account_id: string;
  depreciation_account_id: string;
  expense_account_id: string;
  default_useful_life_months: number | null;
  created_at: string;
};

export type FixedAsset = {
  id: string;
  tenant_id: string;
  category_id: string;
  asset_code: string;
  name: string;
  description: string | null;
  acquisition_date: string;
  in_service_date: string;
  acquisition_cost: number;
  salvage_value: number;
  useful_life_months: number;
  depreciation_method: 'straight_line' | 'declining_balance';
  status: string;
  disposal_date: string | null;
  disposal_amount: number | null;
  created_at: string;
  updated_at: string;
};

export type DepreciationEntry = {
  id: string;
  asset_id: string;
  period_date: string;
  depreciation_amount: number;
  accumulated_depreciation: number;
  net_book_value: number;
  is_posted: boolean;
  journal_entry_id: string | null;
  created_at: string;
};

export const fixedAssetsApi = {
  // Categories
  async listCategories(): Promise<AssetCategory[]> {
    const { data } = await apiClient.get<ApiResponse<AssetCategory[]>>('/fixed-assets/categories');
    return data.data;
  },

  async createCategory(input: {
    name: string;
    asset_account_id: string;
    depreciation_account_id: string;
    expense_account_id: string;
    default_useful_life_months?: number;
  }): Promise<AssetCategory> {
    const { data } = await apiClient.post<ApiResponse<AssetCategory>>('/fixed-assets/categories', input);
    return data.data;
  },

  // Assets
  async listAssets(status?: string): Promise<FixedAsset[]> {
    const params = status ? { status } : {};
    const { data } = await apiClient.get<ApiResponse<FixedAsset[]>>('/fixed-assets', { params });
    return data.data;
  },

  async getAsset(id: string): Promise<FixedAsset> {
    const { data } = await apiClient.get<ApiResponse<FixedAsset>>(`/fixed-assets/${id}`);
    return data.data;
  },

  async createAsset(input: {
    category_id: string;
    asset_code: string;
    name: string;
    description?: string;
    acquisition_date: string;
    in_service_date: string;
    acquisition_cost: number;
    salvage_value: number;
    useful_life_months: number;
    depreciation_method: 'straight_line' | 'declining_balance';
  }): Promise<FixedAsset> {
    const { data } = await apiClient.post<ApiResponse<FixedAsset>>('/fixed-assets', input);
    return data.data;
  },

  async updateAsset(id: string, input: Partial<{
    name: string;
    description: string;
    salvage_value: number;
    useful_life_months: number;
  }>): Promise<FixedAsset> {
    const { data } = await apiClient.put<ApiResponse<FixedAsset>>(`/fixed-assets/${id}`, input);
    return data.data;
  },

  async disposeAsset(id: string, input: {
    disposal_date: string;
    disposal_amount: number;
  }): Promise<FixedAsset> {
    const { data } = await apiClient.post<ApiResponse<FixedAsset>>(`/fixed-assets/${id}/dispose`, input);
    return data.data;
  },

  // Depreciation
  async getDepreciationSchedule(assetId: string): Promise<DepreciationEntry[]> {
    const { data } = await apiClient.get<ApiResponse<DepreciationEntry[]>>(`/fixed-assets/${assetId}/depreciation`);
    return data.data;
  },

  async generateDepreciation(assetId: string, upToDate: string): Promise<DepreciationEntry[]> {
    const { data } = await apiClient.post<ApiResponse<DepreciationEntry[]>>(`/fixed-assets/${assetId}/depreciation/generate`, { up_to_date: upToDate });
    return data.data;
  },
};
