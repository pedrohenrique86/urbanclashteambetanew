import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/supabaseClient';
import { UserProfile } from '../types';
import { calculateLevel } from '../utils/leveling';

// Função global para invalidar cache do perfil
let invalidateProfileCache: (() => void) | null = null;

export const invalidateUserProfile = () => {
  if (invalidateProfileCache) {
    invalidateProfileCache();
  }
};

export const useUserProfile = (shouldRedirect: boolean = true) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const navigate = useNavigate();
  
  // Registrar função de invalidação
  useEffect(() => {
    invalidateProfileCache = () => {
      setUserProfile(null);
      setLoading(true);
      setRefreshTrigger(prev => prev + 1);
    };
    
    return () => {
      invalidateProfileCache = null;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    const checkUserAndFaction = async () => {
      // Se não deve redirecionar, não verifica autenticação
      if (!shouldRedirect) {
        if (isMounted) setLoading(false);
        return;
      }
      
      try {
        const userResponse = await apiClient.getCurrentUser();
        
        if (!userResponse.data.user) {
          if (isMounted && shouldRedirect) navigate('/');
          if (isMounted) setLoading(false);
          return;
        }
        
        const user = userResponse.data.user;
        const profileData = await apiClient.getUserProfile();
        
        if (isMounted) {
          const currentPath = window.location.pathname;

          if (profileData?.faction) {
            // Usuário tem facção, verificar o clã
            if (profileData.clan_id) {
              // Usuário totalmente configurado
              const processedProfile = await processExistingProfile(
                profileData,
                user,
              );
              setUserProfile(processedProfile);
              // Se estiver em uma página de configuração, redirecione para o dashboard
              if (
                currentPath === "/faction-selection" ||
                currentPath === "/clan-selection"
              ) {
                navigate("/dashboard");
              }
            } else {
              // Usuário tem facção, mas não tem clã
              const processedProfile = await processExistingProfile(
                profileData,
                user,
              );
              setUserProfile(processedProfile);
              if (shouldRedirect && currentPath !== "/clan-selection") {
                navigate("/clan-selection");
              }
            }
          } else if (user.user_metadata?.faction) {
            // Fluxo de novo usuário com facção nos metadados
            const newProfile = await createNewProfile(user);
            if (newProfile) {
              setUserProfile(newProfile);
              // Após a criação do perfil, o usuário provavelmente precisará escolher um clã
              if (shouldRedirect && currentPath !== "/clan-selection") {
                navigate("/clan-selection");
              }
            } else {
              // Falha na criação do perfil, redirecionar para seleção de facção
              if (shouldRedirect && currentPath !== "/faction-selection") {
                navigate("/faction-selection");
              }
            }
          } else {
            // Usuário não tem facção, precisa escolher uma
            if (shouldRedirect && currentPath !== "/faction-selection") {
              navigate("/faction-selection");
            }
          }
        }
      } catch (error) {
        // Error handling silently
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    checkUserAndFaction();
    
    return () => {
      isMounted = false;
    };
  }, [navigate, shouldRedirect, refreshTrigger]);

  const processExistingProfile = async (profileData: any, user: any) => {
    // Usar sempre o nível vindo do banco; não sobrescrever automaticamente
    // Calcular informações de XP apenas para exibição local quando necessário
    const levelInfo = calculateLevel(profileData.current_xp || 0);
    
    // Usar os pontos de ação diretamente do banco de dados sem resetar
    const actionPoints = profileData.action_points;
    
    const userProfileData = {
      id: profileData.id ? profileData.id.toString() : profileData.user_id,
      user_id: profileData.user_id,
      email: user.email, // Adiciona o email do usuário de autenticação
      is_admin: profileData.is_admin, // Adiciona a flag de administrador
      faction: profileData.faction,
      clan_id: profileData.clan_id,
      username: profileData.username || 'Usuário', // username vem da tabela users via API
      created_at: profileData.created_at,
      current_xp: profileData.current_xp,
      level: Number(profileData.level ?? levelInfo.level),
      xp_required: Number(profileData.xp_required ?? levelInfo.xpForNextLevel),
      resources: profileData.money,
      money: profileData.money, // Adicionar campo money diretamente
      wins: profileData.victories,
      losses: profileData.defeats,
      victories: profileData.victories, // Adicionar campo victories diretamente
      defeats: profileData.defeats, // Adicionar campo defeats diretamente
      streak: profileData.winning_streak,
      winning_streak: profileData.winning_streak, // Adicionar campo winning_streak diretamente
      critical_damage: profileData.critical_damage, // Adicionar campo critical_damage
      action_points: actionPoints,
      attack: profileData.attack,
      defense: profileData.defense,
      focus: profileData.focus,
      energy: profileData.energy,
      max_energy: profileData.max_energy,
      intimidation: profileData.intimidation,
      discipline: profileData.discipline
    };
    
    return userProfileData;
  };

  const createNewProfile = async (user: any) => {
    const newProfile = {
      user_id: user.id,
      faction: user.user_metadata.faction
      // Removido username - vem da tabela users, não precisa ser enviado
      // Removido todos os atributos - deixar o backend calcular os valores corretos
    };
    
    try {
      const profileData = await apiClient.createUserProfile(newProfile);
        
      if (!profileData) {
        return null;
      }
      
      const levelInfo = calculateLevel(profileData.current_xp || 0);
      
      const userProfileData = {
        id: profileData.id ? profileData.id.toString() : profileData.user_id,
        user_id: profileData.user_id,
        email: user.email, // Adiciona o email do usuário de autenticação
        is_admin: profileData.is_admin, // Adiciona a flag de administrador
        faction: profileData.faction,
        clan_id: profileData.clan_id,
        username: profileData.username || 'Usuário', // username vem da tabela users via API
        created_at: profileData.created_at,
        current_xp: profileData.current_xp,
        level: levelInfo.level,
        resources: profileData.money,
        money: profileData.money, // Adicionar campo money diretamente
        wins: profileData.victories,
        losses: profileData.defeats,
        victories: profileData.victories, // Adicionar campo victories diretamente
        defeats: profileData.defeats, // Adicionar campo defeats diretamente
        streak: profileData.victory_streak,
        winning_streak: profileData.winning_streak, // Adicionar campo winning_streak diretamente
        critical_damage: profileData.critical_damage, // Adicionar campo critical_damage
        action_points: profileData.action_points,
        attack: profileData.attack,
        defense: profileData.defense,
        focus: profileData.focus,
        energy: profileData.energy,
        max_energy: profileData.max_energy,
        intimidation: profileData.intimidation,
        discipline: profileData.discipline
      };
      
      return userProfileData;
    } catch (error) {
      return null;
    }
  };

  return { userProfile, loading, setUserProfile };
};