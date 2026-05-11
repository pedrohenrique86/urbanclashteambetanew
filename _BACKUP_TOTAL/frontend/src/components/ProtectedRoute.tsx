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
  const [timedOut, setTimedOut] = React.useState(false);

  // SÊNIOR: Mecanismo de Safe-Exit para evitar loops infinitos de loading
  // Se o estado demorar mais de 8s para sincronizar, permitimos o render para evitar o "travamento"
  React.useEffect(() => {
    if (isAuthHydrating || (user && isProfileLoading)) {
      const timer = setTimeout(() => {
        console.warn("[ProtectedRoute] ⚠️ Sincronização de estado demorou demais. Forçando renderização de segurança.");
        setTimedOut(true);
      }, 8000);
      return () => clearTimeout(timer);
    } else {
      setTimedOut(false);
    }
  }, [isAuthHydrating, isProfileLoading, user]);

  // ESTADO DE CARREGAMENTO UNIFICADO (Com Blindagem Anti-Loop)
  if (!timedOut && (isAuthHydrating || (user && isProfileLoading))) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#050505] relative overflow-hidden">
        {/* Background Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-orange-500/5 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="relative flex flex-col items-center gap-6">
          <LoadingSpinner size="lg" />
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black font-orbitron text-orange-500 tracking-[0.4em] uppercase animate-pulse">
              Sincronizando Identidade
            </span>
            <div className="w-32 h-[1px] bg-gradient-to-r from-transparent via-orange-500/30 to-transparent mt-2" />
          </div>
        </div>
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