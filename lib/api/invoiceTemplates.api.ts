import apiClient from './client';

type ApiResponse<T> = { success: boolean; data: T };

export type TemplateLayout = 'standard' | 'modern';
export type DocKind = 'invoice' | 'credit' | 'prepay' | 'quote' | 'reminder';
export type DocLang = 'et' | 'en' | 'fi' | 'sv';

export type InvoiceTemplate = {
  id: string;
  name: string;
  is_default: boolean;
  layout: TemplateLayout;
  accent_color: string;
  logo_document_id: string | null;
  show_unpaid: boolean;
  show_note: boolean;
  version: number;
  clients: Array<{ id: string; name: string }>;
  recurring: Array<{ id: string; name: string }>;
};

export type TemplateSavePayload = {
  templates: Array<{
    id?: string | null;
    key?: string;
    name: string;
    layout: TemplateLayout;
    accent_color: string;
    logo_document_id?: string | null;
    show_unpaid: boolean;
    show_note: boolean;
    client_ids?: string[];
  }>;
  deleted_ids?: string[];
};

export type PreviewFlags = { disc?: boolean; multivat?: boolean; rc?: boolean; multipage?: boolean };

export type PreviewRequest = {
  template: {
    layout: TemplateLayout;
    accent_color: string;
    logo_document_id?: string | null;
    show_unpaid: boolean;
    show_note: boolean;
  };
  doc: DocKind;
  lang: DocLang;
  flags: PreviewFlags;
  max_pages?: number;
};

export type PreviewResponse = {
  html: string;
  file_name: string;
  email: { subject: string; hello: string; body: string; bye: string; company: string; title: string; to: string; from: string };
};

const base = '/api/invoice-templates';

export const invoiceTemplatesApi = {
  async list(): Promise<InvoiceTemplate[]> {
    const { data } = await apiClient.get<ApiResponse<InvoiceTemplate[]>>(base);
    return data.data || [];
  },

  async saveAll(payload: TemplateSavePayload): Promise<{ templates: InvoiceTemplate[]; ids: Record<string, string> }> {
    const { data } = await apiClient.put<ApiResponse<{ templates: InvoiceTemplate[]; ids: Record<string, string> }>>(base, payload);
    return data.data;
  },

  async uploadLogo(file: File): Promise<{ document_id: string; data_uri: string }> {
    const form = new FormData();
    form.append('file', file);
    const { data } = await apiClient.post<ApiResponse<{ document_id: string; data_uri: string }>>(`${base}/logo`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },

  async preview(req: PreviewRequest): Promise<PreviewResponse> {
    const { data } = await apiClient.post<ApiResponse<PreviewResponse>>(`${base}/preview`, req);
    return data.data;
  },

  async previewPdf(req: PreviewRequest): Promise<Blob> {
    const { data } = await apiClient.post<Blob>(`${base}/preview.pdf`, req, { responseType: 'blob' });
    return data;
  },

  async recurringPreview(templateId: string): Promise<{ html: string; file_name: string }> {
    const { data } = await apiClient.post<ApiResponse<{ html: string; file_name: string }>>(`/api/recurring-invoices/${templateId}/preview`);
    return data.data;
  },

  async recurringPreviewPdf(templateId: string): Promise<Blob> {
    const { data } = await apiClient.post<Blob>(`/api/recurring-invoices/${templateId}/preview.pdf`, undefined, { responseType: 'blob' });
    return data;
  },
};

export const ACCENTS: Array<{ hex: string; name: string }> = [
  { hex: '#2849d6', name: 'Sinine' },
  { hex: '#0b6e50', name: 'Roheline' },
  { hex: '#c8391a', name: 'Punane' },
  { hex: '#6b3fa0', name: 'Ploom' },
  { hex: '#2b2b2b', name: 'Grafiit' },
];

export const DOC_KINDS: Array<{ key: DocKind; label: string }> = [
  { key: 'invoice', label: 'Arve' },
  { key: 'credit', label: 'Kreeditarve' },
  { key: 'prepay', label: 'Ettemaksuarve' },
  { key: 'quote', label: 'Hinnapakkumine' },
  { key: 'reminder', label: 'Meeldetuletus' },
];

/** Which preview sample flag applies to which document type (handoff "Plokkide kehtivus"). */
export const FLAG_APPLIES: Record<keyof PreviewFlags, DocKind[]> = {
  disc: ['invoice', 'credit', 'prepay', 'quote'],
  multivat: ['invoice', 'credit', 'prepay', 'quote'],
  rc: ['invoice', 'credit', 'prepay', 'quote'],
  multipage: ['invoice', 'credit', 'prepay', 'quote'],
};
