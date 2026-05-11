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

// Interceptor com Lógica de Retry (Recuperação de 4G) e Refresh Token
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config } = error;
    
    // SÊNIOR: Lógica de Refresh Token para erro 401 (Não autorizado/Expirado)
    // Não tentamos refresh se a própria rota for /auth/refresh para evitar loop infinito
    if (error.response?.status === 401 && !config._retry && !config.url?.includes('/auth/refresh')) {
      config._retry = true; // Marca para evitar loop infinito
      
      try {
        const refreshToken = tokenStorage.getRefreshToken();
        if (refreshToken) {
          if (import.meta.env.DEV) console.debug("[API] 🕒 Access Token expirado. Tentando renovar...");
          
          // Tenta renovar o token chamando o endpoint de refresh usando a própria instância api
          // Isso garante que a baseURL e outras configurações sejam herdadas corretamente
          const response = await api.post('/auth/refresh', { refreshToken });
          const { token: newToken, refreshToken: newRefreshToken } = response.data;
          
          if (newToken) {
            tokenStorage.setToken(newToken, newRefreshToken);
            
            // Atualiza o header da requisição original e tenta de novo
            config.headers.Authorization = `Bearer ${newToken}`;
            return api(config);
          }
        }
      } catch (refreshError: any) {
        if (import.meta.env.DEV) {
          console.error("[API] ❌ Falha crítica ao renovar token:", refreshError.response?.data || refreshError.message);
        }
        // Se falhou o refresh, limpamos tudo e deslogamos
      }
      
      tokenStorage.clearToken();
      window.dispatchEvent(new CustomEvent('auth:401'));
      return Promise.reject(error);
    }

    // Se não houver config ou o retryCount de rede estiver esgotado, rejeita
    if (!config || (config._retryCount || 0) >= 3) {
      return Promise.reject(error);
    }

    config._retryCount = config._retryCount || 0;

    // SÊNIOR: Diagnóstico de Emergência para 4G
    const shouldRetry = !error.response || error.response.status === 502 || error.response.status === 503 || error.response.status === 504;

    if (!error.response && config._retryCount >= 3) {
      const msg = `🚨 ERRO DE CONEXÃO (4G/Wi-Fi):\n\nURL: ${config.url}\nERRO: ${error.message}`;
      console.error(msg);
    }

    if (shouldRetry) {
      config._retryCount += 1;
      if (import.meta.env.DEV) console.warn(`🔄 4G instável detectado. Tentativa de recuperação ${config._retryCount}/3...`);
      // Delay exponencial antes de tentar de novo
      await new Promise(resolve => setTimeout(resolve, config._retryCount * 1000));
      return api(config);
    }

    return Promise.reject(error);
  }
);

export default api;
