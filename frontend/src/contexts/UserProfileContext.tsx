import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiClient } from "../lib/supabaseClient";
import { UserProfile } from "../types";
import { calculateLevel } from "../utils/leveling";

interface UserProfileContextType {
  userProfile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  handleLogout: () => Promise<void>;
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export const UserProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const processExistingProfile = useCallback(async (profileData: any, user: any) => {
    const levelInfo = calculateLevel(profileData.current_xp || 0);
    const actionPoints = profileData.action_points;

    return {
      id: profileData.id ? profileData.id.toString() : profileData.user_id,
      user_id: profileData.user_id,
      email: user.email,
      is_admin: profileData.is_admin,
      faction: profileData.faction,
      clan_id: profileData.clan_id,
      username: (profileData.username || "Usuário").substring(0, 10),
      created_at: profileData.created_at,
      current_xp: profileData.current_xp,
      level: Number(profileData.level ?? levelInfo.level),
      xp_required: Number(profileData.xp_required ?? levelInfo.xpForNextLevel),
      resources: profileData.money,
      money: profileData.money,
      wins: profileData.victories,
      losses: profileData.defeats,
      victories: profileData.victories,
      defeats: profileData.defeats,
      streak: profileData.winning_streak,
      winning_streak: profileData.winning_streak,
      critical_damage: profileData.critical_damage,
      action_points: actionPoints,
      attack: profileData.attack,
      defense: profileData.defense,
      focus: profileData.focus,
      energy: profileData.energy,
      max_energy: profileData.max_energy,
      intimidation: profileData.intimidation,
      discipline: profileData.discipline,
    };
  }, []);

  const fetchProfile = useCallback(async (shouldRedirect: boolean = false) => {
    if (!apiClient.getToken()) {
      setLoading(false);
      return;
    }

    try {
      const userResponse = await apiClient.getCurrentUser();
      if (!userResponse.data.user) {
        if (shouldRedirect) navigate("/");
        setLoading(false);
        return;
      }

      const user = userResponse.data.user;
      const profileData = await apiClient.getUserProfile();

      if (profileData) {
        const processedProfile = await processExistingProfile(profileData, user);
        setUserProfile(processedProfile);
      }

      // Lógica de Redirecionamento (apenas se solicitado)
      if (shouldRedirect) {
        const currentPath = window.location.pathname;
        if (profileData?.faction && profileData.clan_id) {
          if (currentPath === "/faction-selection" || currentPath === "/clan-selection") {
            navigate("/dashboard");
          }
        } else if (profileData?.faction) {
          if (currentPath !== "/clan-selection") navigate("/clan-selection");
        } else {
          if (currentPath !== "/faction-selection") navigate("/faction-selection");
        }
      }
    } catch (error) {
      console.error("Erro ao carregar perfil global:", error);
    } finally {
      setLoading(false);
    }
  }, [navigate, processExistingProfile]);

  const refreshProfile = async () => {
    setLoading(true);
    await fetchProfile(false);
  };

  const handleLogout = async () => {
    await apiClient.logout();
    setUserProfile(null);
    navigate("/");
  };

  // Carregamento inicial automático
  useEffect(() => {
    fetchProfile(false);
  }, [fetchProfile]);

  return (
    <UserProfileContext.Provider value={{ userProfile, loading, refreshProfile, handleLogout, setUserProfile }}>
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfileContext = () => {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error("useUserProfileContext deve ser usado dentro de um UserProfileProvider");
  }
  return context;
};
