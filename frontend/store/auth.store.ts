import { create } from 'zustand';
import { User } from '../types/auth';

interface AuthStoreState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  setLoading: (isLoading: boolean) => void;
  initializeAuth: () => void;
}

export const useAuthStore = create<AuthStoreState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user, accessToken, refreshToken) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    }
    set({ user, accessToken, refreshToken, isAuthenticated: true, isLoading: false });
  },

  clearAuth: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, isLoading: false });
  },

  setLoading: (isLoading) => set({ isLoading }),

  initializeAuth: () => {
    if (typeof window !== 'undefined') {
      try {
        const storedUser = localStorage.getItem('user');
        const accessToken = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');

        if (storedUser && accessToken && refreshToken) {
          const user = JSON.parse(storedUser) as User;
          set({ user, accessToken, refreshToken, isAuthenticated: true, isLoading: false });
          return;
        }
      } catch (error) {
        console.error('Failed to initialize auth from localStorage', error);
      }
    }
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false, isLoading: false });
  },
}));
