import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios';

const instance = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'X-Requested-With': 'XMLHttpRequest' },
});

instance.interceptors.response.use(
  (response) => response.data,
  (error) => {
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

/** API errors use `{ error: string }`; network errors may use `message`. */
export function getApiErrorMessage(err: unknown, fallback = 'Request failed'): string {
  if (typeof err === 'object' && err !== null) {
    const o = err as { error?: unknown; message?: unknown };
    if (typeof o.error === 'string' && o.error) return o.error;
    if (typeof o.message === 'string' && o.message) return o.message;
  }
  return fallback;
}

export default api;
