import axios from 'axios';
import { ApiResponse } from '../types';

const API_BASE_URL = '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 180000, // 3 minutes for complex AI operations
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    try {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Failed to access localStorage:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorMessage = error.response?.data?.error?.message || error.message || '';
    
    // Check for LLM keys exhausted error
    if (errorMessage.includes('LLM_KEYS_EXHAUSTED') || 
        errorMessage.toLowerCase().includes('all api keys have been rate limited')) {
      console.error('LLM API keys exhausted');
      error.isLLMExhausted = true;
      error.userMessage = 'All AI API keys are currently rate limited. Please wait a few minutes and try again.';
    }
    // Check for rate limit
    else if (error.response?.status === 429 || 
             errorMessage.toLowerCase().includes('rate limit') ||
             errorMessage.toLowerCase().includes('quota exceeded')) {
      console.error('Rate limit exceeded');
      error.isRateLimited = true;
      error.userMessage = 'Rate limit exceeded. Please wait a moment and try again.';
    }
    
    return Promise.reject(error);
  }
);

// Generic API functions
export async function apiGet<T>(url: string): Promise<ApiResponse<T>> {
  const response = await api.get<ApiResponse<T>>(url);
  return response.data;
}

export async function apiPost<T, D = unknown>(url: string, data?: D): Promise<ApiResponse<T>> {
  const response = await api.post<ApiResponse<T>>(url, data);
  return response.data;
}

export async function apiPut<T, D = unknown>(url: string, data?: D): Promise<ApiResponse<T>> {
  const response = await api.put<ApiResponse<T>>(url, data);
  return response.data;
}

export async function apiDelete<T>(url: string): Promise<ApiResponse<T>> {
  const response = await api.delete<ApiResponse<T>>(url);
  return response.data;
}

// Schema optimization
export async function optimizeSchema(schema: any): Promise<ApiResponse<any>> {
  return apiPost('/schema/optimize', { schema });
}

// Validate visual designer schema
export async function validateDesignerSchema(schema: any): Promise<ApiResponse<any>> {
  return apiPost('/schema/validate-designer', { schema });
}

// Export visual designer diagram
export async function exportDiagram(schema: any, tablePositions: Record<string, { x: number; y: number }>, format: 'svg' | 'png' = 'svg'): Promise<any> {
  const response = await api.post('/schema/export-diagram', { schema, tablePositions, format }, {
    responseType: format === 'svg' ? 'blob' : 'json',
  });
  return response.data;
}

// Upload and parse schema
export async function uploadSchema(formData: FormData): Promise<ApiResponse<any>> {
  const response = await api.post('/schema/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

// Query History API
export async function getQueryHistoryCount(): Promise<number> {
  try {
    const response = await api.get('/history/queries');
    if (response.data?.success && response.data?.data) {
      return response.data.data.length || 0;
    }
    return 0;
  } catch (error) {
    console.error('Failed to fetch query history count:', error);
    return 0;
  }
}

// Get recent queries for dashboard
export async function getRecentQueries(limit: number = 10): Promise<any[]> {
  try {
    const response = await api.get(`/history/query/recent?limit=${limit}`);
    if (response.data?.success && response.data?.data) {
      return response.data.data;
    }
    return [];
  } catch (error) {
    console.error('Failed to fetch recent queries:', error);
    return [];
  }
}

// Update query in history (e.g., replace with optimized version)
export async function updateQueryInHistory(id: number, sqlQuery: string): Promise<ApiResponse<any>> {
  return apiPut(`/history/query/${id}`, { sql_query: sqlQuery });
}

// Visual Designer Schema API
export async function saveVisualDesignerSchema(data: {
  name: string;
  description?: string;
  databaseType: string;
  tables: any[];
  tablePositions: Record<string, any>;
}): Promise<ApiResponse<{ id: number }>> {
  return apiPost('/visual-designer/schemas', data);
}

export async function updateVisualDesignerSchema(id: number, data: {
  name?: string;
  description?: string;
  databaseType?: string;
  tables?: any[];
  tablePositions?: Record<string, any>;
}): Promise<ApiResponse<any>> {
  return apiPut(`/visual-designer/schemas/${id}`, data);
}

export async function getVisualDesignerSchemas(): Promise<ApiResponse<any[]>> {
  return apiGet('/visual-designer/schemas');
}

export async function getVisualDesignerSchemaById(id: number): Promise<ApiResponse<any>> {
  return apiGet(`/visual-designer/schemas/${id}`);
}

export async function deleteVisualDesignerSchema(id: number): Promise<ApiResponse<any>> {
  return apiDelete(`/visual-designer/schemas/${id}`);
}
