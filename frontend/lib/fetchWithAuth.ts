import { useAuthStore } from '../store/auth.store';
import { authService } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const absoluteUrl = url.startsWith('http') ? url : `${API_URL}${url.startsWith('/') ? '' : '/'}${url}`;

  // Attach token
  const token = useAuthStore.getState().accessToken;
  const headers = new Headers(options.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(absoluteUrl, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized
  if (response.status === 401) {
    console.log('Access token expired or invalid, attempting token refresh...');
    const refreshResult = await authService.refreshTokens();

    if (refreshResult.success && refreshResult.accessToken) {
      // Retry with new token
      const retryHeaders = new Headers(options.headers || {});
      retryHeaders.set('Authorization', `Bearer ${refreshResult.accessToken}`);

      return fetch(absoluteUrl, {
        ...options,
        headers: retryHeaders,
      });
    } else {
      console.warn('Token refresh failed, logging out.');
      authService.logout();
    }
  }

  return response;
}
