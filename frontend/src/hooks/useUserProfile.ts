import { useUserProfileContext } from "../contexts/UserProfileContext";

/**
 * Hook para acessar o perfil do usuário globalmente.
 * O redirecionamento agora é gerenciado centralmente pelo UserProfileProvider.
 */
export const useUserProfile = () => {
  const { userProfile, loading, refreshProfile, handleLogout, setUserProfile } = useUserProfileContext();

  return { 
    userProfile, 
    loading, 
    setUserProfile, 
    handleLogout,
    refreshProfile
  };
};

export const invalidateUserProfile = () => {
  console.warn("invalidateUserProfile legado chamado. Use refreshProfile do hook.");
};
