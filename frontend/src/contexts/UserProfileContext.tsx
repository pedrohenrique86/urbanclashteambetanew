import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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

  const processProfileData = useCallback((profileData: any, user: any): UserProfile => {
    const levelInfo = calculateLevel(profileData.current_xp || 0);
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
      action_points: profileData.action_points,
      attack: profileData.attack,
      defense: profileData.defense,
      focus: profileData.focus,
      energy: profileData.energy,
      max_energy: profileData.max_energy,
      intimidation: profileData.intimidation,
      discipline: profileData.discipline,
    };
  }, []);

  const fetchProfile = useCallback(async () => {
    if (!apiClient.getToken()) {
      setLoading(false);
      return;
    }

    try {
      const userResponse = await apiClient.getCurrentUser();
      if (!userResponse?.data?.user) {
        setLoading(false);
        return;
      }

      const user = userResponse.data.user;
      const profileData = await apiClient.getUserProfile();

      if (profileData) {
        setUserProfile(processProfileData(profileData, user));
      } else {
        // Usuário autenticado mas sem perfil de jogo ainda (novo usuário Google)
        setUserProfile(null);
      }
    } catch (error) {
      console.error("Erro ao carregar perfil global:", error);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  }, [processProfileData]);

  const refreshProfile = useCallback(async () => {
    setLoading(true);
    await fetchProfile();
  }, [fetchProfile]);

  const handleLogout = async () => {
    await apiClient.logout();
    setUserProfile(null);
    navigate("/");
  };

  // Carregamento inicial do perfil (apenas uma vez)
  useEffect(() => {
    fetchProfile();
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
