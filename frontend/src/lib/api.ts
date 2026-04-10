import axios from 'axios';

const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) return '/api';
  if (envUrl.endsWith('/api') || envUrl.endsWith('/api/')) {
    return envUrl;
  }
  return envUrl.endsWith('/') ? `${envUrl}api` : `${envUrl}/api`;
};

// Instância centralizada do Axios
const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper para gerenciar o token no localStorage para persistência real
export const tokenStorage = {
  getToken: () => localStorage.getItem('auth_token') || localStorage.getItem('token'),
  setToken: (token: string) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  },
  clearToken: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
  },
};

// Interceptor para injetar token em cada requisição
api.interceptors.request.use((config) => {
  const token = tokenStorage.getToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para tratar 401/403 e evitar loops
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      tokenStorage.clearToken();
      window.dispatchEvent(new CustomEvent('auth:401'));
      // Não redirecionamos aqui para evitar loops; o AuthContext reagirá à perda do user
    }
    return Promise.reject(error);
  }
);

export default api;
