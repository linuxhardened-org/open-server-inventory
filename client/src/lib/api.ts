import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';

const instance = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

instance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const url = String(error.config?.url ?? '');
    // Failed login returns 401 — do not redirect (stay on login and show error).
    if (status === 401 && !url.includes('/auth/login')) {
      window.location.href = '/login';
    }
    const payload = error.response?.data;
    return Promise.reject(
      typeof payload === 'object' && payload !== null ? payload : { error: String(error.message || 'Request failed') }
    );
  }
);

/** Axios instance where responses are already unwrapped to `response.data` (matches runtime interceptor). */
export interface ApiClient {
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T = any>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  put<T = any>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  patch<T = any>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T>;
  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
  defaults: AxiosInstance['defaults'];
  interceptors: AxiosInstance['interceptors'];
}

const api = instance as unknown as ApiClient;

export default api;
