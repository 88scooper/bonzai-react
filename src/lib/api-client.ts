/**
 * Centralized API client for making authenticated requests
 * Handles JWT token management, request/response interceptors, and error handling
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface RequestOptions extends RequestInit {
  requireAuth?: boolean;
}

class ApiClient {
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  }

  private setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('auth_token', token);
  }

  private removeToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const { requireAuth = true, ...fetchOptions } = options;

    // Build headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    };

    // Add authentication token if required
    if (requireAuth) {
      const token = this.getToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    // Build full URL
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return { success: true } as ApiResponse<T>;
      }

      const data: ApiResponse<T> = await response.json();

      // Handle authentication errors
      if (response.status === 401) {
        this.removeToken();
        // Optionally redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new Error('Authentication required');
      }

      // Throw error if request failed
      if (!response.ok || !data.success) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Authentication methods
  async register(email: string, password: string, name?: string) {
    const response = await this.request<{ user: any; token: string }>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
        requireAuth: false,
      }
    );

    if (response.data?.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  async login(email: string, password: string) {
    const response = await this.request<{ user: any; token: string }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        requireAuth: false,
      }
    );

    if (response.data?.token) {
      this.setToken(response.data.token);
    }

    return response;
  }

  async logout() {
    try {
      await this.request('/auth/logout', {
        method: 'POST',
      });
    } finally {
      this.removeToken();
    }
  }

  // Account methods
  async getAccounts(page = 1, limit = 10) {
    return this.request<{
      data: any[];
      pagination: any;
    }>(`/accounts?page=${page}&limit=${limit}`);
  }

  async getAccount(id: string) {
    return this.request<any>(`/accounts/${id}`);
  }

  async createAccount(name: string, email?: string, isDemo = false) {
    return this.request<any>('/accounts', {
      method: 'POST',
      body: JSON.stringify({ name, email, isDemo }),
    });
  }

  async updateAccount(id: string, data: { name?: string; email?: string }) {
    return this.request<any>(`/accounts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteAccount(id: string) {
    return this.request<{ message: string }>(`/accounts/${id}`, {
      method: 'DELETE',
    });
  }

  // Property methods
  async getProperties(accountId?: string, page = 1, limit = 10) {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (accountId) {
      params.append('accountId', accountId);
    }
    return this.request<{
      data: any[];
      pagination: any;
    }>(`/properties?${params.toString()}`);
  }

  async getProperty(id: string) {
    return this.request<any>(`/properties/${id}`);
  }

  async createProperty(data: any) {
    return this.request<any>('/properties', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProperty(id: string, data: any) {
    return this.request<any>(`/properties/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteProperty(id: string) {
    return this.request<{ message: string }>(`/properties/${id}`, {
      method: 'DELETE',
    });
  }

  // Mortgage methods
  async getMortgage(propertyId: string) {
    return this.request<any>(`/properties/${propertyId}/mortgage`);
  }

  async saveMortgage(propertyId: string, data: any) {
    return this.request<any>(`/properties/${propertyId}/mortgage`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Expense methods
  async getExpenses(propertyId: string, page = 1, limit = 10) {
    return this.request<{
      data: any[];
      pagination: any;
    }>(`/properties/${propertyId}/expenses?page=${page}&limit=${limit}`);
  }

  async createExpense(propertyId: string, data: any) {
    return this.request<any>(`/properties/${propertyId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;

