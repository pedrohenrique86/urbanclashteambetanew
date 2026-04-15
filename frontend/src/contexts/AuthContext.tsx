import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { tokenStorage } from '../lib/api';

interface AuthContextType {
  user: any | null;
  isHydrating: boolean;
  isLoggingIn: boolean;
  login: (token: string, userData?: any) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [isHydrating, setIsHydrating] = useState(true); // Estado de boot crítico
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const handle401 = () => {
      setUser(null);
      tokenStorage.clearToken();
      localStorage.removeItem('cached_user');
    };
    window.addEventListener('auth:401', handle401 as EventListener);
    return () => window.removeEventListener('auth:401', handle401 as EventListener);
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('cached_user', JSON.stringify(user));
    }
  }, [user]);

  useEffect(() => {
    const initAuth = async () => {
      setIsHydrating(true);
      const token = tokenStorage.getToken();
      const cachedUser = localStorage.getItem('cached_user');

      if (cachedUser) {
        setUser(JSON.parse(cachedUser));
      }

      if (token) {
        try {
          // Valida o token e atualiza os dados do usuário em background
          const { data } = await api.get('/auth/me');
          setUser(data.user); // Atualiza com dados frescos
        } catch (error: any) {
          if (error.response && error.response.status === 401) {
            // Token é inválido ou expirado, limpar tudo.
            console.error("Sessão inválida. Realizando logout forçado.");
            tokenStorage.clearToken();
            localStorage.removeItem('cached_user');
            setUser(null);
          } else {
            // Erro de rede ou outro problema. O usuário continua logado com dados do cache.
            // A sessão será revalidada na próxima interação com a API.
            console.warn("Erro de rede ao validar sessão. Mantendo estado otimista.", error.message);
          }
        }
      } else {
        // Se não há token, garantimos que não há usuário.
        setUser(null);
        localStorage.removeItem('cached_user');
      }

      setIsHydrating(false);
    };

    initAuth();
  }, []);

  const login = async (token: string, userData?: any) => {
    tokenStorage.setToken(token);
    
    if (userData) {
      setUser(userData);
    } else {
      setIsLoggingIn(true);
      try {
        const { data } = await api.get('/auth/me');
        setUser(data.user);
      } catch (error) {
        console.error("Erro ao buscar dados do usuário após login:", error);
      } finally {
        setIsLoggingIn(false);
      }
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err: any) {
      // Se a sessão já estava morta (401), não é um erro real para o usuário que apenas quer sair
      if (err.response?.status === 401) {
        if (import.meta.env.DEV) {
          console.debug("[AuthContext] Sessão já havia expirado no servidor. Logout finalizado de qualquer forma.");
        }
      } else {
        // Erros graves (500) ou de rede
        console.error("[AuthContext] Falha externa ao tentar destruir sessão no backend:", err.message);
      }
    } finally {
      // Limpeza local é a prioridade para a experiência do usuário.
      tokenStorage.clearToken();
      localStorage.removeItem('cached_user');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isHydrating, isLoggingIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};