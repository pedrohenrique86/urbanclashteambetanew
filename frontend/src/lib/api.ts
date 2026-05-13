import axios from 'axios';

const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) return '/api';
  if (envUrl.endsWith('/api') || envUrl.endsWith('/api/')) {
    return envUrl;
  }
  return envUrl.endsWith('/') ? `${envUrl}api` : `${envUrl}/api`;
};

// Instância centralizada do Axios com Blindagem Mobile
const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 15000, // 15 segundos de timeout para aguentar latência do 4G
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper para gerenciar o token no localStorage para persistência real
export const tokenStorage = {
  getToken: () => localStorage.getItem('auth_token') || localStorage.getItem('token'),
  getRefreshToken: () => localStorage.getItem('refreshToken'),
  setToken: (token: string, refreshToken?: string) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('token', token);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  },
  clearToken: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    delete api.defaults.headers.common['Authorization'];
  },
};

// Interceptor para injetar token em cada requisição
api.interceptors.request.use((config) => {
  const token = tokenStorage.getToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // SÊNIOR: Adiciona timestamp para evitar cache agressivo de operadoras mobile
  config.params = { ...config.params, _t: Date.now() };
  return config;
});

// SÊNIOR: Fila de processamento para evitar múltiplas chamadas de Refresh simultâneas
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Interceptor com Lógica de Retry (Recuperação de 4G) e Refresh Token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config } = error;
    
    // 1. Lógica de Refresh Token para erro 401 (Não autorizado/Expirado)
    if (error.response?.status === 401 && !config._retry && !config.url?.includes('/auth/refresh')) {
      
      if (isRefreshing) {
        // Se já estamos renovando, colocamos esta requisição na fila
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            config.headers.Authorization = `Bearer ${token}`;
            return api(config);
          })
          .catch((err) => Promise.reject(err));
      }

      config._retry = true; 
      isRefreshing = true;
      
      try {
        const refreshToken = tokenStorage.getRefreshToken();
        if (refreshToken) {
          if (import.meta.env.DEV) console.debug("[API] 🕒 Access Token expirado. Iniciando renovação atômica...");
          
          const response = await api.post('/auth/refresh', { refreshToken });
          const { token: newToken, refreshToken: newRefreshToken } = response.data;
          
          if (newToken) {
            tokenStorage.setToken(newToken, newRefreshToken);
            processQueue(null, newToken);
            isRefreshing = false;
            
            config.headers.Authorization = `Bearer ${newToken}`;
            return api(config);
          }
        }
      } catch (refreshError: any) {
        if (import.meta.env.DEV) {
          console.error("[API] ❌ Falha crítica ao renovar token:", refreshError.response?.data || refreshError.message);
        }
        processQueue(refreshError, null);
        isRefreshing = false;
        
        tokenStorage.clearToken();
        window.dispatchEvent(new CustomEvent('auth:401'));
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }

      // Se chegamos aqui sem refresh token ou falha silenciosa, limpa e rejeita
      tokenStorage.clearToken();
      window.dispatchEvent(new CustomEvent('auth:401'));
      return Promise.reject(error);
    }

    // 2. Lógica de Retry para Erros de Rede (4G/Offline)
    if (!config || (config._retryCount || 0) >= 3) {
      return Promise.reject(error);
    }

    config._retryCount = config._retryCount || 0;
    const shouldRetry = !error.response || error.response.status === 502 || error.response.status === 503 || error.response.status === 504;

    if (shouldRetry) {
      config._retryCount += 1;
      if (import.meta.env.DEV) console.warn(`🔄 4G instável detectado (${config.url}). Tentativa ${config._retryCount}/3...`);
      await new Promise(resolve => setTimeout(resolve, config._retryCount * 1000));
      return api(config);
    }

    return Promise.reject(error);
  }
);

export default api;
