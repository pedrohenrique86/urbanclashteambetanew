import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUserProfileContext } from '../contexts/UserProfileContext';
import { LoadingSpinner } from './ui/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiresFaction?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiresFaction = false }) => {
  const { user, isHydrating: isAuthHydrating } = useAuth();
  const { userProfile, loading: isProfileLoading } = useUserProfileContext();
  const location = useLocation();

  // ESTADO DE CARREGAMENTO UNIFICADO
  // Exibe o spinner enquanto a autenticação está sendo validada (isAuthHydrating)
  // ou enquanto o perfil do usuário está sendo carregado (isProfileLoading), mas APENAS se já houver um usuário.
  if (isAuthHydrating || (user && isProfileLoading)) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // DECISÃO 1: NÃO AUTENTICADO
  // Se o carregamento terminou e não há usuário, redireciona para a home/login.
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // DECISÃO 2: REQUER FACÇÃO, MAS NÃO TEM
  // Se a rota exige facção e o perfil carregado não tem uma, redireciona para a seleção.
  // Isso cobre tanto o caso de perfil nulo quanto o de perfil sem facção.
  if (requiresFaction && !userProfile?.faction) {
    // Exceção: não redirecionar se já estivermos na página de seleção.
    if (location.pathname !== '/faction-selection') {
      return <Navigate to="/faction-selection" state={{ from: location }} replace />;
    }
  }
  
  // DECISÃO 3: JÁ TEM FACÇÃO, MAS TENTA ACESSAR A SELEÇÃO
  if (userProfile?.faction && location.pathname === '/faction-selection') {
    return <Navigate to="/dashboard" replace />;
  }

  // DECISÃO 4: BLOQUEIO DE STATUS (Route Guard Global)
  // Whitelist de páginas acessíveis mesmo com restrição
  const whitelist = [
    '/dashboard',
    '/digital-identity',
    '/social-zone',
    '/clan',
    '/vip-access',
    '/season',
    '/ranking',
    '/reckoning'
  ];

  const status = userProfile?.status || 'Operacional';
  
  // Whitelist contextual: Libera apenas a página relacionada ao status restrito
  if (status === 'Isolamento') whitelist.push('/isolation');
  if (status === 'Recondicionamento') whitelist.push('/recovery-base');
  if (status === 'Aprimoramento') whitelist.push('/training');

  const isWhitelisted = whitelist.some(p => location.pathname === p || location.pathname.startsWith(p + '/'));

  if (status !== 'Operacional' && !isWhitelisted) {
    if (import.meta.env.DEV) {
      console.warn(`[RouteGuard] Acesso negado: ${location.pathname} bloqueado para status: ${status}`);
    }
    
    // Se for Aprimoramento, redireciona para a página de treino
    if (status === 'Aprimoramento') {
      return <Navigate to="/training" state={{ from: location, statusBlock: true }} replace />;
    }

    return <Navigate to="/dashboard" state={{ from: location, statusBlock: true }} replace />;
  }

  // Se todas as verificações passaram, renderiza o conteúdo da rota.
  return <>{children}</>;
};

export default ProtectedRoute;