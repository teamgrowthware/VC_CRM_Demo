import axios from 'axios';

let apiUrl: string = process.env.NEXT_PUBLIC_API_URL || '';
if (!apiUrl) {
  apiUrl = process.env.NODE_ENV === 'production' 
    ? 'https://vortex-crm-nc65p.ondigitalocean.app/api' 
    : 'http://localhost:5000/api';
}
export const API_URL = apiUrl;

const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
};

// CSRF token for cookie-authenticated mutating requests.
// Stored in-memory (from login/refresh response) with a cookie fallback for same-site deployments.
let csrfToken: string | null = null;
export const setCsrfToken = (token: string | null) => {
  csrfToken = token;
};

type RetryableConfig = import('axios').AxiosRequestConfig & { _retry?: boolean };

export const getCsrfToken = () => csrfToken || getCookie('csrfToken');

const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  if (config.method && config.method.toLowerCase() !== 'get') {
    const token = getCsrfToken();
    if (token) {
      config.headers['X-CSRF-Token'] = token;
    }
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as RetryableConfig | undefined;
    const status = error.response?.status;
    const errorMsg = error.response?.data?.error || '';
    const url = original?.url || '';

    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/refresh');

    const shouldRefresh = !isAuthEndpoint && original && !original._retry && (
      status === 401 ||
      (status === 403 && (errorMsg === 'Invalid or expired token' || errorMsg === 'CSRF token mismatch'))
    );

    if (shouldRefresh) {
      original._retry = true;
      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh`, {}, { withCredentials: true });
        if (data.csrfToken) {
          setCsrfToken(data.csrfToken);
        }
        return apiClient(original);
      } catch (refreshError) {
        if (typeof window !== 'undefined') {
          localStorage.clear();
          setCsrfToken(null);
          window.location.href = window.location.pathname.startsWith('/client') ? '/client/login' : '/login';
        }
      }
    }

    if (!isAuthEndpoint && typeof window !== 'undefined' && (status === 401 || status === 403)) {
      if (status === 401 || errorMsg === 'Invalid or expired token') {
        localStorage.clear();
        window.location.href = window.location.pathname.startsWith('/client') ? '/client/login' : '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const getAuthHeaders = () => ({});

import { setupMockAdapter } from './mockAdapter';

if (typeof window !== 'undefined' || process.env.NODE_ENV === 'development') {
  setupMockAdapter(apiClient);
}

export default apiClient;
