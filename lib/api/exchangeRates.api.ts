import apiClient from './client';

type ApiResponse<T> = { success: boolean; data: T };

export type ExchangeRate = {
  id: string;
  tenant_id: string;
  source_currency: string;
  target_currency: string;
  rate_date: string;
  rate: number;
  source: string;
  created_at: string;
};

export const exchangeRatesApi = {
  async list(filters?: { target_currency?: string }): Promise<ExchangeRate[]> {
    const { data } = await apiClient.get<ApiResponse<ExchangeRate[]>>('/exchange-rates', { params: filters });
    return data.data;
  },

  async setRate(input: {
    source_currency: string;
    target_currency: string;
    rate_date: string;
    rate: number;
  }): Promise<ExchangeRate> {
    const { data } = await apiClient.post<ApiResponse<ExchangeRate>>('/exchange-rates', input);
    return data.data;
  },

  async fetchEcb(): Promise<{ rates_stored: number }> {
    const { data } = await apiClient.post<ApiResponse<{ rates_stored: number }>>('/exchange-rates/fetch-ecb');
    return data.data;
  },

  async convert(amount: number, fromCurrency: string, toCurrency: string, date: string): Promise<{ converted: number; rate: number }> {
    const { data } = await apiClient.post<ApiResponse<{ converted: number; rate: number }>>('/exchange-rates/convert', {
      amount, from_currency: fromCurrency, to_currency: toCurrency, date,
    });
    return data.data;
  },
};
