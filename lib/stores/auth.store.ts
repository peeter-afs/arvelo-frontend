import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Tenant, UserRole } from '../types/auth.types';

interface AuthState {
  // State
  user: User | null;
  tenant: Tenant | null;
  role: UserRole | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: User) => void;
  setTenant: (tenant: Tenant | null, role?: UserRole | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setSession: (user: User, tenant: Tenant | null, role: UserRole | null, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      tenant: null,
      role: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      // Set user
      setUser: (user) =>
        set((state) => ({
          user,
          isAuthenticated: true,
        })),

      // Set tenant and role
      setTenant: (tenant, role = null) =>
        set((state) => ({
          tenant,
          role,
        })),

      // Set tokens
      setTokens: (accessToken, refreshToken) =>
        set((state) => ({
          accessToken,
          refreshToken,
        })),

      // Set full session
      setSession: (user, tenant, role, accessToken, refreshToken) =>
        set((state) => ({
          user,
          tenant,
          role,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        })),

      // Logout
      logout: () =>
        set((state) => ({
          user: null,
          tenant: null,
          role: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        })),

      // Set loading state
      setLoading: (loading) =>
        set((state) => ({
          isLoading: loading,
        })),
    }),
    {
      name: 'auth-storage', // name of item in storage
      partialize: (state) => ({
        // Only persist these fields
        user: state.user,
        tenant: state.tenant,
        role: state.role,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Helper to get store outside of React components
export const getAuthStore = () => useAuthStore;