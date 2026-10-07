import apiClient from './client';

type ApiResponse<T> = { success: boolean; data: T };

export type MigrationStrategy = 'with_general' | 'subledger_only' | 'mid_year' | 'startup' | null;

export type MigrationStatus = {
  company: { name: string | null; registry_code: string | null; is_vat_registered: boolean; vat_number: string | null; address: string | null };
  accounts: { count: number; beyond_standard: boolean };
  partners: { count: number };
  opening: {
    strategy: MigrationStrategy;
    opening_date: string | null;
    balance_sheet: boolean;
    turnover: boolean;
    receivables: boolean;
    payables: boolean;
    reconciliation_status: 'pending' | 'passed' | 'failed' | 'locked' | null;
    locked: boolean;
  };
  bank: { accounts: number; accounts_with_iban: number; transactions: number; first_tx_date: string | null; last_tx_date: string | null };
};

export const migrationApi = {
  async getStatus(): Promise<MigrationStatus> {
    const response = await apiClient.get<ApiResponse<MigrationStatus>>('/api/migration/status');
    return response.data.data;
  },
};
