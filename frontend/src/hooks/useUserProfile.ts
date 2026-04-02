import { useUserProfileContext } from "../contexts/UserProfileContext";
import { useEffect } from "react";

export const useUserProfile = (shouldRedirect: boolean = true) => {
  const { userProfile, loading, refreshProfile, handleLogout, setUserProfile } = useUserProfileContext();

  useEffect(() => {
    // A lógica de redirecionamento agora é opcionalmente disparada pelo hook
    // se o componente que o invoca assim desejar.
    if (shouldRedirect && !loading && userProfile) {
      const currentPath = window.location.pathname;
      
      if (userProfile.faction && userProfile.clan_id) {
        if (currentPath === "/faction-selection" || currentPath === "/clan-selection") {
          // Já está configurado, não precisa estar nessas telas
           window.history.pushState({}, "", "/dashboard");
        }
      }
    }
  }, [shouldRedirect, loading, userProfile]);

  return { 
    userProfile, 
    loading, 
    setUserProfile, 
    handleLogout,
    refreshProfile // Adicionado para compatibilidade
  };
};

export const invalidateUserProfile = () => {
  // Esta função agora pode ser apenas um export vazio ou mapear para um refresh global
  // Mas para manter compatibilidade, vamos deixar como lembrete ou remover se não usado.
  console.warn("invalidateUserProfile legado chamado. Use refreshProfile do hook.");
};
