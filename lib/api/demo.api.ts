import apiClient from './client';
import { ApiResponse, Session } from '../types/auth.types';

export type DemoSession = Session & { demo_expires_at: string };
export type DemoStatus = { is_demo: boolean; expires_at?: string | null };

export const demoApi = {
  /** Creates a fresh sandbox (bureau + seeded client companies); takes a while. */
  async start(): Promise<DemoSession> {
    const response = await apiClient.post<ApiResponse<DemoSession>>('/api/demo/start', {}, { timeout: 180000 });
    return response.data.data!;
  },

  async status(): Promise<DemoStatus> {
    const response = await apiClient.get<ApiResponse<DemoStatus>>('/api/demo/status');
    return response.data.data!;
  },
};
