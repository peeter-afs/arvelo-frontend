import apiClient from './client';

type ApiResponse<T> = { success: boolean; data: T };

export type ReminderSettings = {
  id: string;
  tenant_id: string;
  is_enabled: boolean;
  start_after_days: number;
  frequency_days: number;
  max_reminders: number;
  email_subject: string;
  email_body: string;
  created_at: string;
  updated_at: string;
};

export type OverdueInvoice = {
  id: string;
  invoice_number: string;
  partner_name: string;
  partner_email: string | null;
  total: number;
  currency: string;
  due_date: string;
  days_overdue: number;
  reminders_sent: number;
  last_reminder_at: string | null;
};

export const invoiceRemindersApi = {
  async getSettings(): Promise<ReminderSettings | null> {
    const { data } = await apiClient.get<ApiResponse<ReminderSettings | null>>('/invoice-reminders/settings');
    return data.data;
  },

  async updateSettings(input: Partial<ReminderSettings>): Promise<ReminderSettings> {
    const { data } = await apiClient.put<ApiResponse<ReminderSettings>>('/invoice-reminders/settings', input);
    return data.data;
  },

  async getOverdueInvoices(): Promise<OverdueInvoice[]> {
    const { data } = await apiClient.get<ApiResponse<OverdueInvoice[]>>('/invoice-reminders/overdue');
    return data.data;
  },

  async sendReminder(invoiceId: string, email?: string): Promise<void> {
    await apiClient.post(`/invoice-reminders/${invoiceId}/send`, { email });
  },

  async sendAllDue(): Promise<{ sent: number; skipped: number; errors: number }> {
    const { data } = await apiClient.post<ApiResponse<{ sent: number; skipped: number; errors: number }>>('/invoice-reminders/send-all');
    return data.data;
  },
};
