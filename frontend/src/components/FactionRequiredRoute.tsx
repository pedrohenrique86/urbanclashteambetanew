import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useUserProfileContext } from '../contexts/UserProfileContext';

interface FactionRequiredRouteProps {
  children: React.ReactNode;
}

const FactionRequiredRoute: React.FC<FactionRequiredRouteProps> = ({ children }) => {
  const { userProfile } = useUserProfileContext();
  const location = useLocation();

  // Assumimos que o ProtectedRoute já garantiu que userProfile não é nulo.
  // Esta é uma verificação adicional.
  if (userProfile && !userProfile.faction) {
    // Se o perfil existe, mas não tem facção, redireciona para a seleção.
    return <Navigate to="/faction-selection" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default FactionRequiredRoute;