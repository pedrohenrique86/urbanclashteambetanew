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
  const { userProfile, loading: isProfileLoading, isError } = useUserProfileContext();
  const location = useLocation();

  // ESTADO DE CARREGAMENTO UNIFICADO
  if (isAuthHydrating || (user && isProfileLoading)) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900/50 backdrop-blur-sm">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // SÊNIOR: Removido aviso de Sincronização Interrompida a pedido do usuário.
  // O sistema agora tenta renderizar mesmo com erro na API para evitar bloqueios no 4G.
  
  // DECISÃO 1: NÃO AUTENTICADO
  // Se o carregamento terminou e não há usuário, redireciona para a home/login.
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // DECISÃO 2: REQUER FACÇÃO, MAS NÃO TEM
  // Se a rota exige facção e o perfil carregado não tem uma, redireciona para a seleção.
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
  // Whitelist de páginas acessíveis indepedente do status (Menu, Perfil, etc)
  const globalWhitelist = [
    '/dashboard',
    '/digital-identity',
    '/social-zone',
    '/clan',
    '/vip-access',
    '/season',
    '/ranking',
    '/profile',
    '/reckoning'
  ];

  const status = userProfile?.status || 'Operacional';
  
  // Whitelist contextual: Libera apenas a página relacionada ao status restrito
  const authorizedPages = [...globalWhitelist];
  if (status === 'Isolamento') authorizedPages.push('/isolation');
  if (status === 'Recondicionamento') authorizedPages.push('/recovery-base');
  if (status === 'Aprimoramento') authorizedPages.push('/training');

  const isAuthorized = authorizedPages.some(p => location.pathname === p || location.pathname.startsWith(p + '/'));

  if (status !== 'Operacional' && status !== 'Ruptura' && !isAuthorized) {
    if (import.meta.env.DEV) {
      console.warn(`[RouteGuard] Acesso negado: ${location.pathname} bloqueado para status: ${status}`);
    }
    
    // Redirecionamento forçado baseado no status
    if (status === 'Recondicionamento') return <Navigate to="/recovery-base" replace />;
    if (status === 'Aprimoramento') return <Navigate to="/training" replace />;
    if (status === 'Isolamento') return <Navigate to="/isolation" replace />;

    return <Navigate to="/dashboard" state={{ from: location, statusBlock: true }} replace />;
  }

  // Se todas as verificações passaram, renderiza o conteúdo da rota.
  return <>{children}</>;
};

export default ProtectedRoute;