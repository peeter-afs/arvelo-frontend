import apiClient from './client';

type ApiResponse<T> = { success: boolean; data: T };

/** Purchase invoices by e-mail: the company's address <name>-xxxx@<domain> (backend /api/invoice-inbox). */
export type InvoiceInboxStatus = {
  domain: string | null;
  configured: boolean;
  enabled: boolean;
  address: string | null;
  local_part: string | null;
  created_at: string | null;
};

export type InvoiceInboxAttachment = {
  id: string;
  attachment_name: string;
  mime_type: string | null;
  processing_status: 'received' | 'processed' | 'duplicate_skipped' | 'failed' | 'unsupported';
  error_message: string | null;
  purchase_invoice_import_id: string | null;
  draft_invoice_id: string | null;
  import_status: string | null;
};

export type InvoiceInboxMessage = {
  id: string;
  subject: string | null;
  sender_email: string | null;
  sender_name: string | null;
  received_at: string | null;
  created_at: string;
  status: 'processed' | 'partial' | 'no_attachment' | 'failed' | null;
  sender_known: boolean | null;
  recipient: string | null;
  attachments: InvoiceInboxAttachment[];
};

export const invoiceInboxApi = {
  async status() {
    return (await apiClient.get<ApiResponse<InvoiceInboxStatus>>('/api/invoice-inbox')).data.data;
  },
  async setEnabled(enabled: boolean) {
    return (await apiClient.put<ApiResponse<InvoiceInboxStatus>>('/api/invoice-inbox', { enabled })).data.data;
  },
  async rotate() {
    return (await apiClient.post<ApiResponse<InvoiceInboxStatus>>('/api/invoice-inbox/rotate')).data.data;
  },
  async messages() {
    return (await apiClient.get<ApiResponse<InvoiceInboxMessage[]>>('/api/invoice-inbox/messages')).data.data;
  },
};
