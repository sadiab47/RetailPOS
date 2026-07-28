import { useAuthStore } from '../store/auth.store';
import { LoginResponse, RegisterResponse, RefreshResponse, LoginCredentials, RegisterCredentials } from '../types/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const authService = {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      const data: LoginResponse = await res.json();
      if (data.success && data.user && data.accessToken && data.refreshToken) {
        useAuthStore.getState().setAuth(data.user, data.accessToken, data.refreshToken);
      }
      return data;
    } catch (error) {
      return { success: false, message: 'Network or server error' };
    }
  },

  async register(credentials: RegisterCredentials): Promise<RegisterResponse> {
    try {
      const token = useAuthStore.getState().accessToken;
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers,
        body: JSON.stringify(credentials),
      });

      const data: RegisterResponse = await res.json();
      // Since registration might be performed by admin for other users, we might NOT want to automatically
      // log in as the newly registered user if we are currently logged in as admin.
      // But if we are registering the first admin (or not logged in), we can set auth.
      // Let's follow: if registration is successful and the store doesn't have a user, set auth.
      if (data.success && data.user && data.accessToken && data.refreshToken && !useAuthStore.getState().isAuthenticated) {
        useAuthStore.getState().setAuth(data.user, data.accessToken, data.refreshToken);
      }
      return data;
    } catch (error) {
      return { success: false, message: 'Network or server error' };
    }
  },

  async refreshTokens(): Promise<RefreshResponse> {
    const refreshToken = useAuthStore.getState().refreshToken;
    if (!refreshToken) {
      return { success: false, message: 'No refresh token available' };
    }

    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      const data: RefreshResponse = await res.json();
      if (data.success && data.accessToken && data.refreshToken) {
        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          useAuthStore.getState().setAuth(currentUser, data.accessToken, data.refreshToken);
        }
      } else {
        useAuthStore.getState().clearAuth();
      }
      return data;
    } catch (error) {
      return { success: false, message: 'Failed to refresh tokens' };
    }
  },

  logout(): void {
    useAuthStore.getState().clearAuth();
  }
};
