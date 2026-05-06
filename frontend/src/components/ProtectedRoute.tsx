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

  // SÊNIOR: Prevenção de Loop de Redirecionamento em caso de erro de Banco/API
  if (isError && !userProfile) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-black p-6 text-center">
        <div className="w-16 h-16 border-2 border-red-500/20 rounded-full flex items-center justify-center mb-6">
           <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        </div>
        <h1 className="text-xl font-orbitron text-red-500 mb-2 uppercase tracking-widest">Sincronização Interrompida</h1>
        <p className="text-zinc-400 font-exo max-w-md text-sm leading-relaxed">
          Ocorreu uma falha na conexão com a central de dados. Seus dados estão seguros, mas não puderam ser validados agora.
        </p>
        
        <div className="flex flex-col gap-3 mt-8 w-full max-w-xs">
          <button 
            onClick={() => window.location.reload()}
            className="w-full px-8 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-[11px] font-black font-orbitron uppercase tracking-[0.2em] transition-all text-red-500"
          >
            Tentar Reconectar
          </button>
          
          <button 
            onClick={() => {
              localStorage.clear();
              window.location.href = '/';
            }}
            className="w-full px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[10px] font-bold font-orbitron uppercase tracking-[0.2em] transition-all text-zinc-500"
          >
            Sair da Conta (Limpar Cache)
          </button>
        </div>

        <p className="mt-12 text-[9px] text-zinc-700 font-mono uppercase tracking-widest">
          Status: {isError ? 'API_FAILURE' : 'SYNC_LOST'} | User: {user?.id?.substring(0,8) || 'NONE'}
        </p>
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