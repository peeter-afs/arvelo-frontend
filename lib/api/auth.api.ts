import apiClient from './client';
import {
  LoginCredentials,
  RegistrationData,
  Session,
  ApiResponse,
  User,
  Tenant,
  UserRole
} from '../types/auth.types';

export const authApi = {
  /**
   * Register a new user
   */
  async register(data: RegistrationData): Promise<Session> {
    const response = await apiClient.post<ApiResponse<Session>>(
      '/api/auth/register',
      data
    );
    return response.data.data!;
  },

  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<Session> {
    const response = await apiClient.post<ApiResponse<Session>>(
      '/api/auth/login',
      credentials
    );
    return response.data.data!;
  },

  /**
   * Verify 2FA code during login (authenticator app or email backup code)
   */
  async verify2fa(twoFactorToken: string, code: string, method: 'totp' | 'email' = 'totp'): Promise<Session> {
    const response = await apiClient.post<ApiResponse<Session>>(
      '/api/auth/2fa/verify',
      { two_factor_token: twoFactorToken, code, method }
    );
    return response.data.data!;
  },

  /**
   * Request an email backup code during 2FA login
   */
  async request2faEmailCode(twoFactorToken: string): Promise<void> {
    await apiClient.post('/api/auth/2fa/email-code', { two_factor_token: twoFactorToken });
  },

  /**
   * Get WebAuthn authentication options during 2FA login
   */
  async webauthnLoginOptions(twoFactorToken: string): Promise<{ options: unknown; challenge_token: string }> {
    const response = await apiClient.post<ApiResponse<{ options: unknown; challenge_token: string }>>(
      '/api/auth/2fa/webauthn/options',
      { two_factor_token: twoFactorToken }
    );
    return response.data.data!;
  },

  /**
   * Verify WebAuthn assertion during 2FA login
   */
  async webauthnLoginVerify(
    twoFactorToken: string,
    challengeToken: string,
    assertion: unknown
  ): Promise<Session> {
    const response = await apiClient.post<ApiResponse<Session>>(
      '/api/auth/2fa/webauthn/verify',
      { two_factor_token: twoFactorToken, challenge_token: challengeToken, response: assertion }
    );
    return response.data.data!;
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/api/auth/logout');
    } catch (error) {
      // Ignore logout errors
      console.error('Logout error:', error);
    }
  },

  /**
   * Get current user session
   */
  async getMe(): Promise<{ user: User; tenant?: Tenant; role?: UserRole }> {
    const response = await apiClient.get<ApiResponse<{
      user: User;
      tenant?: Tenant;
      role?: UserRole
    }>>('/api/auth/me');
    return response.data.data!;
  },

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<{
    access_token: string;
    refresh_token: string;
  }> {
    const response = await apiClient.post<ApiResponse<{
      access_token: string;
      refresh_token: string;
    }>>('/api/auth/refresh', {
      refresh_token: refreshToken,
    });
    return response.data.data!;
  },

  /**
   * Switch tenant
   */
  async switchTenant(tenantId: string): Promise<{
    access_token: string;
    refresh_token: string;
  }> {
    const response = await apiClient.post<ApiResponse<{
      access_token: string;
      refresh_token: string;
    }>>('/api/auth/switch-tenant', {
      tenant_id: tenantId,
    });
    return response.data.data!;
  },

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<void> {
    await apiClient.post('/api/auth/forgot-password', { email });
  },

  /**
   * Reset password with token
   */
  async resetPassword(token: string, password: string): Promise<void> {
    await apiClient.post('/api/auth/reset-password', { token, password });
  },

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<void> {
    await apiClient.post('/api/auth/verify-email', { token });
  },

  /**
   * Resend verification email
   */
  async resendVerification(email: string): Promise<void> {
    await apiClient.post('/api/auth/resend-verification', { email });
  },

  /**
   * Validate an invite link token (does not consume it)
   */
  async getInvite(token: string): Promise<
    | { status: 'valid'; email: string; tenantName: string; role: string }
    | { status: 'expired' | 'cancelled' | 'accepted' | 'invalid' }
  > {
    const response = await apiClient.get<ApiResponse<
      | { status: 'valid'; email: string; tenantName: string; role: string }
      | { status: 'expired' | 'cancelled' | 'accepted' | 'invalid' }
    >>(`/api/auth/invite/${encodeURIComponent(token)}`);
    return response.data.data!;
  },

  /**
   * Accept an invite: set password and join the company
   */
  async acceptInvite(payload: { token: string; password: string; name?: string }): Promise<{
    email: string;
    existingAccount: boolean;
  }> {
    const response = await apiClient.post<ApiResponse<{ email: string; existingAccount: boolean }>>(
      '/api/auth/accept-invite',
      payload
    );
    return response.data.data!;
  },
};