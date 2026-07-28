export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  role?: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
  user?: User;
  accessToken?: string;
  refreshToken?: string;
}

export interface RegisterResponse {
  success: boolean;
  message?: string;
  user?: User;
  accessToken?: string;
  refreshToken?: string;
}

export interface RefreshResponse {
  success: boolean;
  message?: string;
  accessToken?: string;
  refreshToken?: string;
}
