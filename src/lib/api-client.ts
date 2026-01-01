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
      ...fetchOptions.headers,
    };

    // Only set Content-Type if not FormData (browser will set it with boundary)
    if (!(fetchOptions.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

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
        // Redirect to login - don't throw error as redirect will handle it
        if (typeof window !== 'undefined') {
          // Redirect immediately
          window.location.href = '/login';
          // Return a response that won't trigger further error handling
          // This prevents the error overlay from showing during redirect
          return {
            success: false,
            error: 'Authentication required',
            data: null,
          } as ApiResponse<T>;
        }
        throw new Error('Authentication required');
      }

      // Throw error if request failed (but not for 401s which are handled above)
      if (!response.ok || !data.success) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      // Handle network errors (fetch fails before getting a response)
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        // Don't log during build time (SSR)
        if (typeof window !== 'undefined') {
          console.warn('API request failed - network error:', url);
        }
        throw new Error('Network error: Unable to reach server. Please check your connection.');
      }
      // Re-throw other errors as-is
      if (typeof window !== 'undefined') {
        console.error('API request failed:', error);
      }
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

  // User profile methods
  async getUserProfile() {
    return this.request<{
      id: string;
      email: string;
      name: string | null;
      created_at: string;
      is_admin: boolean;
    }>('/auth/user');
  }

  async updateUserProfile(data: { name?: string | null; email?: string }) {
    return this.request<{
      id: string;
      email: string;
      name: string | null;
      created_at: string;
    }>('/auth/user', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async deleteUserAccount() {
    return this.request<{ message: string }>('/auth/user', {
      method: 'DELETE',
    });
  }

  // Admin methods
  async getAdminDashboard() {
    return this.request<{
      totalUsers: number;
      totalAccounts: number;
      totalProperties: number;
      totalMortgages: number;
      newUsers7d: number;
      newUsers30d: number;
      newAccounts30d: number;
      newProperties30d: number;
      recentUsers: Array<{
        id: string;
        email: string;
        name: string | null;
        created_at: string;
        is_admin: boolean;
      }>;
    }>('/admin/dashboard');
  }

  async getAdminUsers(page = 1, limit = 10, search = '') {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (search) {
      params.append('search', search);
    }
    return this.request<{
      data: Array<{
        id: string;
        email: string;
        name: string | null;
        created_at: string;
        is_admin: boolean;
        account_count: number;
        property_count: number;
      }>;
      pagination: any;
    }>(`/admin/users?${params.toString()}`);
  }

  async deleteAdminUser(userId: string) {
    return this.request<{ message: string }>(`/admin/users/${userId}`, {
      method: 'DELETE',
    });
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

  async bulkUploadProperties(accountId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('accountId', accountId);

    return this.request<{
      created: number;
      failed: number;
      total: number;
      errors?: string[];
      failedProperties?: Array<{ index: number; error: string }>;
    }>('/properties/bulk-upload', {
      method: 'POST',
      body: formData,
    });
  }

  // Mortgage methods
  async getMortgage(propertyId: string) {
    try {
      const response = await fetch(
        `${API_BASE_URL}/properties/${propertyId}/mortgage`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(this.getToken() ? { Authorization: `Bearer ${this.getToken()}` } : {}),
          },
        }
      );

      // Handle 404 gracefully - it's normal for properties to not have mortgages
      if (response.status === 404) {
        return {
          success: false,
          error: 'Mortgage not found',
          data: null,
        };
      }

      // For other responses, use the standard request method
      return await this.request<any>(`/properties/${propertyId}/mortgage`);
    } catch (error) {
      // Handle "Mortgage not found" gracefully - it's normal for properties to not have mortgages
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('Mortgage not found') || errorMessage.includes('404')) {
        // Return a response indicating no mortgage found, rather than throwing
        return {
          success: false,
          error: 'Mortgage not found',
          data: null,
        };
      }
      // Re-throw other errors
      throw error;
    }
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

