import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getAuthStore } from '../stores/auth.store';

const resolveApiUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl && !envUrl.includes('localhost')) return envUrl;

  if (typeof window === 'undefined') {
    return envUrl || 'http://localhost:3000';
  }

  const { protocol, hostname, host } = window.location;

  // CodeSandbox: Frontend and backend on same domain (different ports in dev)
  // In production CodeSandbox, they share the same URL
  if (host.endsWith('.csb.app')) {
    // If already on a port-specific URL, backend is likely on same domain
    return `${protocol}//${host}`;
  }

  return `${protocol}//${hostname}:3000`;
};

const API_URL = resolveApiUrl();

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = getAuthStore().getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// A screen fires 15–30 requests at once; when the access token has expired they
// all get 401 together. Share one refresh between them instead of sending one
// each (that doubled the burst toward the rate limit, and with rotating refresh
// tokens every refresh after the first failed and logged the user out).
let refreshInFlight: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const refreshToken = getAuthStore().getState().refreshToken;
      if (!refreshToken) return null;
      const response = await axios.post(`${API_URL}/api/auth/refresh`, { refresh_token: refreshToken });
      const { access_token, refresh_token } = response.data.data;
      getAuthStore().getState().setTokens(access_token, refresh_token);
      return access_token as string;
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    if (!originalRequest) return Promise.reject(error);

    // If 401 and not already retried
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Already refreshed by a parallel request after this one was sent: just retry.
        const current = getAuthStore().getState().accessToken;
        const sentWith = String(originalRequest.headers.Authorization || '').replace(/^Bearer /, '');
        const accessToken = current && current !== sentWith ? current : await refreshAccessToken();
        if (accessToken) {
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        getAuthStore().getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    if (error.response?.status === 403) {
      const code = (error.response.data as { error?: { code?: string } } | undefined)?.error?.code;

      // The tenant requires 2FA and this user is past their grace period:
      // every route but /api/auth is closed until they set it up.
      if (code === 'TWO_FACTOR_REQUIRED' && typeof window !== 'undefined') {
        if (!window.location.pathname.endsWith('/settings/security')) {
          window.location.href = '/settings/security?two_factor_required=1';
        }
        return Promise.reject(error);
      }

      // Employee accounts only have the self-service view
      if (code === 'EMPLOYEE_SCOPE' && typeof window !== 'undefined') {
        if (!window.location.pathname.startsWith('/minu')) {
          window.location.href = '/minu';
        }
        return Promise.reject(error);
      }

      // No access to resource
      console.error('Access denied:', error.response.data);
    }

    return Promise.reject(error);
  }
);

// Helper function to extract error message
const hasMessage = (value: unknown): value is { message: string } => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof (value as { message?: unknown }).message === 'string'
  );
};

export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: { message?: string } } | undefined;
    return data?.error?.message || error.message || 'An error occurred';
  }
  if (error instanceof Error) return error.message || 'An error occurred';
  if (hasMessage(error)) return error.message || 'An error occurred';
  return 'An error occurred';
};

export default apiClient;
