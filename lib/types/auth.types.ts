export type UserRole = 'owner' | 'admin' | 'accountant' | 'viewer';
export type UserStatus = 'active' | 'inactive' | 'suspended';

export interface User {
  id: string;
  email: string;
  name?: string;
  status: UserStatus;
  email_verified: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface Tenant {
  id: string;
  name: string;
  registry_code?: string;
  vat_number?: string;
  is_vat_registered: boolean;
  address?: string;
  email?: string;
  phone?: string;
  base_currency: string;
  created_at: string;
  updated_at: string;
}

export interface Session {
  user: User;
  tenant?: Tenant;
  role?: UserRole;
  access_token: string;
  refresh_token: string;
  requires_2fa?: boolean;
  two_factor_token?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegistrationData {
  email: string;
  password: string;
  name?: string;
  tenant_name?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
  };
}