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
  const [timedOut, setTimedOut] = React.useState(false);
  // SÊNIOR: Mecanismo de Safe-Exit para evitar loops infinitos de loading (ex: Backend fora do ar)
  // Se o estado demorar mais de 10s para sincronizar, permitimos o render para evitar o "travamento"
  React.useEffect(() => {
    const isSyncing = isAuthHydrating || (user && isProfileLoading);
    if (isSyncing) {
      const timer = setTimeout(() => {
        if (import.meta.env.DEV) {
          console.warn("[ProtectedRoute] ⚠️ Sincronização interrompida por timeout. Verifique o Backend.");
        }
        setTimedOut(true);
      }, 10000); // 10 segundos de paciência
      return () => clearTimeout(timer);
    } else {
      setTimedOut(false);
    }
  }, [isAuthHydrating, isProfileLoading, user]);

  // SÊNIOR: Lógica de Boot Otimista
  // Se temos um usuário (mesmo que vindo do cache), permitimos o render imediato.
  const isHydratingAndNoUser = isAuthHydrating && !user;

  // ESTADO DE CARREGAMENTO (Apenas se não houver NADA para mostrar E não deu timeout)
  if (!timedOut && (isHydratingAndNoUser || (user && isProfileLoading && !userProfile))) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#050505] relative overflow-hidden">
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

  // DECISÃO 1: NÃO AUTENTICADO
  // Se o carregamento terminou (ou desistiu) e realmente não há usuário, redireciona.
  if (!isAuthHydrating && !user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // DECISÃO 2: REQUER FACÇÃO, MAS NÃO TEM
  // SÊNIOR: Só redirecionamos se o carregamento TERMINOU com sucesso, não estamos em timeout,
  // e realmente não há facção. Se houver timeout ou erro, mantemos o usuário onde ele está
  // para evitar que oscilações no 4G o joguem para a tela de seleção injustamente.
  const isSyncing = isAuthHydrating || isProfileLoading || (timedOut && !userProfile);
  
  if (requiresFaction && !isSyncing && !isError && !userProfile?.faction) {
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