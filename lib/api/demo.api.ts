import apiClient from './client';
import { ApiResponse, Session } from '../types/auth.types';

export type DemoSession = Session & { demo_expires_at: string };
export type DemoStatus = {
  is_demo: boolean;
  expires_at?: string | null;
  migration?: { company: string; year_end_date: string; transition_date: string };
};

export type DemoSampleKind = 'bilanss' | 'kaibeandmik' | 'ostjad' | 'tarnijad' | 'kontroll';

export const demoApi = {
  /** Creates a fresh sandbox (bureau + seeded client companies); takes a while. */
  async start(): Promise<DemoSession> {
    const response = await apiClient.post<ApiResponse<DemoSession>>('/api/demo/start', {}, { timeout: 180000 });
    return response.data.data!;
  },

  /** Downloads a sample export for trying the opening balance import. */
  async downloadSample(kind: DemoSampleKind): Promise<void> {
    const response = await apiClient.get<Blob>(`/api/demo/sample-files/${kind}`, { responseType: 'blob' });
    const disposition = String(response.headers['content-disposition'] || '');
    const match = disposition.match(/filename\*=UTF-8''([^;]+)/);
    const fileName = match ? decodeURIComponent(match[1]) : `${kind}.xlsx`;
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  },

  /** Deletes the whole sandbox now. */
  async end(): Promise<void> {
    await apiClient.post('/api/demo/end', {});
  },

  async status(): Promise<DemoStatus> {
    const response = await apiClient.get<ApiResponse<DemoStatus>>('/api/demo/status');
    return response.data.data!;
  },
};
