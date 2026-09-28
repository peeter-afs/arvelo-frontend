import apiClient from './client';

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

/**
 * One message of the raw Claude Messages API history. The backend is stateless:
 * the client keeps this list and sends it back unchanged each turn (thinking and
 * tool blocks included), so it is typed loosely on purpose.
 */
export type AssistantApiMessage = {
  role: 'user' | 'assistant';
  content: string | Array<{ type: string; [key: string]: unknown }>;
};

export type AssistantProposal = {
  id: string;
  tool: string;
  title: string;
  rows: Array<{ label: string; value: string }>;
  warnings: string[];
  token: string;
  expiresAt: string;
};

export type AssistantChatResult = {
  messages: AssistantApiMessage[];
  reply: string;
  proposals: AssistantProposal[];
};

export type AssistantConfirmResult = {
  message: string;
  link: string | null;
};

export const assistantApi = {
  async chat(messages: AssistantApiMessage[], pathname?: string): Promise<AssistantChatResult> {
    const response = await apiClient.post<ApiResponse<AssistantChatResult>>(
      '/api/assistant/chat',
      { messages, pathname },
      // A turn may take several model calls (look up accounts, then propose).
      { timeout: 180_000 }
    );
    return response.data.data;
  },

  async confirm(token: string): Promise<AssistantConfirmResult> {
    const response = await apiClient.post<ApiResponse<AssistantConfirmResult>>(
      '/api/assistant/proposals/confirm',
      { token }
    );
    return response.data.data;
  },
};
