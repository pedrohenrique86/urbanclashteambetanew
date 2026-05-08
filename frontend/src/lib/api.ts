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
  // SÊNIOR: Adiciona timestamp para evitar cache agressivo de operadoras mobile
  config.params = { ...config.params, _t: Date.now() };
  return config;
});

// Interceptor com Lógica de Retry (Recuperação de 4G)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config } = error;
    
    // Se não houver config ou o retry estiver desabilitado, rejeita
    if (!config || config._retryCount >= 3) {
      if (error.response?.status === 401) {
        tokenStorage.clearToken();
        window.dispatchEvent(new CustomEvent('auth:401'));
      }
      return Promise.reject(error);
    }

    config._retryCount = config._retryCount || 0;

    // SÊNIOR: Diagnóstico de Emergência para 4G
    const shouldRetry = !error.response || error.response.status === 502 || error.response.status === 503 || error.response.status === 504;

    if (!error.response && config._retryCount >= 3) {
      // Se após 3 tentativas de rede ainda falhar, mostra o erro real pro usuário
      const msg = `🚨 ERRO DE CONEXÃO (4G/Wi-Fi):\n\nURL: ${config.url}\nERRO: ${error.message}\n\nSe você está no 4G, o Cloudflare ou sua Operadora estão bloqueando o acesso.`;
      console.error(msg);
      alert(msg); // Ativado para debug no celular
    }

    if (shouldRetry) {
      config._retryCount += 1;
      console.warn(`🔄 4G instável detectado. Tentativa de recuperação ${config._retryCount}/3...`);
      // Delay exponencial antes de tentar de novo
      await new Promise(resolve => setTimeout(resolve, config._retryCount * 1000));
      return api(config);
    }

    return Promise.reject(error);
  }
);

export default api;
