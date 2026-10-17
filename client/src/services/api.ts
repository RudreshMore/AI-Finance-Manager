import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  withCredentials: true, // Send and receive HttpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

let inMemoryAccessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  inMemoryAccessToken = token;
};

export const getAccessToken = () => inMemoryAccessToken;

// Request interceptor to attach Bearer token
apiClient.interceptors.request.use(
  (config) => {
    if (inMemoryAccessToken && config.headers) {
      config.headers.Authorization = `Bearer ${inMemoryAccessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle transparent 401 token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login') &&
      !originalRequest.url?.includes('/auth/refresh')
    ) {
      originalRequest._retry = true;
      try {
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newAccessToken = refreshResponse.data?.data?.accessToken;
        if (newAccessToken) {
          setAccessToken(newAccessToken);
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshErr) {
        setAccessToken(null);
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  }
);

export interface HealthResponse {
  status: 'healthy' | 'degraded';
  service: string;
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
  durationMs: number;
  database: {
    status: 'connected' | 'disconnected';
    latencyMs: number | null;
    error?: string;
  };
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'USER' | 'ADMIN';
  isVerified: boolean;
  createdAt: string;
}

export const checkBackendHealth = async (): Promise<HealthResponse> => {
  const response = await apiClient.get<HealthResponse>('/health');
  return response.data;
};

// Auth API Methods
export const authApi = {
  register: async (data: { firstName: string; lastName: string; email: string; password: string }) => {
    const res = await apiClient.post('/auth/register', data);
    return res.data;
  },
  verifyOtp: async (data: { email: string; otp: string; type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET' }) => {
    const res = await apiClient.post('/auth/verify-otp', data);
    if (res.data?.data?.accessToken) {
      setAccessToken(res.data.data.accessToken);
    }
    return res.data;
  },
  resendOtp: async (data: { email: string; type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET' }) => {
    const res = await apiClient.post('/auth/resend-otp', data);
    return res.data;
  },
  login: async (data: { email: string; password: string }) => {
    const res = await apiClient.post('/auth/login', data);
    if (res.data?.data?.accessToken) {
      setAccessToken(res.data.data.accessToken);
    }
    return res.data;
  },
  refresh: async () => {
    const res = await apiClient.post('/auth/refresh');
    if (res.data?.data?.accessToken) {
      setAccessToken(res.data.data.accessToken);
    }
    return res.data;
  },
  logout: async () => {
    const res = await apiClient.post('/auth/logout');
    setAccessToken(null);
    return res.data;
  },
  forgotPassword: async (data: { email: string }) => {
    const res = await apiClient.post('/auth/forgot-password', data);
    return res.data;
  },
  resetPassword: async (data: { email: string; otp: string; newPassword: string }) => {
    const res = await apiClient.post('/auth/reset-password', data);
    return res.data;
  },
  getMe: async (): Promise<User> => {
    const res = await apiClient.get('/auth/me');
    return res.data.data;
  },
};
