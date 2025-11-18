import { useAuth } from '../contexts/AuthContext';

class ApiClient {
  private getAuthHeader(): HeadersInit {
    const { accessToken } = (window as any).__authContext || {};
    if (accessToken) {
      return { Authorization: `Bearer ${accessToken}` };
    }
    return {};
  }

  async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers = {
      'Content-Type': 'application/json',
      ...this.getAuthHeader(),
      ...options.headers,
    };

    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    // Handle 401 - token might be expired
    if (response.status === 401) {
      const { refreshToken } = (window as any).__authContext || {};
      if (refreshToken && typeof refreshToken === 'function') {
        try {
          await refreshToken();
          // Retry the request with new token
          const retryHeaders = {
            'Content-Type': 'application/json',
            ...this.getAuthHeader(),
            ...options.headers,
          };
          const retryResponse = await fetch(endpoint, {
            ...options,
            headers: retryHeaders,
          });
          return await retryResponse.json();
        } catch (error) {
          // Refresh failed, user needs to log in again
          throw new Error('Authentication required');
        }
      }
      throw new Error('Authentication required');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  }

  // Convenience methods
  async get<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async upload(endpoint: string, formData: FormData): Promise<any> {
    const headers = {
      ...this.getAuthHeader(),
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return await response.json();
  }
}

export const apiClient = new ApiClient();

// Hook to use API client with auth context
export function useApiClient() {
  const auth = useAuth();

  // Expose auth context to the API client
  if (typeof window !== 'undefined') {
    (window as any).__authContext = auth;
  }

  return apiClient;
}
