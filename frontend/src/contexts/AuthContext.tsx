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
      const token = tokenStorage.getToken();
      
      if (!token) {
        setIsHydrating(false);
        return;
      }

      try {
        // Valida o token persistido com o backend
        const { data } = await api.get('/auth/me');
        setUser(data.user);
      } catch (error: any) {
        if (error.response && error.response.status === 401) {
          console.error("Sessão expirada ou inválida");
          tokenStorage.clearToken();
          localStorage.removeItem('cached_user');
          setUser(null);
        } else {
          console.error("Erro de rede ao validar sessão, mantendo estado provisório.");
          const cached = localStorage.getItem('cached_user');
          if (cached) {
            setUser(JSON.parse(cached));
          }
        }
      } finally {
        setIsHydrating(false);
      }
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
    } finally {
      tokenStorage.clearToken();
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
