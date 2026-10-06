import apiClient from './client';
import type { Payslip } from './payroll.api';
import type { ApiResponse } from '../types/auth.types';
import type { ExpenseReport, ExpenseReportListItem } from './cashExpense.api';

export type SelfProfile = {
  user: { id: string; email: string | null; name: string | null };
  tenant: { id: string; name: string | null };
  employee: { id: string; name: string } | null;
  has_passkey: boolean;
  role: string | null;
};

export type SelfReceiptInput = {
  vendor_name: string;
  receipt_number?: string | null;
  receipt_date: string;
  description: string;
  gross_amount: number;
  tax_rate: number;
};

/** /api/me — the signed-in employee's own expense reports (self-service). */
export const meApi = {
  async profile(): Promise<SelfProfile> {
    const response = await apiClient.get<ApiResponse<SelfProfile>>('/api/me');
    return response.data.data!;
  },

  async listReports(): Promise<ExpenseReportListItem[]> {
    const response = await apiClient.get<ApiResponse<ExpenseReportListItem[]>>('/api/me/expense-reports');
    return response.data.data!;
  },

  async getReport(id: string): Promise<ExpenseReport> {
    const response = await apiClient.get<ApiResponse<ExpenseReport>>(`/api/me/expense-reports/${id}`);
    return response.data.data!;
  },

  async createReport(input: { description?: string | null } = {}): Promise<ExpenseReport> {
    const response = await apiClient.post<ApiResponse<ExpenseReport>>('/api/me/expense-reports', input);
    return response.data.data!;
  },

  /** Multipart: the photo of the receipt is optional. */
  async addReceipt(id: string, input: SelfReceiptInput, file?: File | null): Promise<ExpenseReport> {
    const form = new FormData();
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined && value !== null && value !== '') form.append(key, String(value));
    }
    if (file) form.append('file', file);
    const response = await apiClient.post<ApiResponse<ExpenseReport>>(`/api/me/expense-reports/${id}/receipts`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data!;
  },

  async removeReceipt(id: string, receiptId: string): Promise<ExpenseReport> {
    const response = await apiClient.delete<ApiResponse<ExpenseReport>>(`/api/me/expense-reports/${id}/receipts/${receiptId}`);
    return response.data.data!;
  },

  async submit(id: string): Promise<ExpenseReport> {
    const response = await apiClient.post<ApiResponse<ExpenseReport>>(`/api/me/expense-reports/${id}/submit`);
    return response.data.data!;
  },

  async removeReport(id: string): Promise<void> {
    await apiClient.delete(`/api/me/expense-reports/${id}`);
  },

  /** Posted payslips of the signed-in employee, newest first. */
  async payslips(): Promise<Payslip[]> {
    const response = await apiClient.get<ApiResponse<Payslip[]>>('/api/me/payslips');
    return response.data.data!;
  },
};

export type EmployeeAccess = {
  members: Array<{ user_id: string; email: string; name: string | null; role: string; has_passkey: boolean }>;
  pending_invite: { id: string; email: string; expires_at: string } | null;
};

/** Accountant side: give an employee self-service access. */
export const employeeAccessApi = {
  async get(partnerId: string): Promise<EmployeeAccess> {
    const response = await apiClient.get<ApiResponse<EmployeeAccess>>(`/api/expense-reports/employees/${partnerId}/access`);
    return response.data.data!;
  },

  async invite(partnerId: string, email: string): Promise<{ mode: 'linked' | 'invited'; email: string; emailSent?: boolean }> {
    const response = await apiClient.post<ApiResponse<{ mode: 'linked' | 'invited'; email: string; emailSent?: boolean }>>(
      `/api/expense-reports/employees/${partnerId}/invite`,
      { email }
    );
    return response.data.data!;
  },

  async revoke(partnerId: string): Promise<void> {
    await apiClient.delete(`/api/expense-reports/employees/${partnerId}/access`);
  },
};
