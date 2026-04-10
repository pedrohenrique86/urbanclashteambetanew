import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isHydrating } = useAuth();
  const location = useLocation();

  // MUDANÇA CRÍTICA: Se o sistema está hidratando, não decidimos nada.
  // Renderizamos um estado neutro (Loading) para evitar o redirecionamento falso.
  if (isHydrating) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    // Redireciona para home/login, mas preserva a URL que o usuário tentou acessar
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
